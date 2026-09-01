/**
 * securityLogger.ts
 *
 * Named helpers for every security event type in EduFlow.
 * Routes and middleware MUST use these functions instead of raw console calls.
 * This ensures every security event has a consistent, queryable structure.
 */
import { audit } from './auditLogger';
import { reportThreat } from '../security/ipBlocklist';

// ---------------------------------------------------------------------------
// AUTH Events
// ---------------------------------------------------------------------------

export const securityLogger = {

  /** Successful user login */
  loginSuccess(ctx: { ip: string; userId: string; role: string; identifier: string }) {
    audit.info('AUTH', 'USER_LOGIN', {
      ip: ctx.ip,
      userId: ctx.userId,
      role: ctx.role,
      detail: { identifier: ctx.identifier },
    });
  },

  /** Failed login attempt (bad credentials) */
  loginFailed(ctx: { ip: string; identifier: string; reason: string }) {
    audit.warn('AUTH', 'USER_LOGIN_FAILED', {
      ip: ctx.ip,
      detail: { identifier: ctx.identifier, reason: ctx.reason },
    });
    reportThreat(ctx.ip, 'LOGIN_FAILURE');
  },

  /** Successful token refresh */
  tokenRefreshed(ctx: { ip: string; userId: string }) {
    audit.info('AUTH', 'TOKEN_REFRESH', {
      ip: ctx.ip,
      userId: ctx.userId,
    });
  },

  /** Replay attack detected — all sessions revoked */
  replayAttack(ctx: { ip: string; userId?: string }) {
    audit.critical('AUTH', 'REPLAY_ATTACK_DETECTED', {
      ip: ctx.ip,
      userId: ctx.userId ?? null,
      detail: { action: 'All sessions revoked for user' },
    });
    reportThreat(ctx.ip, 'REPLAY_ATTACK');
  },

  /** Expired refresh token used */
  expiredTokenUsed(ctx: { ip: string; userId: string }) {
    audit.warn('AUTH', 'EXPIRED_REFRESH_TOKEN', {
      ip: ctx.ip,
      userId: ctx.userId,
    });
  },

  /** User logout */
  logout(ctx: { ip: string; userId: string; globalRevoke: boolean }) {
    audit.info('AUTH', 'USER_LOGOUT', {
      ip: ctx.ip,
      userId: ctx.userId,
      detail: { globalRevoke: ctx.globalRevoke },
    });
  },

  /** Password changed by user */
  passwordChanged(ctx: { ip: string; userId: string }) {
    audit.info('AUTH', 'PASSWORD_CHANGED', {
      ip: ctx.ip,
      userId: ctx.userId,
    });
  },

  /** JWT missing or malformed in request header */
  jwtMissing(ctx: { ip: string; path: string }) {
    audit.warn('ACCESS', 'JWT_MISSING', {
      ip: ctx.ip,
      detail: { path: ctx.path },
    });
  },

  /** JWT invalid or expired */
  jwtInvalid(ctx: { ip: string; path: string; reason: string }) {
    audit.warn('ACCESS', 'JWT_INVALID', {
      ip: ctx.ip,
      detail: { path: ctx.path, reason: ctx.reason },
    });
    reportThreat(ctx.ip, 'INVALID_TOKEN');
  },

  // ---------------------------------------------------------------------------
  // ACCESS Control Events
  // ---------------------------------------------------------------------------

  /** Role authorization failure (403) */
  forbiddenRole(ctx: {
    ip: string;
    userId: string;
    role: string;
    requiredRoles: string[];
    path: string;
  }) {
    audit.block('ACCESS', 'AUTHORIZATION_FAILED', {
      ip: ctx.ip,
      userId: ctx.userId,
      role: ctx.role,
      detail: { requiredRoles: ctx.requiredRoles, path: ctx.path },
    });
    reportThreat(ctx.ip, 'RBAC_VIOLATION');
  },

  /** Resource ownership check failure (teacher/student accessing another's resource) */
  ownershipDenied(ctx: {
    ip: string;
    userId: string;
    role: string;
    resourceType: string;
    resourceId: string;
  }) {
    audit.block('ACCESS', 'OWNERSHIP_CHECK_FAILED', {
      ip: ctx.ip,
      userId: ctx.userId,
      role: ctx.role,
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId,
    });
  },

  // ---------------------------------------------------------------------------
  // UPLOAD Events
  // ---------------------------------------------------------------------------

  /** Malicious or invalid file upload blocked */
  maliciousUpload(ctx: {
    ip: string;
    userId?: string;
    filename: string;
    reason: string;
  }) {
    audit.block('UPLOAD', 'MALICIOUS_UPLOAD_BLOCKED', {
      ip: ctx.ip,
      userId: ctx.userId ?? null,
      detail: { filename: ctx.filename, reason: ctx.reason },
    });
    reportThreat(ctx.ip, 'UPLOAD_VIOLATION');
  },

  /** File uploaded successfully */
  fileUploaded(ctx: {
    ip: string;
    userId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    savedAs: string;
  }) {
    audit.info('UPLOAD', 'FILE_UPLOADED', {
      ip: ctx.ip,
      userId: ctx.userId,
      detail: {
        originalName: ctx.filename,
        mimeType: ctx.mimeType,
        sizeBytes: ctx.sizeBytes,
        savedAs: ctx.savedAs,
      },
    });
  },

  /** File download served */
  fileDownloaded(ctx: { ip: string; userId: string; resourceId: string }) {
    audit.info('UPLOAD', 'FILE_DOWNLOADED', {
      ip: ctx.ip,
      userId: ctx.userId,
      resourceId: ctx.resourceId,
    });
  },

  // ---------------------------------------------------------------------------
  // SECURITY Events
  // ---------------------------------------------------------------------------

  /** Validation rate threshold exceeded — likely probing/fuzzing */
  validationRateExceeded(ctx: { ip: string; count: number }) {
    audit.block('SECURITY', 'VALIDATION_RATE_EXCEEDED', {
      ip: ctx.ip,
      detail: { failureCount: ctx.count },
    });
    reportThreat(ctx.ip, 'VALIDATION_FUZZING');
  },

  /** CORS blocked request from unlisted origin */
  corsBlocked(ctx: { ip: string; origin: string }) {
    audit.block('SECURITY', 'CORS_BLOCKED', {
      ip: ctx.ip,
      detail: { blockedOrigin: ctx.origin },
    });
  },

  // ---------------------------------------------------------------------------
  // ADMIN Action Events
  // ---------------------------------------------------------------------------

  /** Admin performed a mutating operation */
  adminAction(ctx: {
    ip: string;
    adminId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    detail?: Record<string, unknown>;
  }) {
    audit.info('ADMIN', ctx.action, {
      ip: ctx.ip,
      userId: ctx.adminId,
      role: 'admin',
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId,
      detail: ctx.detail,
    });
  },
};
