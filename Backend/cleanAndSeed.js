const mysql = require('mysql2/promise');
require('dotenv').config(); 
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function cleanAndSeed() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '12345678',
      database: process.env.DB_NAME || 'eduflow_db'
    });

    console.log('Connected to database. Starting cleanup...');

    // 1. Delete all non-admin data
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE attendance_records');
    await connection.query('TRUNCATE TABLE attendance_sessions');
    await connection.query('TRUNCATE TABLE assignment_submissions');
    await connection.query('TRUNCATE TABLE assignments');
    await connection.query('TRUNCATE TABLE lectures');
    await connection.query('TRUNCATE TABLE enrollments');
    await connection.query('TRUNCATE TABLE courses');
    await connection.query('TRUNCATE TABLE users'); // Users table holds students and teachers
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Cleanup complete. Starting seeding...');

    // 2. Create Dummy Teacher
    const teacherId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash('password123', 10);
    await connection.query(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'teacher')`,
      [teacherId, 'د. أحمد التجريبي', 'teacher@test.com', hashedPassword]
    );

    // 3. Create Dummy Students
    const student1Id = crypto.randomUUID();
    const student2Id = crypto.randomUUID();
    await connection.query(
      `INSERT INTO users (id, name, email, password_hash, role, student_id, department) VALUES (?, ?, ?, ?, 'student', ?, ?)`,
      [student1Id, 'طالب تجريبي أول', 'student1@test.com', hashedPassword, 'STU-001', 'علوم الحاسوب']
    );
    await connection.query(
      `INSERT INTO users (id, name, email, password_hash, role, student_id, department) VALUES (?, ?, ?, ?, 'student', ?, ?)`,
      [student2Id, 'طالب تجريبي ثاني', 'student2@test.com', hashedPassword, 'STU-002', 'هندسة برمجيات']
    );

    // 4. Create Dummy Course
    const courseId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO courses (id, code, name, description, teacher_id) VALUES (?, ?, ?, ?, ?)`,
      [courseId, 'TEST-101', 'مادة تجريبية', 'هذه مادة تجريبية لاختبار المنظومة', teacherId]
    );

    // 5. Enroll Students in Course
    await connection.query(
      `INSERT INTO enrollments (course_id, student_id, status) VALUES (?, ?, 'active')`,
      [courseId, student1Id]
    );
    await connection.query(
      `INSERT INTO enrollments (course_id, student_id, status) VALUES (?, ?, 'active')`,
      [courseId, student2Id]
    );

    console.log('Seeding complete!');
    console.log('--- Test Accounts ---');
    console.log('Teacher: teacher@test.com / password123');
    console.log('Student 1: student1@test.com / password123');
    console.log('Student 2: student2@test.com / password123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

cleanAndSeed();
