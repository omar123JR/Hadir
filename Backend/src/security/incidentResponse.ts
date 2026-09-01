/**
 * incidentResponse.ts — Phase 12
 *
 * Automated incident response actions for EduFlow.
 * Called by routes and middleware when attack patterns are confirmed.
 *
 * Actions available:
 *   - revokeAllUserSessions     — DELETE all refresh tokens for a user
 *   - blockIpTemporarily        — Add IP to threat engine with manual block
 *   - lockUserAccount           — Set account_locked flag in DB
 *   - fullIncidentResponse      — Combined: revoke + block + lock + alert
 */

import { pool } from '../config/database';
import { blockIp, recordThreatEvent } from './threatEngine';
import { sendAlert, AlertSeverity } from './alerts';
import { clearSessionRecord } from './sessionAnomaly';
import { audit } from '../logging/auditLogger';

// ============================================================================
// Session Revocation
// ============================================================================

/**
 * Revoke all active refresh tokens for a user.
 * Call after detecting replay attacks or impossible travel.
 */
export async function revokeAllUserSessions(userId: string, reason: string): Promise<void> {
  try {
    await pool.execute(
      `UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0`,
      [userId]
    );
    audit.warn('SECURITY', 'ALL_SESSIONS_REVOKED', {
      userId,
      detail: { reason },
    });
  } catch (err: any) {
    audit.error('SECURITY', 'SESSION_REVOCATION_FAILED', {
      userId,
      detail: { reason, error: err.message },
    });
  }
}

/**
 * Revoke all tokens for a specific family and clear the anomaly record.
 */
export async function revokeTokenFamily(familyId: string, reason: string): Promise<void> {
  try {
    await pool.execute(
      `UPDATE refresh_tokens SET is_revoked = 1 WHERE family_id = ? AND is_revoked = 0`,
      [familyId]
    );
    clearSessionRecord(familyId);
    audit.warn('SECURITY', 'TOKEN_FAMILY_REVOKED', {
      detail: { familyId, reason },
    });
  } catch (err: any) {
    audit.error('SECURITY', 'TOKEN_FAMILY_REVOCATION_FAILED', {
      detail: { familyId, reason, error: err.message },
    });
  }
}

// ============================================================================
// IP Blocking
// ============================================================================

/**
 * Block an IP immediately (emergency response).
 * Duration defaults to 1 hour for incident response (vs 30 min for auto-block).
 */
export function blockIpTemporarily(ip: string, reason: string, durationMs = 60 * 60 * 1000): void {
  blockIp(ip, durationMs, reason);
}

// ============================================================================
// Account Locking
// ============================================================================

/**
 * Temporarily lock a user account.
 * Requires an `account_locked_until` DATETIME column in the users table.
 * Falls back gracefully if the column doesn't exist yet.
 */
export async function lockUserAccount(userId: string, durationMs: number, reason: string): Promise<void> {
  const lockedUntil = new Date(Date.now() + durationMs).toISOString().replace('T', ' ').substring(0, 19);
  try {
    await pool.execute(
      `UPDATE users SET account_locked_until = ? WHERE id = ?`,
      [lockedUntil, userId]
    );
    audit.warn('SECURITY', 'ACCOUNT_LOCKED', {
      userId,
      detail: { reason, lockedUntil },
    });
  } catch (err: any) {
    // account_locked_until column may not exist — non-fatal
    audit.warn('SECURITY', 'ACCOUNT_LOCK_SKIPPED', {
      userId,
      detail: { reason, error: err.message },
    });
  }
}

// ============================================================================
// Combined Incident Response
// ============================================================================

export interface IncidentContext {
  ip:       string;
  userId?:  string;
  familyId?: string;
  reason:   string;
  severity: AlertSeverity;
  lockAccount?: boolean;
}

/**
 * Full automated incident response:
 * 1. Revoke all user sessions (or specific family)
 * 2. Block the IP for 1 hour
 * 3. Optionally lock the user account
 * 4. Send a security alert
 */
export async function triggerIncidentResponse(ctx: IncidentContext): Promise<void> {
  const tasks: Promise<void>[] = [];

  // 1. Revoke sessions
  if (ctx.familyId) {
    tasks.push(revokeTokenFamily(ctx.familyId, ctx.reason));
  } else if (ctx.userId) {
    tasks.push(revokeAllUserSessions(ctx.userId, ctx.reason));
  }

  // 2. Block IP
  blockIpTemporarily(ctx.ip, ctx.reason);
  recordThreatEvent(ctx.ip, 'REPLAY_ATTACK'); // escalate score

  // 3. Optionally lock account
  if (ctx.lockAccount && ctx.userId) {
    tasks.push(lockUserAccount(ctx.userId, 60 * 60 * 1000, ctx.reason)); // 1h lock
  }

  // 4. Alert
  tasks.push(sendAlert({
    severity:  ctx.severity,
    title:     `Incident Response Triggered`,
    detail:    ctx.reason,
    ip:        ctx.ip,
    userId:    ctx.userId,
    timestamp: new Date().toISOString(),
  }));

  // Run all in parallel — failures are handled internally
  await Promise.allSettled(tasks);

  audit.critical('SECURITY', 'INCIDENT_RESPONSE_TRIGGERED', {
    ip: ctx.ip,
    userId: ctx.userId ?? null,
    detail: { reason: ctx.reason, familyId: ctx.familyId },
  });
}
