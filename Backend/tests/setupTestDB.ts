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
    await connection.query('ALTER TABLE assignments ADD COLUMN file_name VARCHAR(255);');
  } catch (e) {
    // ignore if already exist
  }

  console.log('✅ Test database set up successfully.');
  await connection.end();
}

setupTestDB().catch((err) => {
  console.error('❌ Failed to set up test DB:', err);
  process.exit(1);
});
