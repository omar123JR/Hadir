import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/authenticate';
import { pool } from '../config/database';

const router = Router();

// Helper function to verify TOTP code (RFC 6238 standard)
function verifyTOTP(secret: string, token: string): boolean {
  const window = 30; // 30s window
  const now = Math.floor(Date.now() / 1000);
  
  for (let offset = -1; offset <= 1; offset++) {
    const timeSlice = Math.floor(now / window) + offset;
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'utf-8'));
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(timeSlice));
    hmac.update(timeBuffer);
    const hash = hmac.digest();
    
    const offsetByte = hash[hash.length - 1] & 0xf;
    const binary = ((hash[offsetByte] & 0x7f) << 24) |
                   ((hash[offsetByte + 1] & 0xff) << 16) |
                   ((hash[offsetByte + 2] & 0xff) << 8) |
                   (hash[offsetByte + 3] & 0xff);
    
    const otp = (binary % 1000000).toString().padStart(6, '0');
    if (otp === token.trim()) {
      return true;
    }
  }
  return false;
}

router.use(authenticate);

// 1. GET /api/security/status - Get current 2FA and session status
router.get('/status', async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.execute<any[]>(
      `SELECT two_factor_enabled, token_version FROM users WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    res.json({
      success: true,
      data: {
        twoFactorEnabled: Boolean(rows[0].two_factor_enabled),
        tokenVersion: rows[0].token_version,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST /api/security/2fa/generate - Generate 2FA secret
router.post('/2fa/generate', async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.execute<any[]>(`SELECT email FROM users WHERE id = ?`, [userId]);
    const email = rows[0]?.email || 'user@hadir.edu';

    // Generate random 20-character secret
    const secret = crypto.randomBytes(10).toString('hex').toUpperCase();
    const otpauthUrl = `otpauth://totp/Hadir:${email}?secret=${secret}&issuer=Hadir%20LMS`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    res.json({
      success: true,
      data: {
        secret,
        qrCodeUrl,
        email,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/security/2fa/verify-and-enable
router.post('/2fa/verify-and-enable', async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { secret, token } = req.body;

    if (!secret || !token) {
      return res.status(400).json({ success: false, message: 'المفتاح السري وكود التحقق حقول مطلوبة' });
    }

    const isValid = verifyTOTP(secret, token);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح أو انتهت صلاحيته' });
    }

    await pool.execute(
      `UPDATE users SET two_factor_secret = ?, two_factor_enabled = TRUE WHERE id = ?`,
      [secret, userId]
    );

    res.json({
      success: true,
      message: 'تم تفعيل المصادقة الثنائية (2FA) بنجاح لحماية حسابك!'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. POST /api/security/2fa/disable
router.post('/2fa/disable', async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'كلمة المرور مطلوبة لإلغاء تفعيل 2FA' });
    }

    const [rows] = await pool.execute<any[]>(`SELECT password FROM users WHERE id = ?`, [userId]);
    const valid = await bcrypt.compare(password, rows[0]?.password || '');
    if (!valid) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }

    await pool.execute(
      `UPDATE users SET two_factor_secret = NULL, two_factor_enabled = FALSE WHERE id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: 'تم إلغاء تفعيل المصادقة الثنائية بنجاح'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. POST /api/security/revoke-all-sessions - Log out everywhere else
router.post('/revoke-all-sessions', async (req: any, res) => {
  try {
    const userId = req.user.userId;
    await pool.execute(
      `UPDATE users SET token_version = token_version + 1 WHERE id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح من كافة الأجهزة والمتصفحات الأخرى.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
