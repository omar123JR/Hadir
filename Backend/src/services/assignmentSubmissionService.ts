import { pool } from '../config/database';

export interface SubmitAssignmentRequest {
  file_url?: string;
  file_name?: string;
  file_size?: string;
}

export interface GradeAssignmentRequest {
  grade: string;
  percentage?: number;
  feedback?: string;
}

export interface AssignmentSubmission {
  id: number;
  assignment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_number: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: string | null;
  submitted_at: string | null;
  grade: string | null;
  percentage: number | null;
  feedback: string | null;
  status: 'pending' | 'submitted' | 'graded' | 'missed';
  created_at: string;
  updated_at: string;
}

// Submit assignment
export const submitAssignment = async (
  studentId: string,
  assignmentId: string,
  submissionData: SubmitAssignmentRequest
): Promise<AssignmentSubmission> => {
  try {
    // Verify assignment exists
    const [assignment] = await pool.execute<any[]>(
      `SELECT id, course_id, due_date
       FROM assignments
       WHERE id = ? AND deleted_at IS NULL`,
      [assignmentId]
    );

    if (assignment.length === 0) {
      throw new Error('Assignment not found');
    }

    // Check if student is enrolled in the course
    const [enrollment] = await pool.execute<any[]>(
      `SELECT id FROM enrollments
       WHERE course_id = ? AND student_id = ? AND status = 'active'`,
      [assignment[0].course_id, studentId]
    );

    if (enrollment.length === 0) {
      throw new Error('You are not enrolled in this course');
    }

    // Check if already submitted
    const [existing] = await pool.execute<any[]>(
      `SELECT id FROM assignment_submissions
       WHERE assignment_id = ? AND student_id = ?`,
      [assignmentId, studentId]
    );

    // Determine status
    const dueDate = new Date(assignment[0].due_date);
    const now = new Date();
    let status: 'submitted' | 'missed' = 'submitted';
    
    if (dueDate < now) {
      status = 'missed';
    }

    if (existing.length > 0) {
      // Update existing submission
      await pool.execute(
        `UPDATE assignment_submissions
         SET file_url = ?,
             file_name = ?,
             submitted_at = CURRENT_TIMESTAMP,
             status = ?
         WHERE assignment_id = ? AND student_id = ?`,
        [
          submissionData.file_url || null,
          submissionData.file_name || null,
          status,
          assignmentId,
          studentId,
        ]
      );
    } else {
      // Create new submission
      await pool.execute(
        `INSERT INTO assignment_submissions
         (assignment_id, student_id, file_url, file_name, submitted_at, status)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        [
          assignmentId,
          studentId,
          submissionData.file_url || null,
          submissionData.file_name || null,
          status,
        ]
      );
    }

    // Get the submission
    const [submission] = await pool.execute<any[]>(
      `SELECT 
        asub.id,
        asub.assignment_id,
        asub.student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.student_id AS student_number,
        asub.file_url,
        asub.file_name,
        asub.submitted_at,
        asub.grade,
        asub.percentage,
        asub.feedback,
        asub.status
       FROM assignment_submissions asub
       JOIN users u ON asub.student_id = u.id
       WHERE asub.assignment_id = ? AND asub.student_id = ?`,
      [assignmentId, studentId]
    );

    if (submission.length === 0) {
      throw new Error('Failed to retrieve submission');
    }

    const row = submission[0];
    return {
      id: row.id,
      assignment_id: row.assignment_id,
      student_id: row.student_id,
      student_name: row.student_name,
      student_email: row.student_email,
      student_number: row.student_number,
      file_url: row.file_url,
      file_name: row.file_name,
      file_size: null,
      submitted_at: row.submitted_at,
      grade: row.grade,
      percentage: row.percentage,
      feedback: row.feedback,
      status: row.status,
      created_at: row.submitted_at,
      updated_at: row.submitted_at,
    };
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    throw error;
  }
};

// Get student submission for an assignment
export const getStudentSubmission = async (studentId: string, assignmentId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        asub.id,
        asub.assignment_id,
        asub.student_id,
        asub.file_url,
        asub.file_name,
        asub.submitted_at,
        asub.grade,
        asub.percentage,
        asub.feedback,
        asub.status
       FROM assignment_submissions asub
       WHERE asub.assignment_id = ? AND asub.student_id = ?`,
      [assignmentId, studentId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      assignment_id: row.assignment_id,
      student_id: row.student_id,
      file_url: row.file_url,
      file_name: row.file_name,
      file_size: null,
      submitted_at: row.submitted_at,
      grade: row.grade,
      percentage: row.percentage,
      feedback: row.feedback,
      status: row.status,
      created_at: row.submitted_at,
      updated_at: row.submitted_at,
    };
  } catch (error) {
    console.error('Error getting student submission:', error);
    throw error;
  }
};

// Get all submissions for an assignment (teacher view)
export const getAssignmentSubmissions = async (assignmentId: string, teacherId: string) => {
  try {
    // Verify assignment belongs to teacher
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
      throw new Error('You are not authorized to view these submissions');
    }

    const [rows] = await pool.execute<any[]>(
      `SELECT 
        asub.id,
        asub.assignment_id,
        asub.student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.student_id AS student_number,
        asub.file_url,
        asub.file_name,
        asub.submitted_at,
        asub.grade,
        asub.percentage,
        asub.feedback,
        asub.status
       FROM assignment_submissions asub
       JOIN users u ON asub.student_id = u.id
       WHERE asub.assignment_id = ?
       ORDER BY asub.submitted_at DESC`,
      [assignmentId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      assignment_id: row.assignment_id,
      student_id: row.student_id,
      student_name: row.student_name,
      student_email: row.student_email,
      student_number: row.student_number,
      file_url: row.file_url,
      file_name: row.file_name,
      file_size: null,
      submitted_at: row.submitted_at,
      grade: row.grade,
      percentage: row.percentage,
      feedback: row.feedback,
      status: row.status,
      created_at: row.submitted_at,
      updated_at: row.submitted_at,
    }));
  } catch (error: any) {
    console.error('Error getting assignment submissions:', error);
    throw error;
  }
};

