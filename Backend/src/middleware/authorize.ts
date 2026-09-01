import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { Role } from '../utils/permissions';
import { securityLogger } from '../logging/securityLogger';

export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in.'
      });
    }

    if (!roles.includes(req.user.role as Role)) {
      securityLogger.forbiddenRole({
        ip: req.ip ?? 'unknown',
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path,
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};
