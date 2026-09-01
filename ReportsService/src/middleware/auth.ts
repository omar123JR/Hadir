import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, message: 'Invalid token format' });
        }

        const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random';

        try {
            const decoded = jwt.verify(token, secret);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

