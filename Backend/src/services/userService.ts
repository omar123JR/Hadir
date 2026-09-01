import { pool } from '../config/database';
import { hashPassword } from './authService';
import { User } from '../types';

export interface CreateUserRequest {
  name: string;
  email: string;
  role: 'teacher' | 'student';
  student_id?: string;
  department?: string;
  password?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'teacher' | 'student';
  student_id?: string;
  department?: string;
  is_active?: boolean;
}

// Get all users with filters
export const getAllUsers = async (filters?: {
  role?: 'teacher' | 'student' | 'all';
  search?: string;
}) => {
  try {
    let query = `
      SELECT id, name, email, role, student_id, department, avatar, is_active, created_at
      FROM users
      WHERE deleted_at IS NULL
    `;
    const params: any[] = [];

    // Apply role filter
    if (filters?.role && filters.role !== 'all') {
      query += ` AND role = ?`;
      params.push(filters.role);
    }

    // Apply search filter
    if (filters?.search) {
      query += ` AND (
        name LIKE ? OR 
        email LIKE ? OR 
        student_id LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await pool.execute<any[]>(query, params);

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      student_id: row.student_id,
      department: row.department,
      avatar: row.avatar,
      is_active: row.is_active,
      created_at: row.created_at,
    }));
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT id, name, email, role, student_id, department, avatar, is_active
       FROM users 
       WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      student_id: row.student_id,
      department: row.department,
      avatar: row.avatar,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

// Create user
export const createUser = async (userData: CreateUserRequest) => {
  try {
    // Check if email or student_id already exists
    const [existing] = await pool.execute<any[]>(
      `SELECT id FROM users 
       WHERE (email = ? OR (student_id = ? AND student_id IS NOT NULL)) 
       AND deleted_at IS NULL`,
      [userData.email, userData.student_id || '']
    );

    if (existing.length > 0) {
      throw new Error('Email or student ID already exists');
    }

    // Determine password
    if (!userData.password) {
      throw new Error('A secure password is required for new users');
    }
    const password = userData.password;

    const passwordHash = await hashPassword(password);

    // Generate ID (you can use UUID or auto-increment)
    const userId = userData.student_id || `user_${Date.now()}`;

    await pool.execute(
      `INSERT INTO users (id, name, email, password_hash, role, student_id, department, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userData.name,
        userData.email,
        passwordHash,
        userData.role,
        userData.student_id || null,
        userData.department || null,
        true,
      ]
    );

    return await getUserById(userId);
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Update user
export const updateUser = async (userId: string, userData: UpdateUserRequest) => {
  try {
    // Check if user exists
    const existing = await getUserById(userId);
    if (!existing) {
      throw new Error('User not found');
    }

    // Check if email or student_id conflicts with other users
    if (userData.email || userData.student_id) {
      const [conflicts] = await pool.execute<any[]>(
        `SELECT id FROM users 
         WHERE id != ? 
         AND ((email = ? AND ? IS NOT NULL) OR (student_id = ? AND ? IS NOT NULL))
         AND deleted_at IS NULL`,
        [
          userId,
          userData.email || '',
          userData.email || null,
          userData.student_id || '',
          userData.student_id || null,
        ]
      );

      if (conflicts.length > 0) {
        throw new Error('Email or student ID already exists');
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (userData.name !== undefined) {
      updates.push('name = ?');
      params.push(userData.name);
    }
    if (userData.email !== undefined) {
      updates.push('email = ?');
      params.push(userData.email);
    }
    if (userData.role !== undefined) {
      updates.push('role = ?');
      params.push(userData.role);
    }
    if (userData.student_id !== undefined) {
      updates.push('student_id = ?');
      params.push(userData.student_id || null);
    }
    if (userData.department !== undefined) {
      updates.push('department = ?');
      params.push(userData.department || null);
    }
    if (userData.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(userData.is_active);
    }

    if (updates.length === 0) {
      return await getUserById(userId);
    }

    params.push(userId);

    await pool.execute(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`,
      params
    );

    return await getUserById(userId);
  } catch (error: any) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Delete user (soft delete)
export const deleteUser = async (userId: string) => {
  try {
    const [result] = await pool.execute<any>(
      `UPDATE users SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    );

    if (result.affectedRows === 0) {
      throw new Error('User not found');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Admin reset password
export const adminResetPassword = async (userId: string, newPassword: string) => {
  try {
    const existing = await getUserById(userId);
    if (!existing) {
      throw new Error('User not found');
    }
    const passwordHash = await hashPassword(newPassword);
    await pool.execute(
      `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`,
      [passwordHash, userId]
    );
    return { success: true };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    throw error;
  }
};
