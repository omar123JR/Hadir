import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { pool } from '../config/database';
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, JWT_ISSUER, JWT_AUDIENCE } from '../config/jwt';
import { LoginRequest, LoginResponse, User, UserWithPassword, JwtPayload } from '../types';

// ─────────────────────────────────────────────────────────────
//  Password utilities
// ─────────────────────────────────────────────────────────────
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (plain: string, hashed: string): Promise<boolean> =>
  bcrypt.compare(plain, hashed);

// ─────────────────────────────────────────────────────────────
//  JWT
// ─────────────────────────────────────────────────────────────
export const generateToken = (payload: Pick<JwtPayload, 'sub' | 'role' | 'tokenVersion'>): string => {
  const options: SignOptions = { 
    expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const generateOpaqueToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// ─────────────────────────────────────────────────────────────
//  Find user
//  Accepts: email (IDnumber@example.com), student_id, teacher_code, or users.id
// ─────────────────────────────────────────────────────────────
export const findUserByIdentifier = async (identifier: string): Promise<UserWithPassword | null> => {
  const [rows] = await pool.execute<any[]>(
    `SELECT id, name, email, password_hash, role,
            student_id, teacher_code, department, avatar, is_active
     FROM users
     WHERE (
       email        = ? OR
       student_id   = ? OR
       teacher_code = ? OR
       id           = ?
     )
     AND deleted_at IS NULL
     LIMIT 1`,
    [identifier, identifier, identifier, identifier]
  );
  if (!rows.length) return null;
  const u = rows[0];
  return {
    id:           u.id,
    name:         u.name,
    email:        u.email,
    password_hash: u.password_hash,
    role:         u.role,
    student_id:   u.student_id,
    teacher_code: u.teacher_code,
    department:   u.department,
    avatar:       u.avatar,
    is_active:    u.is_active,
  };
};

// ─────────────────────────────────────────────────────────────
//  Find admin by username
// ─────────────────────────────────────────────────────────────
export const findAdminByUsername = async (username: string): Promise<any | null> => {
  const [rows] = await pool.execute<any[]>(
    `SELECT * FROM admin_accounts WHERE username = ? AND is_active = 1 LIMIT 1`,
    [username]
  );
  return rows.length ? rows[0] : null;
};

// ─────────────────────────────────────────────────────────────
//  Login
// ─────────────────────────────────────────────────────────────
export const login = async (loginData: LoginRequest): Promise<LoginResponse> => {
  try {
    const { identifier, password } = loginData;

    // ── 1. Try admin table first ──────────────────────────────
    const admin = await findAdminByUsername(identifier);
    if (admin) {
      const ok = await comparePassword(password, admin.password_hash);
      if (!ok) return { success: false, message: 'بيانات الدخول غير صحيحة.', error: 'INVALID_CREDENTIALS' };

      const user: User = {
        id:         `admin_${admin.id}`,
        name:       'مدير النظام',
        email:      admin.username,
        role:       'admin',
        department: null,
        avatar:     null,
      };
      const token = generateToken({ sub: user.id, role: user.role, tokenVersion: 3 });
      const refreshToken = generateOpaqueToken();
      const tokenHash = hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      await pool.execute(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [user.id, tokenHash, expiresAt]
      );
      return { success: true, message: 'تم تسجيل الدخول بنجاح.', token, refreshToken, user };
    }

    // ── 2. Try users table ────────────────────────────────────
    const userRow = await findUserByIdentifier(identifier);
    if (!userRow) {
      return { success: false, message: 'المستخدم غير موجود.', error: 'USER_NOT_FOUND' };
    }

    if (!userRow.is_active) {
      return { success: false, message: 'الحساب معطّل، تواصل مع المسؤول.', error: 'ACCOUNT_DEACTIVATED' };
    }

    // Check password
    const passwordOk = await comparePassword(password, userRow.password_hash);

    if (!passwordOk) {
      return { success: false, message: 'بيانات الدخول غير صحيحة.', error: 'INVALID_CREDENTIALS' };
    }

    const user: User = {
      id:           userRow.id,
      name:         userRow.name,
      email:        userRow.email,
      role:         userRow.role,
      student_id:   userRow.student_id,
      teacher_code: userRow.teacher_code,
      department:   userRow.department,
      avatar:       userRow.avatar,
    };

    const token = generateToken({ sub: user.id, role: user.role, tokenVersion: 3 });
    const refreshToken = generateOpaqueToken();
    const tokenHash = hashToken(refreshToken);
    const familyId = require('crypto').randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, tokenHash, familyId, expiresAt]
    );
    return { success: true, message: 'تم تسجيل الدخول بنجاح.', token, refreshToken, user };

  } catch (err: any) {
    console.error('LOGIN ERROR:', err);
    return { success: false, message: 'حدث خطأ داخلي أثناء تسجيل الدخول.', error: 'INTERNAL_ERROR' };
  }
};

