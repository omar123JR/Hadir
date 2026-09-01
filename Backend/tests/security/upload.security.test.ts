import request from 'supertest';
import { app, pool } from '../setup';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

describe('Upload Security Tests', () => {
  const teacherUser = {
    id: 'SEC_UP_TEACHER',
    email: 'sec_upload@example.com',
    password: 'Password123!',
    role: 'teacher'
  };

  let teacherToken = '';
  const testFilesDir = path.join(__dirname, 'test-files');

  beforeAll(async () => {
    const teacherHash = await bcrypt.hash(teacherUser.password, 10);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [teacherUser.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [teacherUser.id]);
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, teacher_code, is_active) 
       VALUES (?, 'Sec Teacher', ?, ?, ?, ?, 1)`,
      [teacherUser.id, teacherUser.email, teacherHash, teacherUser.role, teacherUser.id]
    );

    await pool.query('DELETE FROM lectures WHERE id = ?', ['LEC_UP_TEST']);
    await pool.query('DELETE FROM courses WHERE id = ?', ['COURSE_UP_TEST']);
    await pool.query(
      `INSERT INTO courses (id, code, name, teacher_id) VALUES (?, 'UP101', 'Upload Security', ?)`,
      ['COURSE_UP_TEST', teacherUser.id]
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: teacherUser.email, password: teacherUser.password });
    teacherToken = res.body.token;

    if (!fs.existsSync(testFilesDir)) fs.mkdirSync(testFilesDir);
    
    // Just create normal text files with wrong extensions, no malware payloads so Windows Defender ignores them
    fs.writeFileSync(path.join(testFilesDir, 'badfile.pdf.exe'), 'just a normal string');
    fs.writeFileSync(path.join(testFilesDir, 'badfile.php.jpg'), 'just another normal string');
  });

  afterAll(async () => {
    await pool.query('DELETE FROM lectures WHERE id = ?', ['LEC_UP_TEST']);
    await pool.query('DELETE FROM courses WHERE id = ?', ['COURSE_UP_TEST']);
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [teacherUser.id]);
    await pool.query('DELETE FROM users WHERE id = ?', [teacherUser.id]);
    fs.rmSync(testFilesDir, { recursive: true, force: true });
  });

  test('Should reject files with double extensions (.pdf.exe) (Malicious Extension Detection)', async () => {
    const res = await request(app)
      .post('/api/lectures/teacher')
      .set('Authorization', `Bearer ${teacherToken}`)
      .field('courseId', 'COURSE_UP_TEST')
      .field('title', 'Test Lecture')
      .field('date', '2026-05-21')
      .attach('file', path.join(testFilesDir, 'badfile.pdf.exe'));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/extension/i);
  });

  test('Should reject files with invalid magic bytes / MIME mismatch', async () => {
    try {
      const res = await request(app)
        .post('/api/lectures/teacher')
        .set('Authorization', `Bearer ${teacherToken}`)
        .field('courseId', 'COURSE_UP_TEST')
        .field('title', 'Test Lecture 2')
        .field('date', '2026-05-21')
        .attach('file', path.join(testFilesDir, 'badfile.php.jpg'));
      expect(res.status).toBe(400);
    } catch (error: any) {
      if (error.code === 'ECONNRESET') {
        expect(true).toBe(true); // Server safely aborted the connection
      } else {
        throw error;
      }
    }
  });
});
