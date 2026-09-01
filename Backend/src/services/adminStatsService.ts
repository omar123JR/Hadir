import { pool } from '../config/database';

export interface AdminStats {
  teachers_count: number;
  students_count: number;
  courses_count: number;
  admins_count: number;
}

// Get admin dashboard statistics
export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    const [teachers] = await pool.execute<any[]>(
      `SELECT COUNT(*) as count FROM users 
       WHERE role = 'teacher' AND deleted_at IS NULL AND is_active = 1`
    );

    const [students] = await pool.execute<any[]>(
      `SELECT COUNT(*) as count FROM users 
       WHERE role = 'student' AND deleted_at IS NULL AND is_active = 1`
    );

    const [courses] = await pool.execute<any[]>(
      `SELECT COUNT(*) as count FROM courses 
       WHERE deleted_at IS NULL`
    );

    const [admins] = await pool.execute<any[]>(
      `SELECT COUNT(*) as count FROM admin_accounts 
       WHERE is_active = 1`
    );

    return {
      teachers_count: parseInt(teachers[0].count) || 0,
      students_count: parseInt(students[0].count) || 0,
      courses_count: parseInt(courses[0].count) || 0,
      admins_count: parseInt(admins[0].count) || 0,
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    throw error;
  }
};