// Grade assignment submission
export const gradeSubmission = async (
  submissionId: number,
  teacherId: string,
  gradeData: GradeAssignmentRequest
): Promise<AssignmentSubmission> => {
  try {
    // Verify submission exists and teacher owns the assignment
    const [submission] = await pool.execute<any[]>(
      `SELECT asub.id, asub.assignment_id, c.teacher_id
       FROM assignment_submissions asub
       JOIN assignments a ON asub.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE asub.id = ?`,
      [submissionId]
    );

    if (submission.length === 0) {
      throw new Error('Submission not found');
    }

    if (submission[0].teacher_id !== teacherId) {
      throw new Error('You are not authorized to grade this submission');
    }

    if (!gradeData.grade) {
      throw new Error('Grade is required');
    }

    await pool.execute(
      `UPDATE assignment_submissions
       SET grade = ?,
           percentage = ?,
           feedback = ?,
           status = 'graded',
           graded_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        gradeData.grade,
        gradeData.percentage || null,
        gradeData.feedback || null,
        submissionId,
      ]
    );

    // Get the updated submission
    const [updated] = await pool.execute<any[]>(
      `SELECT 
        asub.id,
        asub.assignment_id,
        asub.student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.student_id AS student_number,
        asub.file_url,
        asub.file_name,
        asub.submitted_at,
        asub.grade,
        asub.percentage,
        asub.feedback,
        asub.status
       FROM assignment_submissions asub
       JOIN users u ON asub.student_id = u.id
       WHERE asub.id = ?`,
      [submissionId]
    );

    if (updated.length === 0) {
      throw new Error('Failed to retrieve updated submission');
    }

    const row = updated[0];
    return {
      id: row.id,
      assignment_id: row.assignment_id,
      student_id: row.student_id,
      student_name: row.student_name,
      student_email: row.student_email,
      student_number: row.student_number,
      file_url: row.file_url,
      file_name: row.file_name,
      file_size: null,
      submitted_at: row.submitted_at,
      grade: row.grade,
      percentage: row.percentage,
      feedback: row.feedback,
      status: row.status,
      created_at: row.submitted_at,
      updated_at: row.submitted_at,
    };
  } catch (error: any) {
    console.error('Error grading submission:', error);
    throw error;
  }
};