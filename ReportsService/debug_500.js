const mysql = require('mysql2/promise');
require('dotenv').config();

// Create pool manually since we can't import TS file easily in node
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'eduflow_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testQuery() {
    try {
        const courseId = 2; // Assuming course ID 2 triggers the error based on screenshot

        console.log('Testing query for courseId:', courseId);

        const [students] = await pool.execute(
            `SELECT 
                u.id, 
                u.name, 
                u.student_id, 
                u.avatar,
                (SELECT count(*) FROM attendance_records ar 
                 JOIN attendance a ON ar.attendance_id = a.id 
                 WHERE a.course_id = ? AND ar.student_id = u.id AND ar.status = 'present') as attended_count,
                (SELECT count(DISTINCT session_id) FROM attendance WHERE course_id = ?) as total_lectures
             FROM enrollments e
             JOIN users u ON e.student_id = u.id
             WHERE e.course_id = ? AND e.status = 'active'`,
            [courseId, courseId, courseId]
        );

        console.log('Success:', students);
    } catch (error) {
        console.error('SQL Error:', error);
    } finally {
        process.exit();
    }
}

testQuery();
