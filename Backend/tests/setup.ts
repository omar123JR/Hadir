import dotenv from 'dotenv';
import path from 'path';

// Load .env but override DB_NAME immediately
dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.DB_NAME = 'eduflow_security_test';
process.env.NODE_ENV = 'test';

import app from '../src/server';
import { pool } from '../src/config/database';

export { app, pool };

afterAll(async () => {
  await pool.end();
});
