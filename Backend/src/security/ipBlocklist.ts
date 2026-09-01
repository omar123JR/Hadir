/**
 * ipBlocklist.ts — Phase 12
 *
 * Express middleware that gates every incoming request against the threat engine.
 * Blocked IPs receive a 429 response before touching any route handler.
 *
 * Also exports standalone helpers so other middleware (auth, upload, RBAC)
 * can feed threat events into the engine without importing server internals.
 */

import { Request, Response, NextFunction } from 'express';
import { isBlocked, recordThreatEvent, ThreatEvent } from './threatEngine';
import { audit } from '../logging/auditLogger';

// ============================================================================
// Middleware — block flagged IPs at the gate
// ============================================================================

/**
 * Mount this before all route handlers in server.ts.
 * Returns 429 immediately for any IP the threat engine has blocked.
 */
export function ipBlockMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';

  if (isBlocked(ip)) {
    audit.block('SECURITY', 'BLOCKED_IP_REQUEST', {
      ip,
      detail: { path: req.path, method: req.method },
    });
    res.status(429).json({
      success: false,
      message: 'Your IP has been temporarily blocked due to suspicious activity. Please try again later.',
      code: 'IP_BLOCKED',
    });
    return;
  }

  next();
}

// ============================================================================
// Convenience wrappers — call these from routes/middleware instead of
// importing threatEngine directly. Keeps the calling code one-liner clean.
// ============================================================================

export function reportThreat(ip: string, event: ThreatEvent): void {
  recordThreatEvent(ip, event);
}

/** Extract the real client IP safely from a request */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
