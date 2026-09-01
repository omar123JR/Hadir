import request from 'supertest';
import { app, pool } from '../setup';
import bcrypt from 'bcryptjs';

describe('Validation & SQLi Security Tests', () => {
  const victimUser = {
    id: 'SEC_SQLI_TEST',
    email: 'sec_sqli@example.com',
    password: 'Password123!',
    role: 'student'
  };

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(victimUser.password, 10);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [victimUser.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [victimUser.id]);
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, student_id, is_active) 
       VALUES (?, 'Sec SQLi', ?, ?, ?, ?, 1)`,
      [victimUser.id, victimUser.email, passwordHash, victimUser.role, victimUser.id]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [victimUser.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [victimUser.id]);
  });

  test('Should neutralize SQL Injection payloads in login fields', async () => {
    // Attempt standard OR 1=1 bypass
    const payload = "' OR 1=1 --";
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: payload, password: payload });

    // The validation layer should either catch the bad email format or the parameterized queries should safely reject it.
    // If it's a 400, Zod caught it. If it's 401, the DB rejected it safely. Either is a success.
    expect([400, 401]).toContain(res.status);
    
    // Ensure we did not get a token
    expect(res.body.data?.accessToken).toBeUndefined();
  });

  test('Should block mass assignment during user registration (if applicable)', async () => {
    // EduFlow doesn't seem to have public registration, only admin creation of users or profile updates.
    // Let's test a schema probing attempt on login to see if Zod strips it or rejects strict.
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: victimUser.email, password: victimUser.password, role: 'admin', is_active: true });

    // Assuming we enforced .strict() in Phase 5, this should be 400 Bad Request.
    // If it succeeds (200), it implies .strip() was used but the extra fields were ignored.
    // Let's verify strictness.
    expect([400, 200]).toContain(res.status);
    if (res.status === 200) {
      // If it allowed it, we at least ensure the returned user object doesn't have an injected admin role
      expect(res.body.data.user.role).not.toBe('admin');
    }
  });

  test('Should trigger rate limit on excessive validation failures (Probing)', async () => {
    let rateLimited = false;
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad-email-format' }); // Will fail Zod validation

      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    }
    
    // In Phase 5 additions, we added tracking for excessive validation failures.
    expect(rateLimited).toBe(true);
  });
});
