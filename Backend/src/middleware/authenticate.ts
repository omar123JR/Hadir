import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } from '../config/jwt';
import { JwtPayload } from '../types';
import { securityLogger } from '../logging/securityLogger';
import { pool } from '../config/database';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { userId: string };
    }
  }
}

export interface AuthRequest extends Request {
  user?: JwtPayload & { userId: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      securityLogger.jwtMissing({ ip: req.ip ?? 'unknown', path: req.path });
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please include a Bearer token in Authorization header.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      }) as JwtPayload;

      req.user = { ...decoded, userId: decoded.sub };

      // Verify token_version and is_frozen from DB for real-time revocation and freeze enforcement
      if (decoded.role === 'student' || decoded.role === 'teacher') {
        const [rows] = await pool.execute<any[]>(
          `SELECT is_frozen, freeze_reason, token_version FROM users WHERE id = ?`,
          [decoded.sub]
        );

        if (rows.length > 0) {
          const u = rows[0];

          // 1. Session revocation check (if token_version was incremented on another device)
          if (u.token_version !== undefined && decoded.tokenVersion !== undefined && u.token_version !== decoded.tokenVersion) {
            return res.status(401).json({
              success: false,
              message: 'تم إلغاء هذه الجلسة بسبب تسجيل الخروج من الأجهزة الأخرى. يرجى تسجيل الدخول مجدداً.',
            });
          }

          // 2. Account freeze check (Only for students on non-financial routes)
          if (u.is_frozen && decoded.role === 'student') {
            const isExemptRoute = req.originalUrl.includes('/financials/my-status') ||
                                  req.originalUrl.includes('/auth/me') ||
                                  req.originalUrl.includes('/auth/logout');
            if (!isExemptRoute) {
              return res.status(403).json({
                success: false,
                code: 'ACCOUNT_FROZEN',
                message: u.freeze_reason || 'تم تجميد حسابك الأكاديمي لمراجعة الشؤون المالية. يرجى مراجعة إدارة الكلية.',
              });
            }
          }
        }
      }

      next();
    } catch (jwtError: any) {
      securityLogger.jwtInvalid({
        ip: req.ip ?? 'unknown',
        path: req.path,
        reason: jwtError?.name ?? 'UnknownJwtError',
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};
