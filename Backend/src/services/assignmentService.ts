import { pool } from '../config/database';

export interface CreateAssignmentRequest {
  course_id: string;
  title: string;
  description?: string;
  due_date: string; // YYYY-MM-DD HH:MM:SS or YYYY-MM-DD
  file_url?: string;
  file_name?: string;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  due_date?: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  course_name?: string;
  course_code?: string;
  title: string;
  description: string | null;
  due_date: string;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  updated_at: string;
  submitted_count?: number;
  total_students?: number;
  graded_count?: number;
}

// Get assignments for a course
export const getCourseAssignments = async (courseId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        a.id,
        a.course_id,
        c.name AS course_name,
        c.code AS course_code,
        a.title,
        a.description,
        a.due_date,
        a.file_url,
        a.file_name,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT e.student_id) AS total_students,
        COUNT(DISTINCT CASE WHEN asub.status = 'submitted' OR asub.status = 'graded' THEN asub.student_id END) AS submitted_count,
        COUNT(DISTINCT CASE WHEN asub.status = 'graded' THEN asub.student_id END) AS graded_count
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       LEFT JOIN enrollments e ON a.course_id = e.course_id AND e.status = 'active'
       LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
       WHERE a.course_id = ? AND a.deleted_at IS NULL
       GROUP BY a.id
       ORDER BY a.due_date ASC, a.created_at DESC`,
      [courseId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      course_id: row.course_id,
      course_name: row.course_name,
      course_code: row.course_code,
      title: row.title,
      description: row.description,
      due_date: row.due_date,
      file_url: row.file_url,
      file_name: row.file_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_students: parseInt(row.total_students) || 0,
      submitted_count: parseInt(row.submitted_count) || 0,
      graded_count: parseInt(row.graded_count) || 0,
    }));
  } catch (error) {
    console.error('Error getting course assignments:', error);
    throw error;
  }
};

// Get assignment by ID
export const getAssignmentById = async (assignmentId: string): Promise<Assignment | null> => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        a.id,
        a.course_id,
        c.name AS course_name,
        c.code AS course_code,
        a.title,
        a.description,
        a.due_date,
        a.file_url,
        a.file_name,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT e.student_id) AS total_students,
        COUNT(DISTINCT CASE WHEN asub.status = 'submitted' OR asub.status = 'graded' THEN asub.student_id END) AS submitted_count,
        COUNT(DISTINCT CASE WHEN asub.status = 'graded' THEN asub.student_id END) AS graded_count
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       LEFT JOIN enrollments e ON a.course_id = e.course_id AND e.status = 'active'
       LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
       WHERE a.id = ? AND a.deleted_at IS NULL
       GROUP BY a.id`,
      [assignmentId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      course_id: row.course_id,
      course_name: row.course_name,
      course_code: row.course_code,
      title: row.title,
      description: row.description,
      due_date: row.due_date,
      file_url: row.file_url,
      file_name: row.file_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_students: parseInt(row.total_students) || 0,
      submitted_count: parseInt(row.submitted_count) || 0,
      graded_count: parseInt(row.graded_count) || 0,
    };
  } catch (error) {
    console.error('Error getting assignment:', error);
    throw error;
  }
};

// Get all assignments for a teacher
export const getTeacherAssignments = async (teacherId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        a.id,
        a.course_id,
        c.name AS course_name,
        c.code AS course_code,
        a.title,
        a.description,
        a.due_date,
        a.file_url,
        a.file_name,
        a.created_at,
        a.updated_at,
        COUNT(DISTINCT e.student_id) AS total_students,
        COUNT(DISTINCT CASE WHEN asub.status = 'submitted' OR asub.status = 'graded' THEN asub.student_id END) AS submitted_count,
        COUNT(DISTINCT CASE WHEN asub.status = 'graded' THEN asub.student_id END) AS graded_count
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       LEFT JOIN enrollments e ON a.course_id = e.course_id AND e.status = 'active'
       LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
       WHERE c.teacher_id = ? AND a.deleted_at IS NULL AND c.deleted_at IS NULL
       GROUP BY a.id
       ORDER BY a.due_date ASC, a.created_at DESC`,
      [teacherId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      course_id: row.course_id,
      course_name: row.course_name,
      course_code: row.course_code,
      title: row.title,
      description: row.description,
      due_date: row.due_date,
      file_url: row.file_url,
      file_name: row.file_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_students: parseInt(row.total_students) || 0,
      submitted_count: parseInt(row.submitted_count) || 0,
      graded_count: parseInt(row.graded_count) || 0,
    }));
  } catch (error) {
    console.error('Error getting teacher assignments:', error);
    throw error;
  }
};

// Get student assignments (for enrolled courses)
export const getStudentAssignments = async (studentId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        a.id,
        a.course_id,
        c.name AS course_name,
        c.code AS course_code,
        a.title,
        a.description,
        a.due_date,
        a.file_url,
        a.file_name,
        a.created_at,
        a.updated_at,
        asub.id AS submission_id,
        asub.status AS submission_status,
        asub.grade,
        asub.percentage,
        asub.submitted_at
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       JOIN enrollments e ON a.course_id = e.course_id AND e.student_id = ?
       LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id AND asub.student_id = ?
       WHERE a.deleted_at IS NULL AND e.status = 'active'
       ORDER BY a.due_date ASC, a.created_at DESC`,
      [studentId, studentId]
    );

    return rows.map((row: any) => {
      // Determine display status
      let status: 'pending' | 'submitted' | 'graded' | 'missed' = 'pending';
      const dueDate = new Date(row.due_date);
      const now = new Date();

      if (row.submission_status === 'graded') {
        status = 'graded';
      } else if (row.submission_status === 'submitted') {
        status = 'submitted';
      } else if (dueDate < now && !row.submission_id) {
        status = 'missed';
      }

      return {
        id: row.id,
        course_id: row.course_id,
        course_name: row.course_name,
        course_code: row.course_code,
        title: row.title,
        description: row.description,
        due_date: row.due_date,
        file_url: row.file_url,
        file_name: row.file_name,
        status,
        grade: row.grade,
        percentage: row.percentage,
        submitted_at: row.submitted_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });
  } catch (error) {
    console.error('Error getting student assignments:', error);
    throw error;
  }
};

