/**
 * alerts.ts — Phase 12
 *
 * Security alerting engine for EduFlow.
 * Always logs to the audit trail. Optionally forwards to:
 *   - Discord webhook  (ALERT_DISCORD_WEBHOOK)
 *   - Slack webhook    (ALERT_SLACK_WEBHOOK)
 *
 * Alert sending is fire-and-forget: failures never crash the application.
 */

import { audit } from '../logging/auditLogger';

// ============================================================================
// Config — read once at startup
// ============================================================================
const DISCORD_WEBHOOK = process.env.ALERT_DISCORD_WEBHOOK;
const SLACK_WEBHOOK   = process.env.ALERT_SLACK_WEBHOOK;

// ============================================================================
// Types
// ============================================================================
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SecurityAlert {
  severity:  AlertSeverity;
  title:     string;
  detail:    string;
  ip?:       string;
  userId?:   string;
  timestamp: string;
}

// ============================================================================
// Internal — fire-and-forget HTTP POST
// ============================================================================
async function postWebhook(url: string, body: object): Promise<void> {
  try {
    const { default: https } = await import('https');
    const { default: http  } = await import('http');
    const payload = JSON.stringify(body);
    const parsed  = new URL(url);
    const lib     = parsed.protocol === 'https:' ? https : http;

    await new Promise<void>((resolve) => {
      const req = lib.request(
        { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
        (res) => { res.resume(); resolve(); }
      );
      req.on('error', () => resolve()); // swallow silently
      req.write(payload);
      req.end();
    });
  } catch {
    // Never propagate webhook failures
  }
}

// ============================================================================
// Discord payload
// ============================================================================
function discordPayload(alert: SecurityAlert): object {
  const colorMap: Record<AlertSeverity, number> = {
    INFO:     0x3498db, // blue
    WARNING:  0xf39c12, // orange
    CRITICAL: 0xe74c3c, // red
  };
  return {
    embeds: [{
      title:       `🔐 EduFlow Security Alert — ${alert.severity}`,
      description: `**${alert.title}**\n${alert.detail}`,
      color:        colorMap[alert.severity],
      fields: [
        alert.ip     ? { name: 'IP',      value: alert.ip,     inline: true } : null,
        alert.userId ? { name: 'User ID', value: alert.userId, inline: true } : null,
        { name: 'Time', value: alert.timestamp, inline: false },
      ].filter(Boolean),
    }],
  };
}

// ============================================================================
// Slack payload
// ============================================================================
function slackPayload(alert: SecurityAlert): object {
  const emojiMap: Record<AlertSeverity, string> = {
    INFO: ':information_source:', WARNING: ':warning:', CRITICAL: ':rotating_light:',
  };
  return {
    text: `${emojiMap[alert.severity]} *EduFlow Security — ${alert.severity}*`,
    blocks: [{
      type: 'section',
      text: { type: 'mrkdwn', text: `*${alert.title}*\n${alert.detail}\nIP: \`${alert.ip ?? 'N/A'}\` | Time: ${alert.timestamp}` },
    }],
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Send a security alert.
 * Always writes to the audit log. Sends to configured webhooks asynchronously.
 */
export async function sendAlert(alert: SecurityAlert): Promise<void> {
  // 1. Always audit-log
  const logLevel = alert.severity === 'CRITICAL' ? 'CRITICAL' :
                   alert.severity === 'WARNING'  ? 'WARN' : 'INFO';
  audit[logLevel === 'CRITICAL' ? 'critical' : logLevel === 'WARN' ? 'warn' : 'info'](
    'SECURITY', `ALERT_${alert.severity}`,
    { ip: alert.ip, userId: alert.userId, detail: { title: alert.title, detail: alert.detail } }
  );

  // 2. Console echo in non-production
  if (process.env.NODE_ENV !== 'production') {
    const prefix = alert.severity === 'CRITICAL' ? '\x1b[35m' :
                   alert.severity === 'WARNING'  ? '\x1b[33m' : '\x1b[36m';
    console.log(`${prefix}[ALERT][${alert.severity}]\x1b[0m ${alert.title} — ${alert.detail}`);
  }

  // 3. Forward to webhooks (fire-and-forget)
  if (DISCORD_WEBHOOK) postWebhook(DISCORD_WEBHOOK, discordPayload(alert));
  if (SLACK_WEBHOOK)   postWebhook(SLACK_WEBHOOK,   slackPayload(alert));
}

// ============================================================================
// Pre-built alert factories — call these from routes/security modules
// ============================================================================

export const securityAlert = {

  replayAttack(ip: string, userId?: string) {
    return sendAlert({
      severity: 'CRITICAL', ip, userId,
      title:  'Refresh Token Replay Attack Detected',
      detail: 'A consumed refresh token was reused. All sessions for the affected user have been revoked.',
      timestamp: new Date().toISOString(),
    });
  },

  ipBlocked(ip: string, score: number) {
    return sendAlert({
      severity: 'WARNING', ip,
      title:  'IP Address Auto-Blocked',
      detail: `IP reached threat score ${score} and has been temporarily blocked for 30 minutes.`,
      timestamp: new Date().toISOString(),
    });
  },

  bruteForce(ip: string, attemptCount: number) {
    return sendAlert({
      severity: 'WARNING', ip,
      title:  'Brute Force Attack Detected',
      detail: `${attemptCount} consecutive failed login attempts detected from this IP.`,
      timestamp: new Date().toISOString(),
    });
  },

  rbacViolation(ip: string, userId: string, path: string, count: number) {
    return sendAlert({
      severity: count >= 5 ? 'CRITICAL' : 'WARNING', ip, userId,
      title:  'Repeated RBAC Violation',
      detail: `User attempted to access restricted path "${path}" ${count} times. Possible privilege escalation probe.`,
      timestamp: new Date().toISOString(),
    });
  },

  maliciousUpload(ip: string, userId: string, filename: string) {
    return sendAlert({
      severity: 'WARNING', ip, userId,
      title:  'Malicious Upload Blocked',
      detail: `Blocked upload of suspicious file: "${filename}". Possible file-type bypass or malware injection attempt.`,
      timestamp: new Date().toISOString(),
    });
  },

  impossibleTravel(userId: string, ip1: string, ip2: string) {
    return sendAlert({
      severity: 'CRITICAL', ip: ip2, userId,
      title:  'Impossible Travel Detected',
      detail: `Session jumped from ${ip1} to ${ip2} within a suspiciously short time. Token family revoked.`,
      timestamp: new Date().toISOString(),
    });
  },

  tokenAbuse(ip: string, userId: string, detail: string) {
    return sendAlert({
      severity: 'WARNING', ip, userId,
      title:  'Rapid Token Refresh Abuse',
      detail,
      timestamp: new Date().toISOString(),
    });
  },
};
