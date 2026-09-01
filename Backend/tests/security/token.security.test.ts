import request from 'supertest';
import { app, pool } from '../setup';
import bcrypt from 'bcryptjs';

describe('Token & JWT Security Tests', () => {
  const victimUser = {
    id: 'SEC_TOKEN_TEST',
    email: 'sec_token@example.com',
    password: 'Password123!',
    role: 'student'
  };

  let validRefreshToken = '';
  let validAccessToken = '';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(victimUser.password, 10);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [victimUser.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [victimUser.id]);
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, student_id, is_active) 
       VALUES (?, 'Sec Token', ?, ?, ?, ?, 1)`,
      [victimUser.id, victimUser.email, passwordHash, victimUser.role, victimUser.id]
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: victimUser.email, password: victimUser.password });
    
    validAccessToken = res.body.token;
    validRefreshToken = res.body.refreshToken;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [victimUser.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [victimUser.id]);
  });

  test('Should reject tampered JWT signatures', async () => {
    // Tamper the token by modifying a few characters at the end (the signature)
    const tamperedToken = validAccessToken.substring(0, validAccessToken.length - 5) + 'abcde';
    
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('Should revoke the entire token family upon Refresh Token Replay Attack', async () => {
    // 1. Refresh successfully once (consumes the token)
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: validRefreshToken });
    
    expect(refreshRes.status).toBe(200);
    const newRefreshToken = refreshRes.body.refreshToken;

    // 2. Attempt to refresh AGAIN with the old consumed token (Replay Attack)
    const replayRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: validRefreshToken });
    
    // Should be denied
    expect(replayRes.status).toBe(401);
    expect(replayRes.body.message).toMatch(/compromised|invalid/i);

    // 3. The new token should now be REVOKED because the family was compromised
    const newRefreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: newRefreshToken });
    
    expect(newRefreshRes.status).toBe(401);
  });
});
