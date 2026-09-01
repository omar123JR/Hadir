/**
 * sessionAnomaly.ts — Phase 12
 *
 * Detects anomalous session behavior:
 *   - Impossible travel: same token used from very different IPs within a short window
 *   - Rapid token refresh abuse: too many refreshes per token family per minute
 *   - Concurrent session explosion: too many distinct IPs using one user's tokens
 *
 * When anomaly is detected:
 *   - Records a CRITICAL threat event in the engine
 *   - Emits an alert
 *   - Returns a flag so the calling route can revoke the token family
 */

import { recordThreatEvent } from './threatEngine';
import { securityAlert } from './alerts';
import { audit } from '../logging/auditLogger';

// ============================================================================
// Config
// ============================================================================
const IMPOSSIBLE_TRAVEL_WINDOW_MS = 10 * 60 * 1000;  // 10 minutes
const MAX_REFRESH_PER_FAMILY_PER_MIN = 5;             // >5 refreshes/min = abuse
const MAX_DISTINCT_IPS_PER_USER = 6;                  // >6 distinct IPs = suspicious

// ============================================================================
// In-Memory State
// ============================================================================

interface SessionRecord {
  userId: string;
  lastIp: string;
  lastSeenMs: number;
  ips: Set<string>;
  refreshCount: number;
  refreshWindowStart: number;
}

// key = familyId (per-token-family) or userId
const sessionMap = new Map<string, SessionRecord>();

// Cleanup stale sessions every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [key, rec] of sessionMap.entries()) {
    if (rec.lastSeenMs < cutoff) sessionMap.delete(key);
  }
}, 30 * 60 * 1000).unref();

// ============================================================================
// Core check — call from the refresh token endpoint
// ============================================================================

export interface AnomalyResult {
  anomalyDetected: boolean;
  reason?: string;
}

/**
 * Analyze a refresh token usage event.
 * @param familyId  Token family identifier (used to track rotation chain)
 * @param userId    Authenticated user ID
 * @param ip        Client IP address of the current request
 * @returns AnomalyResult — if anomalyDetected is true, revoke the token family
 */
export function analyzeRefreshEvent(familyId: string, userId: string, ip: string): AnomalyResult {
  const now = Date.now();
  let record = sessionMap.get(familyId);

  if (!record) {
    sessionMap.set(familyId, {
      userId,
      lastIp: ip,
      lastSeenMs: now,
      ips: new Set([ip]),
      refreshCount: 1,
      refreshWindowStart: now,
    });
    return { anomalyDetected: false };
  }

  // --- Check 1: Impossible Travel ---
  if (record.lastIp !== ip) {
    const elapsed = now - record.lastSeenMs;
    if (elapsed < IMPOSSIBLE_TRAVEL_WINDOW_MS) {
      audit.critical('SECURITY', 'IMPOSSIBLE_TRAVEL', {
        ip,
        userId,
        detail: { previousIp: record.lastIp, newIp: ip, elapsedMs: elapsed },
      });
      recordThreatEvent(ip, 'IMPOSSIBLE_TRAVEL');
      recordThreatEvent(record.lastIp, 'IMPOSSIBLE_TRAVEL');
      securityAlert.impossibleTravel(userId, record.lastIp, ip);
      return { anomalyDetected: true, reason: 'IMPOSSIBLE_TRAVEL' };
    }
    record.ips.add(ip);
  }

  // --- Check 2: Concurrent Session Explosion ---
  if (record.ips.size > MAX_DISTINCT_IPS_PER_USER) {
    audit.warn('SECURITY', 'CONCURRENT_SESSION_EXPLOSION', {
      ip, userId,
      detail: { distinctIps: record.ips.size, threshold: MAX_DISTINCT_IPS_PER_USER },
    });
    recordThreatEvent(ip, 'INVALID_TOKEN');
    return { anomalyDetected: true, reason: 'CONCURRENT_SESSION_EXPLOSION' };
  }

  // --- Check 3: Rapid Token Refresh Abuse ---
  if (now - record.refreshWindowStart < 60_000) {
    record.refreshCount += 1;
    if (record.refreshCount > MAX_REFRESH_PER_FAMILY_PER_MIN) {
      audit.warn('SECURITY', 'RAPID_TOKEN_REFRESH', {
        ip, userId,
        detail: { refreshCount: record.refreshCount, windowMs: 60_000 },
      });
      recordThreatEvent(ip, 'REPLAY_ATTACK');
      securityAlert.tokenAbuse(ip, userId,
        `Token family refreshed ${record.refreshCount} times in under 60 seconds.`);
      return { anomalyDetected: true, reason: 'RAPID_REFRESH_ABUSE' };
    }
  } else {
    // Reset window
    record.refreshCount = 1;
    record.refreshWindowStart = now;
  }

  record.lastIp    = ip;
  record.lastSeenMs = now;
  return { anomalyDetected: false };
}

/** Remove a family from the session map (call after revocation) */
export function clearSessionRecord(familyId: string): void {
  sessionMap.delete(familyId);
}

/** Get all active session records for the dashboard */
export function getActiveSessions(): ReadonlyArray<{ familyId: string; userId: string; ips: string[]; lastSeenMs: number }> {
  return Array.from(sessionMap.entries()).map(([familyId, rec]) => ({
    familyId,
    userId:     rec.userId,
    ips:        Array.from(rec.ips),
    lastSeenMs: rec.lastSeenMs,
  }));
}
