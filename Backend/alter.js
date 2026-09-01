const mysql = require('mysql2/promise');
require('dotenv').config();

async function alterDb() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '12345678',
      database: process.env.DB_NAME || 'eduflow_db'
    });

    try {
      await connection.query('ALTER TABLE assignments ADD COLUMN file_url VARCHAR(255);');
      console.log('Added file_url to assignments');
    } catch (e) {
      console.log(e.message);
    }

    try {
      await connection.query('ALTER TABLE assignments ADD COLUMN file_name VARCHAR(255);');
      console.log('Added file_name to assignments');
    } catch (e) {
      console.log(e.message);
    }

    console.log('Done!');
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}

alterDb();
