import request from 'supertest';
import { app, pool } from '../setup';
import bcrypt from 'bcryptjs';

describe('Authentication Security Tests', () => {
  const testUser = {
    id: 'SEC_AUTH_TEST',
    identifier: 'sec_auth@example.com',
    password: 'Password123!',
    role: 'student'
  };

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testUser.password, 10);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [testUser.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [testUser.id]);
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, student_id, is_active) 
       VALUES (?, 'Sec Auth', ?, ?, ?, ?, 1)`,
      [testUser.id, testUser.identifier, passwordHash, testUser.role, testUser.id]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [testUser.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [testUser.id]);
  });

  test('Should block missing or badly formatted login payloads (Validation Hardening)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: testUser.identifier }); // missing password

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const res2 = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '', password: testUser.password }); // empty identifier

    expect(res2.status).toBe(400);
    expect(res2.body.success).toBe(false);
  });

  test('Should block brute force attacks via Rate Limiting', async () => {
    // We send 15 incorrect logins rapidly. The rate limiter (usually 10 or less) should kick in.
    let blocked = false;
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: testUser.identifier, password: 'wrongpassword' });
      
      if (res.status === 429) {
        blocked = true;
        break;
      }
    }
    
    expect(blocked).toBe(true);
  });
});
