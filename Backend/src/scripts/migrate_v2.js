const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function migrateV2() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345678',
    database: process.env.DB_NAME || 'eduflow_db',
  });

  console.log('Connected to eduflow_db for V2 Migration...');

  // 1. Helper to add column if missing
  async function addCol(table, colName, colDef) {
    const [rows] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [process.env.DB_NAME || 'eduflow_db', table, colName]
    );
    if (rows.length === 0) {
      console.log(`Adding ${colName} to ${table}...`);
      await connection.query(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`);
    } else {
      console.log(`Column ${colName} already exists in ${table}.`);
    }
  }

  // 2. Add columns to users
  await addCol('users', 'is_frozen', 'BOOLEAN DEFAULT FALSE');
  await addCol('users', 'freeze_reason', 'VARCHAR(255) NULL');
  await addCol('users', 'two_factor_secret', 'VARCHAR(64) NULL');
  await addCol('users', 'two_factor_enabled', 'BOOLEAN DEFAULT FALSE');

  // 3. Create student_financials table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS student_financials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id VARCHAR(36) NOT NULL UNIQUE,
      student_name VARCHAR(255) NOT NULL,
      student_number VARCHAR(50) NULL,
      total_tuition DECIMAL(10,2) DEFAULT 3500.00,
      paid_amount DECIMAL(10,2) DEFAULT 0.00,
      discount DECIMAL(10,2) DEFAULT 0.00,
      status ENUM('paid', 'partial', 'unpaid') DEFAULT 'unpaid',
      is_frozen BOOLEAN DEFAULT FALSE,
      freeze_reason VARCHAR(255) NULL,
      last_payment_date DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_financial_student (student_id),
      INDEX idx_financial_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('student_financials table verified.');

  // 4. Create financial_transactions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id VARCHAR(36) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      receipt_number VARCHAR(100) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'نقدي',
      notes TEXT NULL,
      created_by VARCHAR(36) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_trans_student (student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('financial_transactions table verified.');

  // 5. Populate student_financials for existing students
  const [students] = await connection.query(`SELECT id, name, email, student_id FROM users WHERE role = 'student'`);
  for (const s of students) {
    const [existing] = await connection.query(`SELECT id FROM student_financials WHERE student_id = ?`, [s.id]);
    if (existing.length === 0) {
      // Default: total 3500, paid 1500 for demo
      await connection.query(
        `INSERT INTO student_financials (student_id, student_name, student_number, total_tuition, paid_amount, status)
         VALUES (?, ?, ?, 3500.00, 1500.00, 'partial')`,
        [s.id, s.name, s.student_id || '2026001']
      );
      console.log(`Initialized financial record for student ${s.name}`);
    }
  }

  // 6. Create login_audit_logs table for 2FA / session tracking
  await connection.query(`
    CREATE TABLE IF NOT EXISTS login_audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      ip_address VARCHAR(45) NULL,
      user_agent VARCHAR(255) NULL,
      status ENUM('success', 'failed_password', 'failed_2fa', 'blocked') NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('login_audit_logs table verified.');

  await connection.end();
  console.log('Migration V2 completed successfully!');
}

migrateV2().catch(err => {
  console.error('Migration V2 failed:', err);
  process.exit(1);
});
