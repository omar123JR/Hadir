const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDb() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '12345678',
      database: process.env.DB_NAME || 'eduflow_db'
    });

    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables:', tables);

    const [lectures] = await connection.query('DESCRIBE lectures');
    console.log('Lectures Schema:', lectures);
    
    const [courses] = await connection.query('DESCRIBE courses');
    console.log('Courses Schema:', courses);

    const [enrollments] = await connection.query('DESCRIBE enrollments');
    console.log('Enrollments Schema:', enrollments);

    await connection.end();
  } catch (err) {
    console.error(err);
  }
}

checkDb();
