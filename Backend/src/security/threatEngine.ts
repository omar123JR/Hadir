/**
 * threatEngine.ts — Phase 12
 *
 * Centralized threat scoring engine for EduFlow.
 * Tracks per-IP suspicious behavior over a rolling window and assigns
 * risk levels. Automatically escalates to blocking via the ipBlocklist module.
 *
 * This is intentionally in-process (no Redis dependency) and tuned for
 * a single-node deployment. For multi-node, replace the Map with a Redis store.
 */

import { audit } from '../logging/auditLogger';

// ============================================================================
// Types
// ============================================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ThreatEvent =
  | 'LOGIN_FAILURE'
  | 'REPLAY_ATTACK'
  | 'VALIDATION_FUZZING'
  | 'UPLOAD_VIOLATION'
  | 'RBAC_VIOLATION'
  | 'INVALID_TOKEN'
  | 'RATE_LIMIT_HIT'
  | 'IMPOSSIBLE_TRAVEL';

export interface ThreatRecord {
  ip: string;
  score: number;
  level: RiskLevel;
  events: Array<{ type: ThreatEvent; ts: number }>;
  firstSeen: number;
  lastSeen: number;
  blocked: boolean;
  blockedUntil?: number;
}

// ============================================================================
// Scoring weights — tuned for a university platform
// ============================================================================
const EVENT_WEIGHTS: Record<ThreatEvent, number> = {
  LOGIN_FAILURE:       5,
  REPLAY_ATTACK:      40,
  VALIDATION_FUZZING: 10,
  UPLOAD_VIOLATION:   15,
  RBAC_VIOLATION:      8,
  INVALID_TOKEN:       5,
  RATE_LIMIT_HIT:     12,
  IMPOSSIBLE_TRAVEL:  50,
};

// Risk thresholds
const LEVEL_THRESHOLDS: Array<{ min: number; level: RiskLevel }> = [
  { min: 80, level: 'CRITICAL' },
  { min: 50, level: 'HIGH'     },
  { min: 25, level: 'MEDIUM'   },
  { min:  0, level: 'LOW'      },
];

// Auto-block thresholds
const AUTO_BLOCK_SCORE      = 80;   // Score at which we auto-block
const BLOCK_DURATION_MS     = 30 * 60 * 1000; // 30 minutes
const SCORE_DECAY_WINDOW_MS = 60 * 60 * 1000; // Events older than 1h don't count
const MAX_EVENTS_PER_IP     = 200;            // Cap memory per record

// ============================================================================
// In-Memory Store
// ============================================================================
const threats = new Map<string, ThreatRecord>();

// Sweep stale entries hourly
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of threats.entries()) {
    // If blocked window has expired, unblock
    if (record.blocked && record.blockedUntil && now > record.blockedUntil) {
      record.blocked = false;
      record.blockedUntil = undefined;
      record.score = 0;
      audit.info('SECURITY', 'THREAT_BLOCK_EXPIRED', { ip, detail: { reason: 'Block window elapsed' } });
    }
    // Remove fully inactive records (no events in 2h)
    if (now - record.lastSeen > 2 * 60 * 60 * 1000) {
      threats.delete(ip);
    }
  }
}, 60 * 60 * 1000).unref();

// ============================================================================
// Core API
// ============================================================================

/** Compute risk level from raw score */
function scoreToLevel(score: number): RiskLevel {
  for (const { min, level } of LEVEL_THRESHOLDS) {
    if (score >= min) return level;
  }
  return 'LOW';
}

/**
 * Record a threat event for an IP.
 * Returns the updated ThreatRecord.
 */
export function recordThreatEvent(ip: string, event: ThreatEvent): ThreatRecord {
  const now = Date.now();

  let record = threats.get(ip);
  if (!record) {
    record = { ip, score: 0, level: 'LOW', events: [], firstSeen: now, lastSeen: now, blocked: false };
    threats.set(ip, record);
  }

  // Append event (cap to prevent memory exhaustion)
  record.events.push({ type: event, ts: now });
  if (record.events.length > MAX_EVENTS_PER_IP) {
    record.events = record.events.slice(-MAX_EVENTS_PER_IP);
  }

  // Recompute score from events within the decay window
  const windowStart = now - SCORE_DECAY_WINDOW_MS;
  record.score = record.events
    .filter(e => e.ts >= windowStart)
    .reduce((sum, e) => sum + EVENT_WEIGHTS[e.type], 0);

  record.level    = scoreToLevel(record.score);
  record.lastSeen = now;

  // Auto-block on critical threshold
  if (!record.blocked && record.score >= AUTO_BLOCK_SCORE) {
    record.blocked      = true;
    record.blockedUntil = now + BLOCK_DURATION_MS;
    audit.critical('SECURITY', 'IP_AUTO_BLOCKED', {
      ip,
      detail: { score: record.score, level: record.level, blockedUntilMs: record.blockedUntil },
    });
  } else if (record.level === 'HIGH' || record.level === 'CRITICAL') {
    audit.warn('SECURITY', 'THREAT_ESCALATED', {
      ip,
      detail: { event, score: record.score, level: record.level },
    });
  }

  return record;
}

/** Check if an IP is currently blocked */
export function isBlocked(ip: string): boolean {
  const record = threats.get(ip);
  if (!record?.blocked) return false;
  // Auto-expire in case the sweep hasn't run yet
  if (record.blockedUntil && Date.now() > record.blockedUntil) {
    record.blocked = false;
    record.blockedUntil = undefined;
    record.score = 0;
    return false;
  }
  return true;
}

/** Get the current threat record for an IP (read-only snapshot) */
export function getThreatRecord(ip: string): Readonly<ThreatRecord> | null {
  return threats.get(ip) ?? null;
}

/** Get all current threat records (for dashboard) */
export function getAllThreats(): ReadonlyArray<ThreatRecord> {
  return Array.from(threats.values());
}

/** Manually unblock an IP (admin action) */
export function unblockIp(ip: string, adminId: string): void {
  const record = threats.get(ip);
  if (record) {
    record.blocked = false;
    record.blockedUntil = undefined;
    record.score = 0;
    audit.info('SECURITY', 'IP_MANUALLY_UNBLOCKED', { ip, userId: adminId });
  }
}

/** Manually block an IP for a given duration */
export function blockIp(ip: string, durationMs: number, reason: string, adminId?: string): ThreatRecord {
  const now = Date.now();
  let record = threats.get(ip);
  if (!record) {
    record = { ip, score: AUTO_BLOCK_SCORE, level: 'HIGH', events: [], firstSeen: now, lastSeen: now, blocked: false };
    threats.set(ip, record);
  }
  record.blocked = true;
  record.blockedUntil = now + durationMs;
  record.lastSeen = now;
  audit.warn('SECURITY', 'IP_MANUALLY_BLOCKED', {
    ip,
    userId: adminId ?? null,
    detail: { reason, durationMs, blockedUntilMs: record.blockedUntil },
  });
  return record;
}

/** Summary stats for the security dashboard */
export function getThreatStats() {
  const all = getAllThreats();
  return {
    total:    all.length,
    blocked:  all.filter(r => r.blocked).length,
    critical: all.filter(r => r.level === 'CRITICAL').length,
    high:     all.filter(r => r.level === 'HIGH').length,
    medium:   all.filter(r => r.level === 'MEDIUM').length,
    low:      all.filter(r => r.level === 'LOW').length,
  };
}
