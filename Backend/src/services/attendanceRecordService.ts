import { pool } from '../config/database';
import { getAttendanceSessionByQRCode } from './attendanceService';

export interface MarkAttendanceRequest {
  qr_code: string;
  method?: 'qr_scan' | 'manual';
}

export interface AttendanceRecord {
  id: number;
  session_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_number: string | null;
  attendance_time: string;
  method: 'qr' | 'manual';
  course_name: string;
  course_code: string;
  date: string;
  time: string;
}

// Mark attendance by QR code scan
export const markAttendanceByQR = async (
  studentId: string,
  qrCode: string
): Promise<AttendanceRecord> => {
  try {
    // Get session by QR code
    const session = await getAttendanceSessionByQRCode(qrCode);

    if (!session) {
      throw new Error('Invalid QR code or session expired');
    }

    if (session.status !== 'active') {
      throw new Error('Attendance session is closed');
    }

    // Check if student is enrolled in the course
    const [enrollment] = await pool.execute<any[]>(
      `SELECT id FROM enrollments 
       WHERE course_id = ? AND student_id = ? AND status = 'active'`,
      [session.course_id, studentId]
    );

    if (enrollment.length === 0) {
      throw new Error('You are not enrolled in this course');
    }

    // Check if already marked attendance
    const [existing] = await pool.execute<any[]>(
      `SELECT id FROM attendance_records 
       WHERE session_id = ? AND student_id = ?`,
      [session.id, studentId]
    );

    if (existing.length > 0) {
      throw new Error('Attendance already marked for this session');
    }

    // Mark attendance
    await pool.execute(
      `INSERT INTO attendance_records (session_id, student_id, method, attendance_time)
       VALUES (?, ?, 'qr', CURRENT_TIMESTAMP)`,
      [session.id, studentId]
    );

    // Get the created record with details
    const [record] = await pool.execute<any[]>(
      `SELECT 
        ar.id,
        ar.session_id,
        ar.student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.student_id AS student_number,
        ar.attendance_time,
        ar.method,
        c.name AS course_name,
        c.code AS course_code,
        as2.date,
        as2.time
       FROM attendance_records ar
       JOIN users u ON ar.student_id = u.id
       JOIN attendance_sessions as2 ON ar.session_id = as2.id
       JOIN courses c ON as2.course_id = c.id
       WHERE ar.session_id = ? AND ar.student_id = ?
       ORDER BY ar.attendance_time DESC
       LIMIT 1`,
      [session.id, studentId]
    );

    if (record.length === 0) {
      throw new Error('Failed to create attendance record');
    }

    const row = record[0];
    return {
      id: row.id,
      session_id: row.session_id,
      student_id: row.student_id,
      student_name: row.student_name,
      student_email: row.student_email,
      student_number: row.student_number,
      attendance_time: row.attendance_time,
      method: row.method,
      course_name: row.course_name,
      course_code: row.course_code,
      date: row.date,
      time: row.time,
    };
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    throw error;
  }
};

