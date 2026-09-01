import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Log Directory — Backend/logs/  (created alongside src/)
// ---------------------------------------------------------------------------
const LOG_DIR = path.resolve(__dirname, '../../logs');

// Ensure the log directory exists on first import
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export type LogCategory =
  | 'AUTH'       // login, logout, token lifecycle
  | 'ADMIN'      // admin CRUD operations
  | 'UPLOAD'     // file upload accept/reject, file downloads
  | 'ACCESS'     // 403 ownership/RBAC failures
  | 'SECURITY'   // replay attacks, brute force, CORS block, validation rate
  | 'HTTP'       // general request/response access log
  | 'SYSTEM';    // startup, shutdown, uncaught errors (Phase 11)

export type Outcome = 'SUCCESS' | 'FAILURE' | 'BLOCKED';

export interface AuditEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  actor: {
    userId: string | null;
    role: string | null;
  };
  ip: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  outcome: Outcome;
  detail?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the daily-rotated log file path.
 * Format: logs/audit-2026-05-21.log
 */
function getLogFilePath(): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `audit-${today}.log`);
}

/**
 * Appends a single JSON line to the daily log file.
 * Uses appendFileSync to prevent write interleaving in concurrent requests.
 */
function writeEntry(entry: AuditEntry): void {
  try {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(getLogFilePath(), line, 'utf8');
  } catch (err) {
    // Never let logging errors crash the application.
    // Fall back to stderr so the event is at least visible in the process log.
    process.stderr.write(`[AUDIT LOGGER ERROR] Failed to write log entry: ${err}\n`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Core log function. All category-specific loggers delegate to this.
 */
export function log(
  level: LogLevel,
  category: LogCategory,
  action: string,
  outcome: Outcome,
  context: {
    ip?: string;
    userId?: string | null;
    role?: string | null;
    resourceType?: string;
    resourceId?: string;
    detail?: Record<string, unknown>;
  } = {}
): void {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    actor: {
      userId: context.userId ?? null,
      role: context.role ?? null,
    },
    ip: context.ip ?? 'unknown',
    action,
    resourceType: context.resourceType,
    resourceId: context.resourceId,
    outcome,
    detail: context.detail,
  };

  // Mirror to console in development for convenience
  if (process.env.NODE_ENV !== 'production') {
    const prefix = level === 'INFO' ? '\x1b[32m' :
                   level === 'WARN' ? '\x1b[33m' :
                   level === 'ERROR' ? '\x1b[31m' : '\x1b[35m'; // CRITICAL = magenta
    const reset = '\x1b[0m';
    console.log(`${prefix}[${level}][${category}]${reset} ${action} → ${outcome}`, context.detail ?? '');
  }

  writeEntry(entry);
}

// ---------------------------------------------------------------------------
// Convenience Level Shortcuts
// ---------------------------------------------------------------------------
export const audit = {
  info:     (cat: LogCategory, action: string, ctx?: Parameters<typeof log>[4]) =>
              log('INFO',     cat, action, 'SUCCESS', ctx),
  warn:     (cat: LogCategory, action: string, ctx?: Parameters<typeof log>[4]) =>
              log('WARN',     cat, action, 'FAILURE', ctx),
  block:    (cat: LogCategory, action: string, ctx?: Parameters<typeof log>[4]) =>
              log('WARN',     cat, action, 'BLOCKED', ctx),
  error:    (cat: LogCategory, action: string, ctx?: Parameters<typeof log>[4]) =>
              log('ERROR',    cat, action, 'FAILURE', ctx),
  critical: (cat: LogCategory, action: string, ctx?: Parameters<typeof log>[4]) =>
              log('CRITICAL', cat, action, 'FAILURE', ctx),
};

// ---------------------------------------------------------------------------
// Log Reader — used by admin /logs endpoints
// ---------------------------------------------------------------------------

export interface LogQueryOptions {
  limit?: number;
  level?: LogLevel;
  category?: LogCategory;
  date?: string; // YYYY-MM-DD, defaults to today
}

/**
 * Reads and filters the daily audit log file.
 * Returns entries in reverse-chronological order (newest first).
 */
export function readAuditLog(options: LogQueryOptions = {}): AuditEntry[] {
  const { limit = 100, level, category, date } = options;
  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const filePath = path.join(LOG_DIR, `audit-${targetDate}.log`);

  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.trim().split('\n').filter(Boolean);

  let entries: AuditEntry[] = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as AuditEntry;
      if (level && entry.level !== level) continue;
      if (category && entry.category !== category) continue;
      entries.push(entry);
    } catch {
      // Skip malformed lines silently
    }
  }

  // Newest first
  entries.reverse();

  return entries.slice(0, limit);
}
