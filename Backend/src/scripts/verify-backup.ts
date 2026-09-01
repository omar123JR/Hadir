import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';

// ============================================================================
// Config
// ============================================================================
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY; // Optional

// ============================================================================
// Paths
// ============================================================================
const DB_BACKUP_DIR      = path.resolve(__dirname, '../../backups/db');
const STORAGE_BACKUP_DIR = path.resolve(__dirname, '../../backups/storage');

// ============================================================================
// AES-256-GCM Decryption (for verification only)
// ============================================================================
function decryptBuffer(data: Buffer, keyHex: string): Buffer {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('[VERIFY] BACKUP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).');
  }
  const iv      = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const cipherText = data.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv as any);
  decipher.setAuthTag(authTag as any);
  return Buffer.concat([decipher.update(cipherText as any), decipher.final()]);
}

// ============================================================================
// Verification helpers
// ============================================================================
function verifyGzip(data: Buffer, label: string): void {
  try {
    const decompressed = zlib.gunzipSync(data);
    if (decompressed.length === 0) throw new Error('Decompressed data is empty.');
    console.log(`[VERIFY] ✅ ${label}: gzip integrity OK (${(decompressed.length / 1024).toFixed(1)} KB decompressed)`);
    // For SQL dumps: check for basic dump header
    const header = decompressed.slice(0, 512).toString('utf8');
    if (label.includes('.sql')) {
      if (!header.includes('MySQL dump') && !header.includes('CREATE TABLE') && !header.includes('INSERT INTO')) {
        throw new Error('SQL dump does not appear to be a valid MySQL dump.');
      }
      console.log(`[VERIFY] ✅ ${label}: SQL dump structure is valid.`);
    }
  } catch (err: any) {
    throw new Error(`[VERIFY] ❌ ${label}: gzip verification failed — ${err.message}`);
  }
}

// ============================================================================
// Verify a single backup file
// ============================================================================
function verifyFile(filePath: string): boolean {
  const filename = path.basename(filePath);
  const stat = fs.statSync(filePath);

  if (stat.size === 0) {
    console.error(`[VERIFY] ❌ ${filename}: File is empty.`);
    return false;
  }

  console.log(`[VERIFY] 🔍 Checking: ${filename} (${(stat.size / 1024).toFixed(1)} KB)`);

  let data: Buffer = fs.readFileSync(filePath);

  // Encrypted archive?
  if (filePath.endsWith('.enc')) {
    if (!ENCRYPTION_KEY) {
      console.warn(`[VERIFY] ⚠️  ${filename}: Encrypted backup found but BACKUP_ENCRYPTION_KEY is not set. Skipping decryption check.`);
      return true;
    }
    try {
      data = decryptBuffer(data, ENCRYPTION_KEY);
      console.log(`[VERIFY] 🔓 ${filename}: Decryption successful.`);
    } catch (err: any) {
      console.error(`[VERIFY] ❌ ${filename}: Decryption failed — ${err.message}`);
      return false;
    }
  }

  // .gz or .tar.gz → verify gzip integrity
  if (filePath.replace('.enc', '').endsWith('.gz')) {
    try {
      const label = filename.includes('sql') ? filename + '.sql' : filename;
      verifyGzip(data, label);
    } catch (err: any) {
      console.error(err.message);
      return false;
    }
  }

  return true;
}

// ============================================================================
// Find most recent backup in a directory
// ============================================================================
function getMostRecentFile(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? path.join(dir, files[0].name) : null;
}

// ============================================================================
// Main
// ============================================================================
async function runVerification(): Promise<void> {
  let allPassed = true;

  console.log('\n[VERIFY] ====== Backup Verification Report ======\n');

  // Check most recent DB backup
  const latestDb = getMostRecentFile(DB_BACKUP_DIR);
  if (!latestDb) {
    console.warn('[VERIFY] ⚠️  No DB backups found in', DB_BACKUP_DIR);
  } else {
    const ok = verifyFile(latestDb);
    if (!ok) allPassed = false;
  }

  // Check most recent storage backup
  const latestStorage = getMostRecentFile(STORAGE_BACKUP_DIR);
  if (!latestStorage) {
    console.warn('[VERIFY] ⚠️  No storage backups found in', STORAGE_BACKUP_DIR);
  } else {
    const ok = verifyFile(latestStorage);
    if (!ok) allPassed = false;
  }

  console.log('\n[VERIFY] ============================');
  if (allPassed) {
    console.log('[VERIFY] ✅ All backups passed verification.');
  } else {
    console.error('[VERIFY] ❌ One or more backups failed verification.');
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('[VERIFY] ❌ Verification crashed:', err.message);
  process.exit(1);
});
