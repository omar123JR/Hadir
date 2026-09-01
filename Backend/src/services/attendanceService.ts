import { pool } from '../config/database';
import crypto from 'crypto';

export interface CreateAttendanceSessionRequest {
  course_id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

export interface AttendanceSession {
  id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  date: string;
  time: string;
  qr_code: string;
  status: 'active' | 'closed';
  created_by: string;
  created_at: string;
  closed_at: string | null;
  attendees_count: number;
}

// Generate unique QR code
const generateQRCode = (): string => {
  const randomString = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ATT-${randomString}`;
};

// Create attendance session
export const createAttendanceSession = async (
  teacherId: string,
  sessionData: CreateAttendanceSessionRequest
): Promise<AttendanceSession> => {
  try {
    // Validate course exists and teacher is assigned to it
    const [course] = await pool.execute<any[]>(
      `SELECT c.id, c.code, c.name, c.teacher_id
       FROM courses c
       WHERE c.id = ? AND c.deleted_at IS NULL`,
      [sessionData.course_id]
    );

    if (course.length === 0) {
      throw new Error('Course not found');
    }

    // Check if teacher is assigned to this course
    if (course[0].teacher_id !== teacherId) {
      throw new Error('You are not assigned to this course');
    }

    // Check if there's already an active session for this course today
    const [existingSession] = await pool.execute<any[]>(
      `SELECT id FROM attendance_sessions
       WHERE course_id = ? AND date = ? AND status = 'active'`,
      [sessionData.course_id, sessionData.date]
    );

    if (existingSession.length > 0) {
      throw new Error('An active session already exists for this course today');
    }

    // Generate unique QR code
    let qrCode = generateQRCode();
    let attempts = 0;
    
    // Ensure QR code is unique
    while (attempts < 10) {
      const [existing] = await pool.execute<any[]>(
        `SELECT id FROM attendance_sessions WHERE qr_code = ? AND status = 'active'`,
        [qrCode]
      );
      
      if (existing.length === 0) {
        break;
      }
      
      qrCode = generateQRCode();
      attempts++;
    }

    const sessionId = `session_${Date.now()}`;

    await pool.execute(
      `INSERT INTO attendance_sessions (id, course_id, date, time, qr_code, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [
        sessionId,
        sessionData.course_id,
        sessionData.date,
        sessionData.time,
        qrCode,
        teacherId,
      ]
    );

    return (await getAttendanceSessionById(sessionId))!;
  } catch (error: any) {
    console.error('Error creating attendance session:', error);
    throw error;
  }
};

// Get attendance session by ID
export const getAttendanceSessionById = async (sessionId: string): Promise<AttendanceSession | null> => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        as2.id,
        as2.course_id,
        c.code AS course_code,
        c.name AS course_name,
        as2.date,
        as2.time,
        as2.qr_code,
        as2.status,
        as2.created_by,
        u.name AS created_by_name,
        as2.created_at,
        as2.closed_at,
        COUNT(DISTINCT ar.student_id) AS attendees_count
       FROM attendance_sessions as2
       JOIN courses c ON as2.course_id = c.id
       LEFT JOIN users u ON as2.created_by = u.id
       LEFT JOIN attendance_records ar ON as2.id = ar.session_id
       WHERE as2.id = ?
       GROUP BY as2.id`,
      [sessionId]
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
      date: row.date,
      time: row.time,
      qr_code: row.qr_code,
      status: row.status,
      created_by: row.created_by,
      created_at: row.created_at,
      closed_at: row.closed_at,
      attendees_count: parseInt(row.attendees_count) || 0,
    };
  } catch (error) {
    console.error('Error getting attendance session:', error);
    throw error;
  }
};

// Get attendance session by QR code
export const getAttendanceSessionByQRCode = async (qrCode: string): Promise<AttendanceSession | null> => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        as2.id,
        as2.course_id,
        c.code AS course_code,
        c.name AS course_name,
        as2.date,
        as2.time,
        as2.qr_code,
        as2.status,
        as2.created_by,
        as2.created_at,
        as2.closed_at,
        COUNT(DISTINCT ar.student_id) AS attendees_count
       FROM attendance_sessions as2
       JOIN courses c ON as2.course_id = c.id
       LEFT JOIN attendance_records ar ON as2.id = ar.session_id
       WHERE as2.qr_code = ? AND as2.status = 'active'
       GROUP BY as2.id`,
      [qrCode]
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
      date: row.date,
      time: row.time,
      qr_code: row.qr_code,
      status: row.status,
      created_by: row.created_by,
      created_at: row.created_at,
      closed_at: row.closed_at,
      attendees_count: parseInt(row.attendees_count) || 0,
    };
  } catch (error) {
    console.error('Error getting attendance session by QR:', error);
    throw error;
  }
};