// Mark attendance manually (by teacher)
export const markAttendanceManually = async (
  sessionId: string,
  studentId: string,
  teacherId: string
): Promise<AttendanceRecord> => {
  try {
    // Verify session exists and belongs to teacher
    const [session] = await pool.execute<any[]>(
      `SELECT id, course_id, created_by, status 
       FROM attendance_sessions 
       WHERE id = ?`,
      [sessionId]
    );

    if (session.length === 0) {
      throw new Error('Session not found');
    }

    if (session[0].created_by !== teacherId) {
      throw new Error('You are not authorized to mark attendance for this session');
    }

    if (session[0].status !== 'active') {
      throw new Error('Attendance session is closed');
    }

    // Check if student is enrolled in the course
    const [enrollment] = await pool.execute<any[]>(
      `SELECT id FROM enrollments 
       WHERE course_id = ? AND student_id = ? AND status = 'active'`,
      [session[0].course_id, studentId]
    );

    if (enrollment.length === 0) {
      throw new Error('Student is not enrolled in this course');
    }

    // Check if already marked
    const [existing] = await pool.execute<any[]>(
      `SELECT id FROM attendance_records 
       WHERE session_id = ? AND student_id = ?`,
      [sessionId, studentId]
    );

    if (existing.length > 0) {
      throw new Error('Attendance already marked for this student');
    }

    // Mark attendance
    await pool.execute(
      `INSERT INTO attendance_records (session_id, student_id, method, attendance_time)
       VALUES (?, ?, 'manual', CURRENT_TIMESTAMP)`,
      [sessionId, studentId]
    );

    // Get the created record
    const [record] = await pool.execute<any[]>(
      `SELECT 
        ar.id,
        ar.session_id,
        ar.student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.student_id AS student_number,
        ar.attendance_time,
        ar.method,
        c.name AS course_name,
        c.code AS course_code,
        as2.date,
        as2.time
       FROM attendance_records ar
       JOIN users u ON ar.student_id = u.id
       JOIN attendance_sessions as2 ON ar.session_id = as2.id
       JOIN courses c ON as2.course_id = c.id
       WHERE ar.session_id = ? AND ar.student_id = ?
       ORDER BY ar.attendance_time DESC
       LIMIT 1`,
      [sessionId, studentId]
    );

    if (record.length === 0) {
      throw new Error('Failed to create attendance record');
    }

    const row = record[0];
    return {
      id: row.id,
      session_id: row.session_id,
      student_id: row.student_id,
      student_name: row.student_name,
      student_email: row.student_email,
      student_number: row.student_number,
      attendance_time: row.attendance_time,
      method: row.method,
      course_name: row.course_name,
      course_code: row.course_code,
      date: row.date,
      time: row.time,
    };
  } catch (error: any) {
    console.error('Error marking attendance manually:', error);
    throw error;
  }
};

// Get student attendance records
export const getStudentAttendanceRecords = async (studentId: string, courseId?: string) => {
  try {
    let query = `
      SELECT 
        ar.id,
        ar.session_id,
        ar.student_id,
        ar.attendance_time,
        ar.method,
        as2.id AS session_id_full,
        as2.course_id,
        c.name AS course_name,
        c.code AS course_code,
        as2.date,
        as2.time
       FROM attendance_records ar
       JOIN attendance_sessions as2 ON ar.session_id = as2.id
       JOIN courses c ON as2.course_id = c.id
       WHERE ar.student_id = ?
    `;
    const params: any[] = [studentId];

    if (courseId) {
      query += ` AND as2.course_id = ?`;
      params.push(courseId);
    }

    query += ` ORDER BY as2.date DESC, as2.time DESC`;

    const [rows] = await pool.execute<any[]>(query, params);

    return rows.map((row: any) => ({
      id: row.id,
      session_id: row.session_id,
      student_id: row.student_id,
      attendance_time: row.attendance_time,
      method: row.method,
      course_id: row.course_id,
      course_name: row.course_name,
      course_code: row.course_code,
      date: row.date,
      time: row.time,
    }));
  } catch (error) {
    console.error('Error getting student attendance:', error);
    throw error;
  }
};

// Get attendance summary for a student in a course
export const getStudentAttendanceSummary = async (studentId: string, courseId: string) => {
  try {
    // Get total sessions for the course
    const [totalSessions] = await pool.execute<any[]>(
      `SELECT COUNT(*) as count FROM attendance_sessions
       WHERE course_id = ? AND status = 'closed'`,
      [courseId]
    );

    // Get attended sessions
    const [attendedSessions] = await pool.execute<any[]>(
      `SELECT COUNT(DISTINCT ar.session_id) as count
       FROM attendance_records ar
       JOIN attendance_sessions as2 ON ar.session_id = as2.id
       WHERE ar.student_id = ? AND as2.course_id = ?`,
      [studentId, courseId]
    );

    const total = parseInt(totalSessions[0].count) || 0;
    const attended = parseInt(attendedSessions[0].count) || 0;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

    return {
      course_id: courseId,
      total_sessions: total,
      attended_sessions: attended,
      percentage,
    };
  } catch (error) {
    console.error('Error getting attendance summary:', error);
    throw error;
  }
};
