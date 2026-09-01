/**
 * securityDashboardRoutes.ts — Phase 12
 *
 * Admin-only API endpoints for the EduFlow security dashboard.
 * All routes require authentication + admin role.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { ROLES } from '../utils/permissions';
import { getAllThreats, getThreatStats, unblockIp, blockIp } from '../security/threatEngine';
import { getActiveSessions } from '../security/sessionAnomaly';
import { readAuditLog } from '../logging/auditLogger';
import { securityLogger } from '../logging/securityLogger';

const router = Router();

// All routes require admin
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

// ============================================================================
// GET /api/admin/security/overview
// Aggregate security posture summary
// ============================================================================
router.get('/overview', (_req: Request, res: Response) => {
  const stats   = getThreatStats();
  const sessions = getActiveSessions();

  // Pull last 50 security events from today's audit log
  const recentEvents = readAuditLog({ limit: 50, category: 'SECURITY' });

  res.json({
    success: true,
    data: {
      threatStats:    stats,
      activeSessions: sessions.length,
      recentSecurityEvents: recentEvents,
    },
  });
});

// ============================================================================
// GET /api/admin/security/threats
// Full threat record list with filters
// ============================================================================
router.get('/threats', (req: Request, res: Response) => {
  let threats = getAllThreats() as ReturnType<typeof getAllThreats>;

  // Optional filter: ?level=HIGH&blocked=true
  const { level, blocked } = req.query;
  if (level)   threats = threats.filter(t => t.level   === level);
  if (blocked !== undefined) {
    const wantBlocked = blocked === 'true';
    threats = threats.filter(t => t.blocked === wantBlocked);
  }

  // Sort by score descending
  const sorted = [...threats].sort((a, b) => b.score - a.score);

  res.json({
    success: true,
    count:   sorted.length,
    data:    sorted.map(t => ({
      ip:           t.ip,
      score:        t.score,
      level:        t.level,
      blocked:      t.blocked,
      blockedUntil: t.blockedUntil ? new Date(t.blockedUntil).toISOString() : null,
      firstSeen:    new Date(t.firstSeen).toISOString(),
      lastSeen:     new Date(t.lastSeen).toISOString(),
      eventCount:   t.events.length,
    })),
  });
});

// ============================================================================
// GET /api/admin/security/blocked-ips
// List only currently blocked IPs
// ============================================================================
router.get('/blocked-ips', (_req: Request, res: Response) => {
  const now = Date.now();
  const blocked = getAllThreats()
    .filter(t => t.blocked)
    .map(t => ({
      ip:           t.ip,
      score:        t.score,
      level:        t.level,
      blockedUntil: t.blockedUntil ? new Date(t.blockedUntil).toISOString() : null,
      remainingMs:  t.blockedUntil ? Math.max(0, t.blockedUntil - now) : null,
    }));

  res.json({ success: true, count: blocked.length, data: blocked });
});

// ============================================================================
// POST /api/admin/security/block-ip
// Manually block an IP
// ============================================================================
router.post('/block-ip', (req: Request, res: Response) => {
  const { ip, durationMinutes = 60, reason = 'Manual admin block' } = req.body;

  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ success: false, message: 'ip is required.' });
  }

  const adminId = (req as any).user?.userId ?? 'unknown';
  const durationMs = Number(durationMinutes) * 60 * 1000;
  blockIp(ip, durationMs, reason, adminId);

  securityLogger.adminAction({
    ip: (req as any).ip ?? 'unknown',
    adminId,
    action:       'MANUAL_IP_BLOCK',
    resourceType: 'ip',
    resourceId:   ip,
    detail:       { durationMinutes, reason },
  });

  res.json({ success: true, message: `IP ${ip} blocked for ${durationMinutes} minutes.` });
});

// ============================================================================
// POST /api/admin/security/unblock-ip
// Manually unblock an IP
// ============================================================================
router.post('/unblock-ip', (req: Request, res: Response) => {
  const { ip } = req.body;

  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ success: false, message: 'ip is required.' });
  }

  const adminId = (req as any).user?.userId ?? 'unknown';
  unblockIp(ip, adminId);

  securityLogger.adminAction({
    ip: (req as any).ip ?? 'unknown',
    adminId,
    action:       'MANUAL_IP_UNBLOCK',
    resourceType: 'ip',
    resourceId:   ip,
  });

  res.json({ success: true, message: `IP ${ip} has been unblocked.` });
});

// ============================================================================
// GET /api/admin/security/sessions
// Active session anomaly tracking view
// ============================================================================
router.get('/sessions', (_req: Request, res: Response) => {
  const sessions = getActiveSessions().map(s => ({
    ...s,
    lastSeen: new Date(s.lastSeenMs).toISOString(),
  }));

  res.json({ success: true, count: sessions.length, data: sessions });
});

export default router;
