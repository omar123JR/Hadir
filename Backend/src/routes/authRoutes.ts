import { Router } from 'express';
import { login, getCurrentUser, changePassword, updateAdmin } from '../services/authService';
import { updateUser } from '../services/userService';
import { authenticate } from '../middleware/authenticate';
import { LoginRequest } from '../types';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } from '../config/jwt';
import { generateToken, generateOpaqueToken, hashToken } from '../services/authService';
import { pool } from '../config/database';
import { validateRequest } from '../middleware/validator';
import { loginSchema, refreshSchema, logoutSchema, changePasswordSchema, updateProfileSchema } from '../schemas/auth.schema';
import { securityLogger } from '../logging/securityLogger';
import { reportThreat, clientIp } from '../security/ipBlocklist';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    error: 'TOO_MANY_REQUESTS'
  },
  handler: (req, res) => {
    reportThreat(clientIp(req), 'RATE_LIMIT_HIT');
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
      error: 'TOO_MANY_REQUESTS',
    });
  },
});

const router = Router();

// POST /api/auth/login
router.post('/login', loginLimiter, validateRequest(loginSchema), async (req, res, next) => {
  try {
    const { identifier, password } = req.body as LoginRequest;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Identifier and password are required.'
      });
    }

    const result = await login({ identifier, password });

    if (!result.success) {
      securityLogger.loginFailed({ ip: req.ip ?? 'unknown', identifier, reason: 'Invalid credentials' });
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    securityLogger.loginSuccess({
      ip: req.ip ?? 'unknown',
      userId: result.user?.id ?? identifier,
      role: result.user?.role ?? 'unknown',
      identifier,
    });
    res.json(result);
  } catch (error) {
    console.error('Login route error:', error);
    next(error);
  }
});

// POST /api/auth/refresh - Refresh Access Token
router.post('/refresh', validateRequest(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    const tokenHash = hashToken(refreshToken);

    // Verify token exists and is valid
    const [rows]: any = await pool.execute('SELECT * FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
    const storedToken = rows[0];

    if (!storedToken) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const userId = storedToken.user_id;
    const familyId = storedToken.family_id;

    // Check if revoked -> replay attack
    if (storedToken.is_revoked) {
      // Revoke the entire family
      await pool.execute('UPDATE refresh_tokens SET is_revoked = true WHERE family_id = ?', [familyId]);
      securityLogger.replayAttack({ ip: req.ip ?? 'unknown', userId });
      return res.status(401).json({ success: false, message: 'Token compromised. Please login again.' });
    }

    if (new Date(storedToken.expires_at) < new Date()) {
      await pool.execute('DELETE FROM refresh_tokens WHERE id = ?', [storedToken.id]);
      securityLogger.expiredTokenUsed({ ip: req.ip ?? 'unknown', userId });
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    // Determine user role
    const [userRows]: any = await pool.execute('SELECT role FROM users WHERE id = ?', [userId]);
    let role = userRows[0]?.role;
    if (!role) {
      const [adminRows]: any = await pool.execute('SELECT username FROM admin_accounts WHERE id = ? OR username = ?', [userId, userId]);
      if (adminRows.length > 0) role = 'admin';
    }

    if (!role) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    // Mark current token as revoked instead of deleting it
    await pool.execute('UPDATE refresh_tokens SET is_revoked = true WHERE id = ?', [storedToken.id]);

    // Issue new tokens
    const newAccessToken = generateToken({
      sub: userId,
      role: role,
      tokenVersion: 3
    });
    const newRefreshToken = generateOpaqueToken();
    const newTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at) VALUES (?, ?, ?, ?)',
      [userId, newTokenHash, familyId, expiresAt]
    );

    securityLogger.tokenRefreshed({ ip: req.ip ?? 'unknown', userId });
    res.json({ success: true, token: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    next(error);
  }
});

// POST /api/auth/logout - Logout and Revoke Session
router.post('/logout', authenticate, validateRequest(logoutSchema), async (req: any, res, next) => {
  try {
    const userId = req.user?.userId;
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await pool.execute('DELETE FROM refresh_tokens WHERE token_hash = ? AND user_id = ?', [tokenHash, userId]);
    } else {
      await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    }

    securityLogger.logout({ ip: req.ip ?? 'unknown', userId, globalRevoke: !refreshToken });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    next(error);
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req: any, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized.'
      });
    }

    const user = await getCurrentUser(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    next(error);
  }
});

// POST /api/auth/verify - Verify token
router.post('/verify', authenticate, (req: any, res) => {
  res.json({
    success: true,
    message: 'Token is valid.',
    user: req.user
  });
});

// PUT /api/auth/password - Change password
router.put('/password', authenticate, validateRequest(changePasswordSchema), async (req: any, res, next) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    await changePassword(userId, currentPassword, newPassword);

    securityLogger.passwordChanged({ ip: req.ip ?? 'unknown', userId });
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    if (error.message === 'Incorrect current password') {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password'
      });
    }
    console.error('Change password error:', error);
    next(error);
  }
});

// PUT /api/auth/profile - Update profile details
router.put('/profile', authenticate, validateRequest(updateProfileSchema), async (req: any, res, next) => {
  try {
    const userId = req.user?.userId;
    const updateData = req.body; // name, email, etc.

    // Handle Admin Profile Update
    if (userId.startsWith('admin_')) {
      const dbId = userId.replace('admin_', '');

      // Admins in admin_accounts might only have 'username'. 
      // If user is trying to update 'email', we treat it as updating 'username'.
      // Name updates might not be supported if column missing, so we ignore 'name' or try best effort if we had a service.
      // For now, let's assuming we just update the username if email is provided.

      const newUsername = updateData.email; // Map email input to username for admins

      const updatedAdmin = await updateAdmin(userId, { username: newUsername });

      return res.json({
        success: true,
        message: 'Admin profile updated successfully (Note: Only username/email is updatable for admins)',
        data: updatedAdmin
      });
    }

    // Normal User Update
    // Prevent updating critical fields like role or id or password through this endpoint
    delete updateData.id;
    delete updateData.role;
    delete updateData.password;
    delete updateData.is_active;

    const updatedUser = await updateUser(userId, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    next(error);
  }
});

export default router;