// Refresh QR code for a session
export const refreshQRCode = async (sessionId: string, teacherId: string): Promise<string> => {
  try {
    // Verify session exists and belongs to teacher
    const [session] = await pool.execute<any[]>(
      `SELECT id, created_by FROM attendance_sessions 
       WHERE id = ? AND status = 'active'`,
      [sessionId]
    );

    if (session.length === 0) {
      throw new Error('Session not found or already closed');
    }

    if (session[0].created_by !== teacherId) {
      throw new Error('You are not authorized to refresh this session');
    }

    // Generate new QR code
    let qrCode = generateQRCode();
    let attempts = 0;
    
    while (attempts < 10) {
      const [existing] = await pool.execute<any[]>(
        `SELECT id FROM attendance_sessions 
         WHERE qr_code = ? AND id != ? AND status = 'active'`,
        [qrCode, sessionId]
      );
      
      if (existing.length === 0) {
        break;
      }
      
      qrCode = generateQRCode();
      attempts++;
    }

    // Update QR code
    await pool.execute(
      `UPDATE attendance_sessions SET qr_code = ? WHERE id = ?`,
      [qrCode, sessionId]
    );

    return qrCode;
  } catch (error: any) {
    console.error('Error refreshing QR code:', error);
    throw error;
  }
};

// Close attendance session
export const closeAttendanceSession = async (sessionId: string, teacherId: string) => {
  try {
    // Verify session exists and belongs to teacher
    const [session] = await pool.execute<any[]>(
      `SELECT id, created_by FROM attendance_sessions 
       WHERE id = ? AND status = 'active'`,
      [sessionId]
    );

    if (session.length === 0) {
      throw new Error('Session not found or already closed');
    }

    if (session[0].created_by !== teacherId) {
      throw new Error('You are not authorized to close this session');
    }

    await pool.execute(
      `UPDATE attendance_sessions 
       SET status = 'closed', closed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [sessionId]
    );

    return { success: true };
  } catch (error: any) {
    console.error('Error closing session:', error);
    throw error;
  }
};

// Get active sessions for a teacher
export const getTeacherActiveSessions = async (teacherId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        as2.id,
        as2.course_id,
        c.code AS course_code,
        c.name AS course_name,
        as2.date,
        as2.time,
        as2.qr_code,
        as2.status,
        as2.created_at,
        COUNT(DISTINCT ar.student_id) AS attendees_count
       FROM attendance_sessions as2
       JOIN courses c ON as2.course_id = c.id
       LEFT JOIN attendance_records ar ON as2.id = ar.session_id
       WHERE as2.created_by = ? AND as2.status = 'active'
       GROUP BY as2.id
       ORDER BY as2.created_at DESC`,
      [teacherId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      course_id: row.course_id,
      course_name: row.course_name,
      course_code: row.course_code,
      date: row.date,
      time: row.time,
      qr_code: row.qr_code,
      status: row.status,
      created_at: row.created_at,
      attendees_count: parseInt(row.attendees_count) || 0,
    }));
  } catch (error) {
    console.error('Error getting teacher sessions:', error);
    throw error;
  }
};

// Get all sessions for a specific course
export const getCourseSessions = async (teacherId: string, courseId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        as2.id,
        as2.course_id,
        c.code AS course_code,
        c.name AS course_name,
        as2.date,
        as2.time,
        as2.qr_code,
        as2.status,
        as2.created_by,
        as2.created_at,
        as2.closed_at,
        COUNT(DISTINCT ar.student_id) AS attendees_count
       FROM attendance_sessions as2
       JOIN courses c ON as2.course_id = c.id
       LEFT JOIN attendance_records ar ON as2.id = ar.session_id
       WHERE as2.created_by = ? AND as2.course_id = ?
       GROUP BY as2.id
       ORDER BY as2.created_at DESC`,
      [teacherId, courseId]
    );

    return rows.map((row: any) => ({
      id: row.id,
      course_id: row.course_id,
      course_name: row.course_name,
      course_code: row.course_code,
      date: row.date,
      time: row.time,
      qr_code: row.qr_code,
      status: row.status,
      created_by: row.created_by,
      created_at: row.created_at,
      closed_at: row.closed_at,
      attendees_count: parseInt(row.attendees_count) || 0,
    }));
  } catch (error) {
    console.error('Error getting course sessions:', error);
    throw error;
  }
};

// Get session attendees
export const getSessionAttendees = async (sessionId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        ar.id,
        ar.student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.student_id AS student_number,
        ar.attendance_time,
        ar.method
       FROM attendance_records ar
       JOIN users u ON ar.student_id = u.id
       WHERE ar.session_id = ?
       ORDER BY ar.attendance_time DESC`,
      [sessionId]
    );

    return rows;
  } catch (error) {
    console.error('Error getting session attendees:', error);
    throw error;
  }
};

// Get active sessions for a student based on their enrolled courses
export const getStudentActiveSessions = async (studentId: string) => {
  try {
    const [rows] = await pool.execute<any[]>(
      `SELECT 
        as2.id,
        as2.course_id,
        c.code AS course_code,
        c.name AS course_name,
        as2.date,
        as2.time,
        as2.qr_code,
        as2.status,
        as2.created_at
       FROM attendance_sessions as2
       JOIN courses c ON as2.course_id = c.id
       JOIN enrollments e ON e.course_id = c.id
       WHERE e.student_id = ? AND as2.status = 'active' AND e.status = 'active'
       ORDER BY as2.created_at DESC`,
      [studentId]
    );
    return rows;
  } catch (error) {
    console.error('Error getting student active sessions:', error);
    throw error;
  }
};
