import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Retention Policy
// ============================================================================
const DAILY_RETENTION_DAYS  = 14;
const WEEKLY_RETENTION_WEEKS = 8;

const MS_PER_DAY  = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

const BACKUP_DIRS = [
  path.resolve(__dirname, '../../backups/db'),
  path.resolve(__dirname, '../../backups/storage'),
];

// ============================================================================
// Helpers
// ============================================================================
interface BackupFile {
  name: string;
  fullPath: string;
  mtime: number;
  ageDays: number;
}

function getBackupFiles(dir: string): BackupFile[] {
  if (!fs.existsSync(dir)) return [];
  const now = Date.now();
  return fs.readdirSync(dir)
    .filter(f => !f.startsWith('.'))
    .map(f => {
      const fullPath = path.join(dir, f);
      const mtime = fs.statSync(fullPath).mtimeMs;
      return { name: f, fullPath, mtime, ageDays: (now - mtime) / MS_PER_DAY };
    })
    .sort((a, b) => b.mtime - a.mtime); // newest first
}

function isWeeklyBackup(file: BackupFile, allFiles: BackupFile[]): boolean {
  // A backup qualifies as the "weekly" representative if it is the oldest backup
  // in its ISO week number that we still want to keep.
  const weekMs = Math.floor(file.mtime / MS_PER_WEEK);
  const newerSameWeek = allFiles.filter(
    f => f.mtime > file.mtime && Math.floor(f.mtime / MS_PER_WEEK) === weekMs
  );
  return newerSameWeek.length === 0; // This is the newest backup of its week → keep as weekly rep
}

// ============================================================================
// Cleanup Logic
// ============================================================================
function cleanupDirectory(dir: string): void {
  const files = getBackupFiles(dir);
  if (files.length === 0) {
    console.log(`[CLEANUP] No backups in ${dir}`);
    return;
  }

  // Safety: NEVER delete the newest backup
  const newestFile = files[0];
  console.log(`[CLEANUP] 🛡️  Protecting newest backup: ${newestFile.name}`);

  let deleted = 0;

  for (const file of files) {
    // Always protect the newest
    if (file.fullPath === newestFile.fullPath) continue;

    const withinDailyWindow  = file.ageDays <= DAILY_RETENTION_DAYS;
    const withinWeeklyWindow = file.ageDays <= WEEKLY_RETENTION_WEEKS * 7;
    const isWeekly           = isWeeklyBackup(file, files);

    if (withinDailyWindow) {
      // Within 14 days → keep all daily backups
      console.log(`[CLEANUP] 📅 Keeping daily: ${file.name} (${file.ageDays.toFixed(1)} days old)`);
      continue;
    }

    if (withinWeeklyWindow && isWeekly) {
      // Between 14 days and 8 weeks → keep one-per-week representative
      console.log(`[CLEANUP] 📅 Keeping weekly: ${file.name} (${file.ageDays.toFixed(1)} days old)`);
      continue;
    }

    // Older than 8 weeks → delete
    try {
      fs.unlinkSync(file.fullPath);
      console.log(`[CLEANUP] 🗑️  Deleted expired backup: ${file.name} (${file.ageDays.toFixed(1)} days old)`);
      deleted++;
    } catch (err: any) {
      console.error(`[CLEANUP] ❌ Failed to delete ${file.name}: ${err.message}`);
    }
  }

  if (deleted === 0) {
    console.log(`[CLEANUP] ✅ No expired backups found in ${path.basename(dir)}.`);
  } else {
    console.log(`[CLEANUP] ✅ Removed ${deleted} expired backup(s) from ${path.basename(dir)}.`);
  }
}

// ============================================================================
// Main
// ============================================================================
function runCleanup(): void {
  console.log('\n[CLEANUP] ====== Backup Retention Cleanup ======');
  console.log(`[CLEANUP] Policy: Keep daily for ${DAILY_RETENTION_DAYS} days, weekly for ${WEEKLY_RETENTION_WEEKS} weeks.\n`);

  for (const dir of BACKUP_DIRS) {
    console.log(`[CLEANUP] 📁 Processing: ${dir}`);
    cleanupDirectory(dir);
    console.log();
  }

  console.log('[CLEANUP] ====== Cleanup complete ======\n');
}

runCleanup();
