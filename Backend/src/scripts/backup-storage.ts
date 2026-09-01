import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import * as tar from 'tar';

// ============================================================================
// Config
// ============================================================================
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY; // Optional

// ============================================================================
// Paths
// ============================================================================
const UPLOADS_DIR  = path.resolve(__dirname, '../../uploads');
const BACKUP_DIR   = path.resolve(__dirname, '../../backups/storage');

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
    throw new Error('[STORAGE-BACKUP] BACKUP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).');
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

// ============================================================================
// Symlink Guard — prevent traversal abuse
// ============================================================================
function assertNoSymlink(filePath: string): void {
  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`[STORAGE-BACKUP] Symlink detected in uploads — aborting for safety: ${filePath}`);
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }
}

// ============================================================================
// Main Backup Routine
// ============================================================================
async function runStorageBackup(): Promise<void> {
  const timestamp = getTimestamp();
  const tarFile   = path.join(BACKUP_DIR, `storage-${timestamp}.tar.gz`);
  const finalFile = ENCRYPTION_KEY ? `${tarFile}.enc` : tarFile;

  console.log(`[STORAGE-BACKUP] 🔄 Starting uploads backup: ${path.basename(finalFile)}`);

  // Guard: ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.warn(`[STORAGE-BACKUP] ⚠️  Uploads directory not found: ${UPLOADS_DIR}. Skipping.`);
    return;
  }

  // Guard: check for symlinks at top level
  assertNoSymlink(UPLOADS_DIR);

  // Step 1 — create tar.gz archive
  await tar.create(
    {
      gzip: true,
      file: tarFile,
      cwd: path.dirname(UPLOADS_DIR),
      follow: false, // Never follow symlinks
    },
    [path.basename(UPLOADS_DIR)]
  );

  fs.chmodSync(tarFile, 0o600);
  console.log(`[STORAGE-BACKUP] ✅ Archive created: ${path.basename(tarFile)}`);

  // Step 2 — optional AES-256-GCM encryption
  if (ENCRYPTION_KEY) {
    const archiveData = fs.readFileSync(tarFile);
    const encrypted = encryptBuffer(archiveData, ENCRYPTION_KEY);
    fs.writeFileSync(finalFile, encrypted, { mode: 0o600 });
    fs.unlinkSync(tarFile); // Remove unencrypted archive
    console.log(`[STORAGE-BACKUP] 🔐 Encrypted: ${path.basename(finalFile)}`);
  }

  // Step 3 — verify output
  const stat = fs.statSync(finalFile);
  if (stat.size === 0) {
    throw new Error('[STORAGE-BACKUP] ❌ Output archive is empty. Backup failed!');
  }

  console.log(`[STORAGE-BACKUP] ✅ Storage backup complete → ${path.basename(finalFile)} (${(stat.size / 1024).toFixed(1)} KB)`);
}

runStorageBackup().catch((err) => {
  console.error('[STORAGE-BACKUP] ❌ Failed:', err.message);
  process.exit(1);
});