// Create assignment
export const createAssignment = async (
  teacherId: string,
  assignmentData: CreateAssignmentRequest
): Promise<Assignment> => {
  try {
    // Verify course exists and teacher is assigned to it
    const [course] = await pool.execute<any[]>(
      `SELECT id, code, name, teacher_id
       FROM courses
       WHERE id = ? AND deleted_at IS NULL`,
      [assignmentData.course_id]
    );

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    if (course[0].teacher_id !== teacherId) {
      throw new Error('You are not assigned to this course');
    }

    if (!assignmentData.title || !assignmentData.due_date) {
      throw new Error('Title and due date are required');
    }

    const assignmentId = `assignment_${Date.now()}`;

    await pool.execute(
      `INSERT INTO assignments (id, course_id, title, description, due_date, file_url, file_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId,
        assignmentData.course_id,
        assignmentData.title,
        assignmentData.description || null,
        assignmentData.due_date,
        assignmentData.file_url || null,
        assignmentData.file_name || null,
      ]
    );

    const newAssignment = await getAssignmentById(assignmentId);
    if (!newAssignment) {
      throw new Error('Failed to retrieve the newly created assignment');
    }

    return newAssignment;
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

// Update assignment
export const updateAssignment = async (
  assignmentId: string,
  teacherId: string,
  assignmentData: UpdateAssignmentRequest
): Promise<Assignment> => {
  try {
    // Verify assignment exists and teacher owns the course
    const [assignment] = await pool.execute<any[]>(
      `SELECT a.id, c.teacher_id
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND a.deleted_at IS NULL`,
      [assignmentId]
    );

    if (assignment.length === 0) {
      throw new Error('Assignment not found');
    }

    if (assignment[0].teacher_id !== teacherId) {
      throw new Error('You are not authorized to update this assignment');
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (assignmentData.title !== undefined) {
      updates.push('title = ?');
      params.push(assignmentData.title);
    }
    if (assignmentData.description !== undefined) {
      updates.push('description = ?');
      params.push(assignmentData.description || null);
    }
    if (assignmentData.due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(assignmentData.due_date);
    }

    if (updates.length === 0) {
      const existing = await getAssignmentById(assignmentId);
      if (!existing) {
        throw new Error('Assignment not found');
      }
      return existing;
    }

    params.push(assignmentId);

    await pool.execute(
      `UPDATE assignments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      params
    );

    const updated = await getAssignmentById(assignmentId);
    if (!updated) {
      throw new Error('Failed to retrieve updated assignment');
    }

    return updated;
  } catch (error: any) {
    console.error('Error updating assignment:', error);
    throw error;
  }
};

// Delete assignment (soft delete)
export const deleteAssignment = async (assignmentId: string, teacherId: string) => {
  try {
    // Verify assignment exists and teacher owns the course
    const [assignment] = await pool.execute<any[]>(
      `SELECT a.id, c.teacher_id
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND a.deleted_at IS NULL`,
      [assignmentId]
    );

    if (assignment.length === 0) {
      throw new Error('Assignment not found');
    }

    if (assignment[0].teacher_id !== teacherId) {
      throw new Error('You are not authorized to delete this assignment');
    }

    await pool.execute(
      `UPDATE assignments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [assignmentId]
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
};