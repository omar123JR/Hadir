import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodRawShape, ZodError, ZodIssue } from 'zod';
import { securityLogger } from '../logging/securityLogger';

const failedAttempts = new Map<string, { count: number; timestamp: number }>();
const WINDOW_MS = 60 * 1000;   // 1-minute window
const THRESHOLD  = 5;           // trigger alert after 5 failures per window

// Sweep expired entries every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of failedAttempts.entries()) {
    if (now - record.timestamp > WINDOW_MS) {
      failedAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export const validateRequest = <T extends ZodRawShape>(schema: ZodObject<T>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body:   req.body,
        query:  req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const zodErr = error as ZodError<unknown>;
        const ip  = req.ip ?? req.socket.remoteAddress ?? 'unknown';
        const now = Date.now();
        const record = failedAttempts.get(ip);

        if (record && now - record.timestamp < WINDOW_MS) {
          record.count += 1;
          if (record.count >= THRESHOLD) {
            securityLogger.validationRateExceeded({ ip, count: record.count });
          }
        } else {
          failedAttempts.set(ip, { count: 1, timestamp: now });
        }

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: zodErr.issues.map((e: ZodIssue) => ({
            path:    e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};
