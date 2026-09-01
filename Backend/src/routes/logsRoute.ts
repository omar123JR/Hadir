import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { ROLES } from '../utils/permissions';
import { readAuditLog, LogLevel, LogCategory } from '../logging/auditLogger';

const router = Router();

// All log endpoints require admin authentication
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

/**
 * GET /api/admin/logs/audit
 * Query audit log entries for the current day (or a specific date).
 *
 * Query params:
 *   limit    — max entries to return (default: 100, max: 500)
 *   level    — filter by level: INFO | WARN | ERROR | CRITICAL
 *   category — filter by category: AUTH | ADMIN | UPLOAD | ACCESS | SECURITY | HTTP
 *   date     — specific date in YYYY-MM-DD format (default: today)
 */
router.get('/logs/audit', (req, res) => {
  const limit    = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const level    = req.query.level    as LogLevel    | undefined;
  const category = req.query.category as LogCategory | undefined;
  const date     = req.query.date     as string      | undefined;

  // Basic validation
  const VALID_LEVELS: LogLevel[]       = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];
  const VALID_CATS:   LogCategory[]    = ['AUTH', 'ADMIN', 'UPLOAD', 'ACCESS', 'SECURITY', 'HTTP'];

  if (level    && !VALID_LEVELS.includes(level))    return res.status(400).json({ success: false, message: `Invalid level. Valid: ${VALID_LEVELS.join(', ')}` });
  if (category && !VALID_CATS.includes(category))   return res.status(400).json({ success: false, message: `Invalid category. Valid: ${VALID_CATS.join(', ')}` });
  if (date     && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });

  const entries = readAuditLog({ limit, level, category, date });

  res.json({
    success: true,
    count: entries.length,
    filters: { level, category, date: date ?? new Date().toISOString().slice(0, 10), limit },
    data: entries,
  });
});

/**
 * GET /api/admin/logs/security
 * Shortcut: returns only SECURITY-category events (replay attacks, CORS blocks,
 * brute force, validation rate exceeded). Defaults to most recent 100.
 */
router.get('/logs/security', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const date  = req.query.date as string | undefined;

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
  }

  const entries = readAuditLog({ limit, category: 'SECURITY', date });

  res.json({
    success: true,
    count: entries.length,
    filters: { category: 'SECURITY', date: date ?? new Date().toISOString().slice(0, 10), limit },
    data: entries,
  });
});

export default router;