// ─────────────────────────────────────────────────────────────
//  Get current user (by JWT userId)
// ─────────────────────────────────────────────────────────────
export const getCurrentUser = async (userId: string): Promise<User | null> => {
  // Admin
  if (userId.startsWith('admin_')) {
    const dbId = userId.replace('admin_', '');
    const [rows] = await pool.execute<any[]>(
      'SELECT * FROM admin_accounts WHERE id = ? AND is_active = 1', [dbId]
    );
    if (!rows.length) return null;
    return { id: userId, name: 'مدير النظام', email: rows[0].username, role: 'admin', department: null, avatar: null };
  }

  // Normal user
  const [rows] = await pool.execute<any[]>(
    `SELECT id, name, email, role, student_id, teacher_code, department, avatar
     FROM users WHERE id = ? AND deleted_at IS NULL AND is_active = 1`,
    [userId]
  );
  return rows.length ? rows[0] : null;
};

// ─────────────────────────────────────────────────────────────
//  Change password
// ─────────────────────────────────────────────────────────────
export const changePassword = async (userId: string, currentPw: string, newPw: string): Promise<void> => {
  if (userId.startsWith('admin_')) {
    const dbId = userId.replace('admin_', '');
    const [rows] = await pool.execute<any[]>('SELECT password_hash FROM admin_accounts WHERE id=?', [dbId]);
    if (!rows.length) throw new Error('User not found');
    if (!(await comparePassword(currentPw, rows[0].password_hash))) throw new Error('Incorrect current password');
    await pool.execute('UPDATE admin_accounts SET password_hash=? WHERE id=?', [await hashPassword(newPw), dbId]);
  } else {
    const [rows] = await pool.execute<any[]>('SELECT password_hash FROM users WHERE id=?', [userId]);
    if (!rows.length) throw new Error('User not found');
    if (!(await comparePassword(currentPw, rows[0].password_hash))) throw new Error('Incorrect current password');
    await pool.execute('UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [await hashPassword(newPw), userId]);
  }
};

// ─────────────────────────────────────────────────────────────
//  Update admin username
// ─────────────────────────────────────────────────────────────
export const updateAdmin = async (adminId: string, updates: { username?: string }): Promise<any> => {
  const dbId = adminId.replace('admin_', '');
  if (updates.username) {
    const [ex] = await pool.execute<any[]>('SELECT id FROM admin_accounts WHERE username=? AND id!=?', [updates.username, dbId]);
    if (ex.length) throw new Error('اسم المستخدم محجوز مسبقاً');
    await pool.execute('UPDATE admin_accounts SET username=? WHERE id=?', [updates.username, dbId]);
  }
  const [rows] = await pool.execute<any[]>('SELECT * FROM admin_accounts WHERE id=?', [dbId]);
  if (!rows.length) return null;
  return { id: `admin_${rows[0].id}`, name: 'مدير النظام', email: rows[0].username, role: 'admin', department: null };
};
