import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { checkSessionOwnership, checkCourseOwnership } from '../middleware/ownership';
import { ROLES } from '../utils/permissions';
import { validateRequest } from '../middleware/validator';
import { createSessionSchema, getSessionsSchema, markAttendanceSchema, recordAttendanceByStudentSchema } from '../schemas/attendance.schema';
import * as attendanceService from '../services/attendanceService';
import * as attendanceRecordService from '../services/attendanceRecordService';

const router = Router();

// ==================== Teacher Routes ====================
// All teacher routes require authentication and teacher role
const teacherRoutes = Router();
teacherRoutes.use(authenticate);
teacherRoutes.use(authorize(ROLES.TEACHER, ROLES.ADMIN));

// POST /api/attendance/sessions - Create attendance session
teacherRoutes.post('/sessions', checkCourseOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const { course_id, date, time } = req.body;

    if (!course_id || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, date, and time are required',
      });
    }

    const session = await attendanceService.createAttendanceSession(teacherId, {
      course_id,
      date,
      time,
    });

    res.status(201).json({
      success: true,
      message: 'Attendance session created successfully',
      data: session,
    });
  } catch (error: any) {
    console.error('Create session error:', error);
    next(error);
  }
});

// GET /api/attendance/sessions/active - Get active sessions for teacher
teacherRoutes.get('/sessions/active', async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const sessions = await attendanceService.getTeacherActiveSessions(teacherId);
    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error: any) {
    console.error('Get active sessions error:', error);
    next(error);
  }
});

// GET /api/attendance/teacher/course/:courseId/sessions - Get all sessions for a course
teacherRoutes.get('/course/:courseId/sessions', checkCourseOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const courseId = req.params.courseId;
    const sessions = await attendanceService.getCourseSessions(teacherId, courseId);
    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error: any) {
    console.error('Get course sessions error:', error);
    next(error);
  }
});

// GET /api/attendance/sessions/:id - Get session details
teacherRoutes.get('/sessions/:id', checkSessionOwnership, async (req, res, next) => {
  try {
    const session = await attendanceService.getAttendanceSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }
    res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    console.error('Get session error:', error);
    next(error);
  }
});

// POST /api/attendance/sessions/:id/refresh-qr - Refresh QR code
teacherRoutes.post('/sessions/:id/refresh-qr', checkSessionOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const qrCode = await attendanceService.refreshQRCode(req.params.id, teacherId);
    res.json({
      success: true,
      message: 'QR code refreshed successfully',
      data: { qr_code: qrCode },
    });
  } catch (error: any) {
    console.error('Refresh QR error:', error);
    next(error);
  }
});

// POST /api/attendance/sessions/:id/close - Close attendance session
teacherRoutes.post('/sessions/:id/close', checkSessionOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    await attendanceService.closeAttendanceSession(req.params.id, teacherId);
    res.json({
      success: true,
      message: 'Attendance session closed successfully',
    });
  } catch (error: any) {
    console.error('Close session error:', error);
    next(error);
  }
});

// GET /api/attendance/sessions/:id/attendees - Get session attendees
teacherRoutes.get('/sessions/:id/attendees', checkSessionOwnership, async (req, res, next) => {
  try {
    const attendees = await attendanceService.getSessionAttendees(req.params.id);
    res.json({
      success: true,
      data: attendees,
      count: attendees.length,
    });
  } catch (error: any) {
    console.error('Get attendees error:', error);
    next(error);
  }
});

// POST /api/attendance/sessions/:id/mark-manual - Mark attendance manually
teacherRoutes.post('/sessions/:id/mark-manual', checkSessionOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    const record = await attendanceRecordService.markAttendanceManually(
      req.params.id,
      student_id,
      teacherId
    );

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: record,
    });
  } catch (error: any) {
    console.error('Mark manual attendance error:', error);
    next(error);
  }
});

// ==================== Student Routes ====================
// Student routes require authentication and student role
const studentRoutes = Router();
studentRoutes.use(authenticate);
studentRoutes.use(authorize(ROLES.STUDENT));

// POST /api/attendance/scan - Scan QR code and mark attendance
studentRoutes.post('/scan', async (req: any, res, next) => {
  try {
    const studentId = req.user?.userId;
    const { qr_code } = req.body;

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        message: 'QR code is required',
      });
    }

    const record = await attendanceRecordService.markAttendanceByQR(studentId, qr_code);

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: record,
    });
  } catch (error: any) {
    console.error('Scan QR error:', error);
    next(error);
  }
});

// GET /api/attendance/sessions/active - Get active sessions for student
studentRoutes.get('/sessions/active', async (req: any, res, next) => {
  try {
    const studentId = req.user?.userId;
    const sessions = await attendanceService.getStudentActiveSessions(studentId);
    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error: any) {
    console.error('Get student active sessions error:', error);
    next(error);
  }
});

// GET /api/attendance/records - Get student attendance records
studentRoutes.get('/records', async (req: any, res, next) => {
  try {
    const studentId = req.user?.userId;
    const courseId = req.query.course_id as string | undefined;

    const records = await attendanceRecordService.getStudentAttendanceRecords(studentId, courseId);
    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error: any) {
    console.error('Get records error:', error);
    next(error);
  }
});

// GET /api/attendance/summary - Get attendance summary for student
studentRoutes.get('/summary', async (req: any, res, next) => {
  try {
    const studentId = req.user?.userId;
    const courseId = req.query.course_id as string;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

    const summary = await attendanceRecordService.getStudentAttendanceSummary(studentId, courseId);
    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Get summary error:', error);
    next(error);
  }
});

// Mount routes
router.use('/teacher', teacherRoutes);
router.use('/student', studentRoutes);

export default router;
