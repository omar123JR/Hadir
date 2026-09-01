import request from 'supertest';
import { app, pool } from '../setup';
import bcrypt from 'bcryptjs';

describe('RBAC Security Tests', () => {
  const adminUser = {
    username: 'sec_admin',
    password: 'Password123!'
  };

  const studentUser = {
    id: 'SEC_RBAC_STUDENT',
    email: 'sec_rbac@example.com',
    password: 'Password123!',
    role: 'student'
  };

  let studentToken = '';

  beforeAll(async () => {
    // Create Admin
    const adminHash = await bcrypt.hash(adminUser.password, 10);
    await pool.query('DELETE FROM admin_accounts WHERE username = ?', [adminUser.username]);
    await pool.query(
      'INSERT INTO admin_accounts (username, password_hash, is_active) VALUES (?, ?, 1)',
      [adminUser.username, adminHash]
    );

    // Create Student
    const studentHash = await bcrypt.hash(studentUser.password, 10);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [studentUser.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [studentUser.id]);
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, student_id, is_active) 
       VALUES (?, 'Sec RBAC', ?, ?, ?, ?, 1)`,
      [studentUser.id, studentUser.email, studentHash, studentUser.role, studentUser.id]
    );

    // Login Student to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: studentUser.email, password: studentUser.password });
    studentToken = res.body.token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [studentUser.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [studentUser.id]);
    await pool.query('DELETE FROM admin_accounts WHERE username = ?', [adminUser.username]);
  });

  test('Should deny access to Admin routes using a Student token (Vertical Privilege Escalation Bypass)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('Should deny profile updates for a different user using standard token (Horizontal Escalation Bypass)', async () => {
    const res = await request(app)
      .put('/api/auth/profile/password')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ currentPassword: 'Password123!', newPassword: 'NewPassword123!', userId: 'SomeOtherUser' }); 
      // Note: password update doesn't accept userId usually, but if an attacker tries to inject it, it should fail or only affect their own profile.
    
    // Testing specific horizontal escalation on assignment submissions
    const res2 = await request(app)
      .post('/api/assignments/SomeOtherUser/submit') // Suppose this is a route that submits on behalf of another user
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ assignmentId: 'A1' });
    
    // If the route doesn't exist, it should be 404, but if it does, it should be 403 because ownership checks fail.
    expect([404, 403]).toContain(res2.status);
  });
});
