import { env } from './config/env'; // MUST BE FIRST to validate before anything else executes
import express from 'express';
import cors from 'cors';
import path from 'path';

// Phase 6 — Security Middleware
import { securityHeaders, permissionsPolicy, noCacheHeaders, getAllowedOrigins } from './middleware/security';
// Phase 7 — Audit Logging
import { log } from './logging/auditLogger';
import { securityLogger } from './logging/securityLogger';
import logsRoute from './routes/logsRoute';
import healthRoutes from './routes/healthRoutes';
// Phase 12 — Advanced Threat Detection
import { ipBlockMiddleware } from './security/ipBlocklist';
import securityDashboardRoutes from './routes/securityDashboardRoutes';

// Import Routes
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import lectureRoutes from './routes/lectureRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import courseRoutes from './routes/courseRoutes';
import reportsRoutes from './routes/reportsRoutes';

const app = express();
const PORT = env.PORT;

// ============================================================================
// TRUSTED PROXY CONFIGURATION
// ============================================================================
// MUST be set before any middleware that reads req.ip (rate limiters,
// CORS origin logger, validation rate monitor, auth audit logs).
//
// When EduFlow sits behind a reverse proxy (Nginx, Cloudflare, AWS ALB):
//   - req.ip would resolve to the proxy's IP without this setting
//   - Rate limiters would treat ALL users as a single IP → trivially bypassed
//   - Auth audit logs would record the wrong IP address
//
// SECURITY WARNING: Do NOT set this to `true` or a large number.
//   Doing so lets attackers forge X-Forwarded-For headers and spoof their IP,
//   bypassing rate limits and poisoning security logs.
//
// Supported values (via TRUST_PROXY env var):
//   1            → trust exactly 1 hop (default, safe for single Nginx/LB)
//   'loopback'   → trust 127.0.0.1 only (for local Nginx on same machine)
//   '10.0.0.0/8' → trust a specific CIDR range (known internal load balancer)
//
// In production, set TRUST_PROXY=1 (or the appropriate value) in your env.
// In development (no proxy), this is a safe no-op.
const trustProxy = env.TRUST_PROXY ?? (env.NODE_ENV === 'production' ? '1' : false);
if (trustProxy !== false) {
  const hopCount = parseInt(trustProxy as string, 10);
  app.set('trust proxy', isNaN(hopCount) ? trustProxy : hopCount);
  console.log(`[CONFIG] Trust proxy set to: ${trustProxy}`);
}

// ============================================================================
// Phase 6 — SECURITY HEADERS (must be first middleware)
// ============================================================================

// 1. Helmet — sets X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
//    CSP, HSTS (prod), Cross-Origin-*-Policy, X-Powered-By removal, etc.
app.use(securityHeaders);

// 2. Permissions-Policy — controls access to browser APIs (camera, mic, etc.)
app.use(permissionsPolicy);

// 3. Cache-Control — prevent browsers/proxies from caching sensitive API data
app.use('/api', noCacheHeaders);

