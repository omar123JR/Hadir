import { pool } from '../config/database';

export interface CreateCourseRequest {
  code: string;
  name: string;
  teacher_id?: string;
  description?: string;
}

export interface UpdateCourseRequest {
  code?: string;
  name?: string;
  teacher_id?: string;
  description?: string;
}

// Get all courses
export const getAllCourses = async (search?: string) => {
  try {
    let query = `
      SELECT 
        c.id,
        c.code,
        c.name,
        c.description,
        c.teacher_id,
        u.name AS teacher_name,
        u.department AS teacher_department,
        COUNT(DISTINCT e.student_id) AS students_count,
        COUNT(DISTINCT l.id) AS lectures_count,
        c.created_at,
        c.updated_at
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      LEFT JOIN lectures l ON c.id = l.course_id AND l.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (c.name LIKE ? OR c.code LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const [rows] = await pool.execute<any[]>(query, params);

    return rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      teacher_id: row.teacher_id,
      teacher_name: row.teacher_name,
      teacher_department: row.teacher_department,
      students_count: parseInt(row.students_count) || 0,
      lectures_count: parseInt(row.lectures_count) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting courses:', error);
    throw error;
  }
};

// Get course by ID
export const getCourseById = async (courseId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        c.id,
        c.code,
        c.name,
        c.description,
        c.teacher_id,
        u.name AS teacher_name,
        u.department AS teacher_department,
        c.created_at,
        c.updated_at
       FROM courses c
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE c.id = ? AND c.deleted_at IS NULL`,
      [courseId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];

    // Get enrolled students
    const [enrollments] = await pool.execute<any[]>(
      `SELECT student_id FROM enrollments 
       WHERE course_id = ? AND status = 'active'`,
      [courseId]
    );

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      teacher_id: row.teacher_id,
      teacher_name: row.teacher_name,
      teacher_department: row.teacher_department,
      students: enrollments.map((e: any) => e.student_id),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error) {
    console.error('Error getting course:', error);
    throw error;
  }
};

// Create course
export const createCourse = async (courseData: CreateCourseRequest) => {
  try {
    // Check if code already exists
    const [existing] = await pool.execute<any[]>(
      `SELECT id FROM courses WHERE code = ? AND deleted_at IS NULL`,
      [courseData.code]
    );

    if (existing.length > 0) {
      throw new Error('Course code already exists');
    }

    // Validate teacher if provided
    if (courseData.teacher_id) {
      const [teacher] = await pool.execute<any[]>(
        `SELECT id FROM users WHERE id = ? AND role = 'teacher' AND deleted_at IS NULL`,
        [courseData.teacher_id]
      );

      if (teacher.length === 0) {
        throw new Error('Teacher not found');
      }
    }

    const courseId = `course_${Date.now()}`;

    await pool.execute(
      `INSERT INTO courses (id, code, name, teacher_id, description)
       VALUES (?, ?, ?, ?, ?)`,
      [
        courseId,
        courseData.code.toUpperCase(),
        courseData.name,
        courseData.teacher_id || null,
        courseData.description || null,
      ]
    );

    return await getCourseById(courseId);
  } catch (error: any) {
    console.error('Error creating course:', error);
    throw error;
  }
};

// Update course
export const updateCourse = async (courseId: string, courseData: UpdateCourseRequest) => {
  try {
    // Check if course exists
    const existing = await getCourseById(courseId);
    if (!existing) {
      throw new Error('Course not found');
    }

    // Check if code conflicts
    if (courseData.code) {
      const [conflicts] = await pool.execute<any[]>(
        `SELECT id FROM courses 
         WHERE id != ? AND code = ? AND deleted_at IS NULL`,
        [courseId, courseData.code]
      );

      if (conflicts.length > 0) {
        throw new Error('Course code already exists');
      }
    }

    // Validate teacher if provided
    if (courseData.teacher_id) {
      const [teacher] = await pool.execute<any[]>(
        `SELECT id FROM users WHERE id = ? AND role = 'teacher' AND deleted_at IS NULL`,
        [courseData.teacher_id]
      );

      if (teacher.length === 0) {
        throw new Error('Teacher not found');
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (courseData.code !== undefined) {
      updates.push('code = ?');
      params.push(courseData.code.toUpperCase());
    }
    if (courseData.name !== undefined) {
      updates.push('name = ?');
      params.push(courseData.name);
    }
    if (courseData.teacher_id !== undefined) {
      updates.push('teacher_id = ?');
      params.push(courseData.teacher_id || null);
    }
    if (courseData.description !== undefined) {
      updates.push('description = ?');
      params.push(courseData.description || null);
    }

    if (updates.length === 0) {
      return await getCourseById(courseId);
    }

    params.push(courseId);

    await pool.execute(
      `UPDATE courses SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`,
      params
    );

    return await getCourseById(courseId);
  } catch (error: any) {
    console.error('Error updating course:', error);
    throw error;
  }
};

// Delete course (soft delete)
export const deleteCourse = async (courseId: string) => {
  try {
    const [result] = await pool.execute<any>(
      `UPDATE courses SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`,
      [courseId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Course not found');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

// Get courses by teacher ID
export const getCoursesByTeacherId = async (teacherId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        c.id,
        c.code,
        c.name,
        c.description,
        c.teacher_id,
        u.name AS teacher_name,
        u.department AS teacher_department,
        COUNT(DISTINCT e.student_id) AS students_count,
        COUNT(DISTINCT l.id) AS lectures_count,
        c.created_at,
        c.updated_at
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      LEFT JOIN lectures l ON c.id = l.course_id AND l.deleted_at IS NULL
      WHERE c.teacher_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id ORDER BY c.created_at DESC`,
      [teacherId]
    );

    return rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      teacher_id: row.teacher_id,
      teacher_name: row.teacher_name,
      teacher_department: row.teacher_department,
      students_count: parseInt(row.students_count) || 0,
      lectures_count: parseInt(row.lectures_count) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting courses by teacher:', error);
    throw error;
  }
};

// Get courses by student ID
export const getCoursesByStudentId = async (studentId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        c.id,
        c.code,
        c.name,
        c.description,
        c.teacher_id,
        u.name AS teacher_name,
        u.department AS teacher_department,
        COUNT(DISTINCT e2.student_id) AS students_count,
        COUNT(DISTINCT l.id) AS lectures_count,
        c.created_at,
        c.updated_at
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      LEFT JOIN enrollments e2 ON c.id = e2.course_id AND e2.status = 'active'
      LEFT JOIN lectures l ON c.id = l.course_id AND l.deleted_at IS NULL
      WHERE e.student_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id ORDER BY c.created_at DESC`,
      [studentId]
    );

    return rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      teacher_id: row.teacher_id,
      teacher_name: row.teacher_name,
      teacher_department: row.teacher_department,
      students_count: parseInt(row.students_count) || 0,
      lectures_count: parseInt(row.lectures_count) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting courses by student:', error);
    throw error;
  }
};

// Get enrolled students for a specific course
export const getEnrolledStudents = async (courseId: string) => {
  try {
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.student_id,
        e.enrolled_at
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.course_id = ? AND e.status = 'active' AND u.role = 'student'
      ORDER BY e.enrolled_at DESC
    `;

    const [rows] = await pool.execute<any[]>(query, [courseId]);

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      student_id: row.student_id,
      enrollment_date: row.enrolled_at,
    }));
  } catch (error) {
    console.error('Error getting enrolled students:', error);
    throw error;
  }
};