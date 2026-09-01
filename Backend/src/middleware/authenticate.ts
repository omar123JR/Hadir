import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } from '../config/jwt';
import { JwtPayload } from '../types';
import { securityLogger } from '../logging/securityLogger';

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

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
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
