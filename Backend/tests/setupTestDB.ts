import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupTestDB() {
  console.log('Starting Test DB Setup...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345678',
    multipleStatements: true
  });

  const dbName = 'eduflow_security_test';
  
  console.log(`Dropping and recreating ${dbName}...`);
  await connection.query(`DROP DATABASE IF EXISTS ${dbName};`);
  await connection.query(`CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await connection.query(`USE ${dbName};`);

  console.log('Applying init_schema.sql...');
  const initSqlPath = path.join(__dirname, '../src/scripts/init_schema.sql');
  let initSql = fs.readFileSync(initSqlPath, 'utf8');
  initSql = initSql.replace(/eduflow_db/g, dbName);
  
  await connection.query(initSql);

  console.log('Applying Phase 3 Migrations...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      family_id VARCHAR(100) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      is_revoked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45),
      user_agent VARCHAR(255),
      INDEX idx_refresh_user (user_id),
      INDEX idx_refresh_token (token_hash),
      INDEX idx_refresh_family (family_id)
    );
  `);
  
  console.log('Applying Alter scripts...');
  try {
    await connection.query('ALTER TABLE assignments ADD COLUMN file_url VARCHAR(255);');
  } catch (e) {}
  try {
    await connection.query('ALTER TABLE assignments ADD COLUMN file_name VARCHAR(255);');
  } catch (e) {}
  try {
    await connection.query('ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 1;');
  } catch (e) {}
  try {
    await connection.query('ALTER TABLE users ADD COLUMN is_frozen TINYINT(1) DEFAULT 0;');
  } catch (e) {}
  try {
    await connection.query('ALTER TABLE users ADD COLUMN freeze_reason VARCHAR(255) NULL;');
  } catch (e) {}
  try {
    await connection.query('ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(64) NULL;');
  } catch (e) {}
  try {
    await connection.query('ALTER TABLE users ADD COLUMN two_factor_enabled TINYINT(1) DEFAULT 0;');
  } catch (e) {}
  try {
    await connection.query('ALTER TABLE admin_accounts ADD COLUMN token_version INT NOT NULL DEFAULT 1;');
  } catch (e) {}
  try {
    await connection.query('ALTER TABLE courses ADD COLUMN schedule_day VARCHAR(100) NULL, ADD COLUMN schedule_time VARCHAR(100) NULL, ADD COLUMN room VARCHAR(100) NULL;');
  } catch (e) {}

  console.log('Applying Grade and Financial tables...');
  await connection.query(`
    CREATE TABLE IF NOT EXISTS course_grade_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      course_id VARCHAR(36) NOT NULL,
      item_name VARCHAR(150) NOT NULL,
      category ENUM('quiz','midterm','assignment','practical','final','attendance','project') NOT NULL DEFAULT 'assignment',
      max_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
      weight_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS student_grades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grade_item_id INT NOT NULL,
      student_id VARCHAR(36) NOT NULL,
      score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      feedback TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_item_student (grade_item_id, student_id)
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS student_financials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id VARCHAR(36) NOT NULL UNIQUE,
      student_name VARCHAR(255) NOT NULL,
      student_number VARCHAR(50),
      total_tuition DECIMAL(10,2) DEFAULT 3500.00,
      paid_amount DECIMAL(10,2) DEFAULT 0.00,
      discount DECIMAL(10,2) DEFAULT 0.00,
      status ENUM('paid','partial','unpaid') DEFAULT 'unpaid',
      is_frozen BOOLEAN DEFAULT FALSE,
      freeze_reason VARCHAR(255),
      last_payment_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id VARCHAR(36) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      transaction_type ENUM('payment','discount','fee','refund') NOT NULL,
      receipt_number VARCHAR(100) UNIQUE,
      payment_method VARCHAR(50) DEFAULT 'cash',
      notes TEXT,
      created_by VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Test database set up successfully.');
  await connection.end();
}

setupTestDB().catch((err) => {
  console.error('❌ Failed to set up test DB:', err);
  process.exit(1);
});
