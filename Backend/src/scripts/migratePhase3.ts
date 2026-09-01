import * as dotenv from 'dotenv';
dotenv.config();

import { pool } from '../config/database';

async function migrate() {
  console.log('🚀 Running Phase 3 Database Migration...');
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Created refresh_tokens table successfully.');
    
    // Check if table creation succeeded
    const [tables]: any = await pool.execute('SHOW TABLES LIKE "refresh_tokens"');
    if (tables.length > 0) {
      console.log('✅ refresh_tokens table confirmed in database.');
    }

  } catch (error) {
    console.error('❌ Migration Error:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
