import { pool } from '../config/database';

// Assign teacher to course
export const assignTeacher = async (courseId: string, teacherId: string) => {
  try {
    // Check if course exists
    const [course] = await pool.execute<any[]>(
      `SELECT id FROM courses WHERE id = ? AND deleted_at IS NULL`,
      [courseId]
    );

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    // Check if teacher exists and is a teacher
    const [teacher] = await pool.execute<any[]>(
      `SELECT id, name FROM users 
       WHERE id = ? AND role = 'teacher' AND deleted_at IS NULL AND is_active = 1`,
      [teacherId]
    );

    if (teacher.length === 0) {
      throw new Error('Teacher not found or inactive');
    }

    // Update course teacher
    await pool.execute(
      `UPDATE courses SET teacher_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [teacherId, courseId]
    );

    return {
      success: true,
      teacher: {
        id: teacher[0].id,
        name: teacher[0].name,
      },
    };
  } catch (error: any) {
    console.error('Error assigning teacher:', error);
    throw error;
  }
};

// Enroll student in course
export const enrollStudent = async (courseId: string, studentId: string) => {
  try {
    // Check if course exists
    const [course] = await pool.execute<any[]>(
      `SELECT id FROM courses WHERE id = ? AND deleted_at IS NULL`,
      [courseId]
    );

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    // Check if student exists
    const [student] = await pool.execute<any[]>(
      `SELECT id, name FROM users 
       WHERE id = ? AND role = 'student' AND deleted_at IS NULL AND is_active = 1`,
      [studentId]
    );

    if (student.length === 0) {
      throw new Error('Student not found or inactive');
    }

    // Check if already enrolled
    const [existing] = await pool.execute<any[]>(
      `SELECT id FROM enrollments 
       WHERE course_id = ? AND student_id = ? AND status = 'active'`,
      [courseId, studentId]
    );

    if (existing.length > 0) {
      throw new Error('Student already enrolled');
    }

    // Enroll student
    await pool.execute(
      `INSERT INTO enrollments (course_id, student_id, status)
       VALUES (?, ?, 'active')`,
      [courseId, studentId]
    );

    return {
      success: true,
      student: {
        id: student[0].id,
        name: student[0].name,
      },
    };
  } catch (error: any) {
    console.error('Error enrolling student:', error);
    throw error;
  }
};

// Unenroll student from course
export const unenrollStudent = async (courseId: string, studentId: string) => {
  try {
    const [result] = await pool.execute<any>(
      `UPDATE enrollments SET status = 'dropped'
       WHERE course_id = ? AND student_id = ? AND status = 'active'`,
      [courseId, studentId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Enrollment not found');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error unenrolling student:', error);
    throw error;
  }
};

// Get course enrollments
export const getCourseEnrollments = async (courseId: string) => {
  try {
    const [enrollments] = await pool.execute<any[]>(
      `SELECT 
        e.student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.student_id AS student_number,
        e.enrolled_at,
        e.status
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       WHERE e.course_id = ? AND e.status = 'active'
       ORDER BY e.enrolled_at DESC`,
      [courseId]
    );

    return enrollments;
  } catch (error) {
    console.error('Error getting enrollments:', error);
    throw error;
  }
};

// Bulk enroll students
export const bulkEnrollStudents = async (courseId: string, studentIds: string[]) => {
  try {
    // Check if course exists
    const [course] = await pool.execute<any[]>(
      `SELECT id FROM courses WHERE id = ? AND deleted_at IS NULL`,
      [courseId]
    );

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    const results = {
      success: [] as string[],
      failed: [] as { studentId: string; error: string }[],
    };

    for (const studentId of studentIds) {
      try {
        await enrollStudent(courseId, studentId);
        results.success.push(studentId);
      } catch (error: any) {
        results.failed.push({
          studentId,
          error: error.message,
        });
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error bulk enrolling students:', error);
    throw error;
  }
};
