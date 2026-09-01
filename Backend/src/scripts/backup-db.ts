import * as dotenv from 'dotenv';
dotenv.config();

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';

// ============================================================================
// Config — read from env, never from hardcoded values
// ============================================================================
const DB_HOST     = process.env.DB_HOST     ?? 'localhost';
const DB_PORT     = process.env.DB_PORT     ?? '3306';
const DB_USER     = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME     = process.env.DB_NAME;
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY; // Optional, 32-byte hex

if (!DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error('[BACKUP] ❌ Missing required DB credentials in environment. Aborting.');
  process.exit(1);
}

// ============================================================================
// Paths
// ============================================================================
const BACKUP_DIR = path.resolve(__dirname, '../../backups/db');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ============================================================================
// Timestamp
// ============================================================================
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

// ============================================================================
// AES-256-GCM Encryption
// ============================================================================
function encryptBuffer(data: Buffer, keyHex: string): Buffer {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('[BACKUP] BACKUP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).');
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Output format: [iv (16 bytes)] + [authTag (16 bytes)] + [ciphertext]
  return Buffer.concat([iv, authTag, encrypted]);
}

// ============================================================================
// Main Backup Routine
// ============================================================================
async function runBackup(): Promise<void> {
  const timestamp = getTimestamp();
  const sqlFile   = path.join(BACKUP_DIR, `eduflow-${timestamp}.sql`);
  const gzFile    = `${sqlFile}.gz`;
  const finalFile = ENCRYPTION_KEY ? `${gzFile}.enc` : gzFile;

  console.log(`[BACKUP] 🔄 Starting database backup: ${path.basename(finalFile)}`);

  // Step 1 — mysqldump
  // Credentials passed via env to avoid shell history leakage
  const env = { ...process.env, MYSQL_PWD: DB_PASSWORD };
  const dumpCmd = [
    'mysqldump',
    `--host=${DB_HOST}`,
    `--port=${DB_PORT}`,
    `--user=${DB_USER}`,
    '--single-transaction',   // Consistent snapshot without locking
    '--routines',
    '--triggers',
    '--add-drop-table',
    DB_NAME!,
  ].join(' ');

  execSync(`${dumpCmd} > "${sqlFile}"`, { env, stdio: ['pipe', 'pipe', 'pipe'] });
  console.log(`[BACKUP] ✅ Dump complete: ${path.basename(sqlFile)}`);

  // Step 2 — gzip compression
  const sqlData = fs.readFileSync(sqlFile);
  const compressed = zlib.gzipSync(sqlData, { level: 9 });
  fs.writeFileSync(gzFile, compressed, { mode: 0o600 });
  fs.unlinkSync(sqlFile); // Remove uncompressed dump
  console.log(`[BACKUP] ✅ Compressed: ${path.basename(gzFile)}`);

  // Step 3 — optional AES-256-GCM encryption
  if (ENCRYPTION_KEY) {
    const encrypted = encryptBuffer(compressed, ENCRYPTION_KEY);
    fs.writeFileSync(finalFile, encrypted, { mode: 0o600 });
    fs.unlinkSync(gzFile); // Remove unencrypted compressed file
    console.log(`[BACKUP] 🔐 Encrypted: ${path.basename(finalFile)}`);
  }

  // Step 4 — verify output exists and has content
  const stat = fs.statSync(finalFile);
  if (stat.size === 0) {
    throw new Error('[BACKUP] ❌ Output backup file is empty. Backup failed!');
  }

  console.log(`[BACKUP] ✅ Backup complete → ${path.basename(finalFile)} (${(stat.size / 1024).toFixed(1)} KB)`);
}

runBackup().catch((err) => {
  console.error('[BACKUP] ❌ Backup failed:', err.message);
  process.exit(1);
});