// ============================================================================
// CORS — Hardened Configuration
// ============================================================================
// Whitelist-only: requests from unlisted origins are rejected.
// Credentials flag allows the Authorization header on cross-origin requests.
// Only the methods our API actually uses are allowed.
// Exposed headers limited to what the frontend legitimately reads.
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl in dev)
    if (!origin) return callback(null, true);

    if (getAllowedOrigins().includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from unlisted origin: ${origin}`);
      securityLogger.corsBlocked({ ip: 'pre-connection', origin });
      callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],  // Needed for file download filenames
  maxAge: 86400, // Cache preflight response for 24 hours (reduces OPTIONS spam)
}));

// ============================================================================
// Body Parsers
// ============================================================================
app.use(express.json({ limit: '1mb' }));          // Hard cap on JSON body size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================================
// Phase 12 — IP Blocklist Gate (before any route handler)
// ============================================================================
app.use(ipBlockMiddleware);

// ============================================================================
// Phase 7 — HTTP Access Log
// ============================================================================
// Logs every request: method, path, status code, response time, and IP.
// Distinct from security event logs — this is operational observability.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    log(
      res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
      'HTTP',
      `${req.method} ${req.path}`,
      res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
      {
        ip: req.ip ?? 'unknown',
        userId: (req as any).user?.userId ?? null,
        role:   (req as any).user?.role   ?? null,
        detail: { status: res.statusCode, ms },
      }
    );
  });
  next();
});

// ============================================================================
// Health Check
// ============================================================================
// REMOVED: Phase 4 — static upload serving is disabled.
// Files are served via authenticated /download endpoints.
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'EduFlow Backend API is running 🚀',
    version: '1.0.0'
  });
});

// ============================================================================
// API Routes
// ============================================================================
app.use('/api/auth',       authRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/admin',      logsRoute);       // Phase 7 — audit log endpoints
app.use('/api/attendance', attendanceRoutes);
app.use('/api/lectures',   lectureRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/courses',    courseRoutes);
app.use('/api/reports',    reportsRoutes);

// Phase 11 — Health & Readiness Monitoring
app.use('/health', healthRoutes);

// Phase 12 — Security Dashboard (admin only)
app.use('/api/admin/security', securityDashboardRoutes);

// ============================================================================
// 404 Handler
// ============================================================================
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.'
  });
});

// ============================================================================
// Global Error Handler
// ============================================================================
// Must be last. Sanitizes errors so internal details never reach the client.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // CORS errors — send a proper 403 instead of a 500
  if (err.message && err.message.startsWith('CORS policy:')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // Log full error internally for debugging
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  const status = err.status || 500;

  // Send sanitized response — never expose stack traces or DB errors in production
  res.status(status).json({
    success: false,
    message: env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// Phase 11 — Graceful Shutdown
// ============================================================================
import { pool } from './config/database';

let httpServer: ReturnType<typeof app.listen> | null = null;

function shutdown(reason: string, exitCode = 0): void {
  log('WARN', 'SYSTEM', 'SHUTDOWN', 'FAILURE', { detail: { reason, status: 'initiating' } });
  console.log(`\n[SHUTDOWN] Initiating graceful shutdown — reason: ${reason}`);

  const forceExit = setTimeout(() => {
    console.error('[SHUTDOWN] ⚠️  Forced exit after timeout.');
    process.exit(1);
  }, 10_000); // 10s hard deadline
  forceExit.unref();

  // 1. Stop accepting new connections
  if (httpServer) {
    httpServer.close(() => {
      console.log('[SHUTDOWN] HTTP server closed.');
    });
  }

  // 2. Close database pool
  pool.end().then(() => {
    console.log('[SHUTDOWN] ✅ Database pool closed cleanly.');
    log('INFO', 'SYSTEM', 'SHUTDOWN', 'SUCCESS', { detail: { reason } });
    clearTimeout(forceExit);
    process.exit(exitCode);
  }).catch((err: any) => {
    console.error('[SHUTDOWN] ❌ DB pool close error:', err.message);
    process.exit(1);
  });
}

// Handle OS termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Handle programmer errors — log and crash safely (never silently swallow)
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  log('ERROR', 'SYSTEM', 'UNCAUGHT_EXCEPTION', 'FAILURE', { detail: { message: err.message } });
  shutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  log('ERROR', 'SYSTEM', 'UNHANDLED_REJECTION', 'FAILURE', { detail: { reason: String(reason) } });
  // Do not crash on unhandled rejections in test environments
  if (env.NODE_ENV === 'production') shutdown('unhandledRejection', 1);
});

// ============================================================================
// Start Server
// ============================================================================
if (env.NODE_ENV !== 'test') {
  httpServer = app.listen(PORT, () => {
    console.log(`\n✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅`);
    console.log(`✅  Server running on http://localhost:${PORT} ✅`);
    console.log(`✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅`);
  });
}

export default app;