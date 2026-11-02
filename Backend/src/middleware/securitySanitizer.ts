import { Request, Response, NextFunction } from 'express';

// Strict limits to prevent Buffer Overflow & Memory exhaustion attacks
const MAX_STRING_LENGTH = 500;       // standard inputs (name, code, identifiers)
const MAX_TEXT_LENGTH = 5000;        // long descriptions / essay fields
const MAX_ARRAY_LENGTH = 100;

// Regular expressions to detect common SQL Injection & XSS patterns
const SQLI_PATTERN = /(\b(UNION(\s+ALL)?|SELECT|DROP|ALTER|INSERT|DELETE|UPDATE|EXEC(UTE)?)\b|--|\/\*|\*\/|@@|char\s*\(|waitfor\s+delay)/i;
const XSS_PATTERN = /(<script\b[^>]*>|javascript:|onerror\s*=|onload\s*=|onclick\s*=|document\.cookie|<iframe\b|<embed\b)/i;

/**
 * Recursive sanitizer that checks every string for buffer boundaries and dangerous injection tokens
 */
function inspectAndSanitize(value: any, keyName: string = ''): { safe: boolean; reason?: string } {
  if (value === null || value === undefined) return { safe: true };

  if (typeof value === 'string') {
    // 1. Length checks (Buffer overflow / DoS protection)
    const limit = keyName.includes('description') || keyName.includes('notes') ? MAX_TEXT_LENGTH : MAX_STRING_LENGTH;
    if (value.length > limit) {
      return {
        safe: false,
        reason: `حجم الحقل "${keyName}" يتجاوز الحد الأقصى المسموح به (${limit} حرف). تم حظره لمنع طفح الذاكرة (Buffer Overflow).`,
      };
    }

    // 2. Check for SQL Injection signatures (skip passwords and JWT tokens where hashes may look random)
    if (!keyName.includes('password') && !keyName.includes('token') && !keyName.includes('secret')) {
      if (SQLI_PATTERN.test(value)) {
        return {
          safe: false,
          reason: `الحقل "${keyName}" يحتوي على شفرات استعلام غير مسموح بها (SQL Injection Signature).`,
        };
      }

      // 3. Check for XSS signatures
      if (XSS_PATTERN.test(value)) {
        return {
          safe: false,
          reason: `الحقل "${keyName}" يحتوي على وسوم ونصوص برمجية خبيثة (XSS Injection Detected).`,
        };
      }
    }

    return { safe: true };
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) {
      return {
        safe: false,
        reason: `عدد عناصر المصفوفة "${keyName}" يتجاوز الحد المسموح (${MAX_ARRAY_LENGTH}).`,
      };
    }
    for (let i = 0; i < value.length; i++) {
      const res = inspectAndSanitize(value[i], `${keyName}[${i}]`);
      if (!res.safe) return res;
    }
    return { safe: true };
  }

  if (typeof value === 'object') {
    for (const k of Object.keys(value)) {
      const res = inspectAndSanitize(value[k], k);
      if (!res.safe) return res;
    }
    return { safe: true };
  }

  return { safe: true };
}

export function securitySanitizer(req: Request, res: Response, next: NextFunction) {
  // Check Query params
  const queryCheck = inspectAndSanitize(req.query, 'query');
  if (!queryCheck.safe) {
    return res.status(400).json({
      success: false,
      securityBlocked: true,
      message: queryCheck.reason,
    });
  }

  // Check Body params
  if (req.body && typeof req.body === 'object') {
    const bodyCheck = inspectAndSanitize(req.body, 'body');
    if (!bodyCheck.safe) {
      return res.status(400).json({
        success: false,
        securityBlocked: true,
        message: bodyCheck.reason,
      });
    }
  }

  next();
}
