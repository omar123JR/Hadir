import crypto from 'crypto';
import { recalculateCourseGrade } from './gradeEngineService';
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
  const connection = await pool.getConnection();
  let resolvedSessionId: string | null = null;
  let resolvedCourseId: string | null = null;

  try {
    await connection.beginTransaction();

    // 1. Check if dynamic QR format: HADIR:sessionId:window:token
    if (qrCode.startsWith('HADIR:')) {
      const parts = qrCode.split(':');
      if (parts.length === 4) {
        const [_, sessId, winStr, token] = parts;
        const clientWindow = parseInt(winStr, 10);
        const interval = 20;
        const now = Math.floor(Date.now() / 1000);
        const currentWindow = Math.floor(now / interval);

        // Allow 20s window (current or previous window for 20s tolerance)
        if (Math.abs(currentWindow - clientWindow) > 1) {
          throw new Error('رمز الـ QR منتهي الصلاحية (صالح لمدة 20 ثانية فقط). يرجى مسح الرمز الجديد المعروض حالياً');
        }

        const [sRows] = await connection.execute<any[]>(
          `SELECT id, course_id, status, qr_secret FROM attendance_sessions WHERE id = ? FOR UPDATE`,
          [sessId]
        );
        if (sRows.length === 0 || sRows[0].status !== 'active') {
          throw new Error('جلسة الحضور مغلقة أو غير متاحة');
        }

        const secret = sRows[0].qr_secret;
        if (secret) {
          const expectedToken = crypto.createHmac('sha256', secret).update(String(clientWindow)).digest('hex').substring(0, 8).toUpperCase();
          if (token !== expectedToken) {
            throw new Error('رمز التحقق غير صحيح أو تم التلاعب به');
          }
        }

        resolvedSessionId = sRows[0].id;
        resolvedCourseId = sRows[0].course_id;
      }
    }

    // 2. Legacy / static fallback
    if (!resolvedSessionId) {
      const [legacyRows] = await connection.execute<any[]>(
        `SELECT id, course_id, status FROM attendance_sessions WHERE qr_code = ? FOR UPDATE`,
        [qrCode]
      );
      if (legacyRows.length === 0 || legacyRows[0].status !== 'active') {
        throw new Error('رمز QR غير صالح أو أن جلسة الحضور مغلقة');
      }
      resolvedSessionId = legacyRows[0].id;
      resolvedCourseId = legacyRows[0].course_id;
    }

    // 3. Verify student enrollment in course
    const [enrollment] = await connection.execute<any[]>(
      `SELECT id FROM enrollments 
       WHERE course_id = ? AND student_id = ? AND status = 'active' FOR UPDATE`,
      [resolvedCourseId, studentId]
    );

    if (enrollment.length === 0) {
      throw new Error('أنت غير مسجل في هذا المقرر الدراسي');
    }

    // 4. Mark attendance with INSERT IGNORE (idempotent, safe against duplicate rapid taps)
    await connection.execute(
      `INSERT IGNORE INTO attendance_records (session_id, student_id, method, attendance_time)
       VALUES (?, ?, 'qr', CURRENT_TIMESTAMP)`,
      [resolvedSessionId, studentId]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // 5. Trigger live grade update (attendance factor in Gradebook)
  if (resolvedCourseId) {
    recalculateCourseGrade(resolvedCourseId, studentId).catch((err) =>
      console.error('Grade recalculate after attendance error:', err)
    );
  }

  // 6. Return record
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
    [resolvedSessionId, studentId]
  );

  if (record.length === 0) {
    throw new Error('فشل تسجيل الحضور');
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
