import helmet from 'helmet';
import { RequestHandler } from 'express';

/**
 * Phase 6 — Security Headers Middleware
 *
 * All policies are explicitly configured. No helmet defaults are blindly applied.
 * Every directive is documented with its rationale.
 */

import { env } from '../config/env';

// ---------------------------------------------------------------------------
// CORS Allowed Origins
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = env.FRONTEND_URL.split(',').map(o => o.trim());

export const getAllowedOrigins = () => ALLOWED_ORIGINS;

// ---------------------------------------------------------------------------
// Helmet — Security Headers
// ---------------------------------------------------------------------------
export const securityHeaders: RequestHandler = helmet({

  // ── Content-Security-Policy ───────────────────────────────────────────────
  // EduFlow is a REST API: it serves no HTML. However CSP is still valuable
  // to neutralize any accidental HTML response rendering in a browser.
  contentSecurityPolicy: {
    directives: {
      // Block all content by default; only allow same-origin
      defaultSrc: ["'self'"],
      // No scripts ever. API responses should not execute scripts.
      scriptSrc: ["'self'"],
      // No inline styles; same-origin stylesheets only
      styleSrc: ["'self'"],
      // Images: same-origin and data URIs (for any embedded content)
      imgSrc: ["'self'", 'data:'],
      // Fonts: same-origin only
      fontSrc: ["'self'"],
      // API connections: same-origin only
      connectSrc: ["'self'"],
      // Completely block <object>, <embed>, <applet> (plugin execution)
      objectSrc: ["'none'"],
      // Block framing from any external origin — defends against clickjacking
      frameAncestors: ["'none'"],
      // Block <frame>, <iframe>, <embed>, <object> content loading
      frameSrc: ["'none'"],
      // Block all <form> actions to external origins
      formAction: ["'self'"],
      // Upgrade HTTP sub-requests to HTTPS in production
      ...(env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {}),
    },
  },

  // ── X-Content-Type-Options: nosniff ───────────────────────────────────────
  // Prevents browsers from MIME-sniffing a response away from the declared
  // Content-Type. Mitigates content-injection attacks.
  xContentTypeOptions: true,

  // ── X-Frame-Options: DENY ─────────────────────────────────────────────────
  // Legacy clickjacking protection. We also set frame-ancestors in CSP above
  // for modern browsers, but this covers older browsers.
  xFrameOptions: { action: 'deny' },

  // ── X-XSS-Protection ─────────────────────────────────────────────────────
  // The legacy XSS auditor is disabled in modern browsers. Setting it to 0
  // prevents the auditor from introducing new vulnerabilities.
  xXssProtection: false,

  // ── Referrer-Policy: no-referrer ──────────────────────────────────────────
  // Prevents the browser from sending the Referer header.
  // Protects against leaking the API URL to third-party services.
  referrerPolicy: { policy: 'no-referrer' },

  // Strict-Transport-Security ─────────────────────────────────────────────
  // Forces HTTPS. Only enable in production to avoid breaking local development.
  // maxAge: 1 year. includeSubDomains and preload for maximum coverage.
  strictTransportSecurity: env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,

  // ── Cross-Origin-Opener-Policy ────────────────────────────────────────────
  // Isolates the browsing context from cross-origin documents.
  // Defends against Spectre-class attacks and cross-origin data leakage.
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // ── Cross-Origin-Resource-Policy ─────────────────────────────────────────
  // Prevents other origins from loading our API responses.
  // 'same-origin' is appropriate for a pure API.
  crossOriginResourcePolicy: { policy: 'same-origin' },

  // ── Cross-Origin-Embedder-Policy ─────────────────────────────────────────
  // Required if SharedArrayBuffer is needed (it isn't for this API).
  // Disabled to avoid breaking legitimate cross-origin resource loads
  // until the frontend alignment is confirmed.
  crossOriginEmbedderPolicy: false,

  // ── X-DNS-Prefetch-Control ────────────────────────────────────────────────
  // Disables DNS prefetching, reducing information leakage about linked resources.
  dnsPrefetchControl: { allow: false },

  // ── X-Download-Options ────────────────────────────────────────────────────
  // IE-specific header. Prevents downloaded files from being auto-opened.
  xDownloadOptions: true,

  // ── X-Permitted-Cross-Domain-Policies ────────────────────────────────────
  // Prevents Adobe Flash and Acrobat from making cross-domain requests.
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // ── Origin-Agent-Cluster ─────────────────────────────────────────────────
  // Requests that the browser use a separate agent cluster, providing
  // process isolation from cross-origin documents.
  originAgentCluster: true,

  // ── X-Powered-By ─────────────────────────────────────────────────────────
  // Helmet removes this header by default. Explicitly confirmed here.
  // Prevents fingerprinting of the Express framework.
  hidePoweredBy: true,
});

// ---------------------------------------------------------------------------
// Permissions-Policy
// ---------------------------------------------------------------------------
// Controls which browser APIs/features the page is allowed to use.
// This header is not yet in helmet v7, so we set it manually.
export const permissionsPolicy: RequestHandler = (_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    [
      'camera=(self)',        // Allow camera access for same-origin (needed for QR scanner)
      'microphone=()',        // Deny microphone access
      'geolocation=()',       // Deny geolocation access
      'interest-cohort=()',   // Opt out of FLoC/Topics API
      'payment=()',           // Deny payment API
      'usb=()',               // Deny USB device access
      'fullscreen=(self)',    // Allow fullscreen only for same-origin
    ].join(', ')
  );
  next();
};

// ---------------------------------------------------------------------------
// Cache-Control — Prevent Sensitive Response Caching
// ---------------------------------------------------------------------------
// Applied to all API routes to ensure no browser or proxy caches
// sensitive API responses (auth tokens, user data, course content).
export const noCacheHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');     // HTTP/1.0 backwards compatibility
  res.setHeader('Expires', '0');          // Treat cached response as already expired
  res.setHeader('Surrogate-Control', 'no-store'); // CDN/proxy directive
  next();
};
