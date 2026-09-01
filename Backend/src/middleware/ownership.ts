import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { pool } from '../config/database';
import { securityLogger } from '../logging/securityLogger';

// Helper to send 403 Forbidden and log the ownership violation
const forbidden = (
  res: Response,
  req: AuthRequest,
  resourceType: string,
  resourceId: string,
  message: string = 'Access denied. You do not own this resource.'
) => {
  securityLogger.ownershipDenied({
    ip: req.ip ?? 'unknown',
    userId: req.user?.userId ?? 'unknown',
    role: req.user?.role ?? 'unknown',
    resourceType,
    resourceId,
  });
  return res.status(403).json({ success: false, message });
};

// Verify Teacher Course Ownership
export const checkCourseOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId || req.user?.role !== 'teacher') return next();

    const courseId = req.params.courseId || req.params.id || req.body.course_id;
    if (!courseId) return next();

    const [courses] = await pool.execute<any[]>(
      `SELECT id FROM courses WHERE id = ? AND teacher_id = ? AND deleted_at IS NULL`,
      [courseId, teacherId]
    );

    if (courses.length === 0) {
      return forbidden(res, req, 'course', courseId, 'Access denied. You are not assigned to this course.');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Verify Teacher Assignment Ownership
export const checkAssignmentOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId || req.user?.role !== 'teacher') return next();

    const assignmentId = req.params.id;
    if (!assignmentId) return next();

    const [assignments] = await pool.execute<any[]>(
      `SELECT a.id FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND c.teacher_id = ? AND a.deleted_at IS NULL AND c.deleted_at IS NULL`,
      [assignmentId, teacherId]
    );

    if (assignments.length === 0) {
      return forbidden(res, req, 'assignment', assignmentId, 'Access denied. You do not own this assignment.');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Verify Teacher Lecture Ownership
export const checkLectureOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId || req.user?.role !== 'teacher') return next();

    const lectureId = req.params.id;
    if (!lectureId) return next();

    const [lectures] = await pool.execute<any[]>(
      `SELECT l.id FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = ? AND c.teacher_id = ? AND c.deleted_at IS NULL`,
      [lectureId, teacherId]
    );

    if (lectures.length === 0) {
      return forbidden(res, req, 'lecture', lectureId, 'Access denied. You do not own this lecture.');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Verify Teacher Attendance Session Ownership
export const checkSessionOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId || req.user?.role !== 'teacher') return next();

    const sessionId = req.params.id;
    if (!sessionId) return next();

    const [sessions] = await pool.execute<any[]>(
      `SELECT s.id FROM attendance_sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.id = ? AND c.teacher_id = ? AND c.deleted_at IS NULL`,
      [sessionId, teacherId]
    );

    if (sessions.length === 0) {
      return forbidden(res, req, 'attendance_session', sessionId, 'Access denied. You do not own this attendance session.');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Verify Student Course Enrollment
export const checkCourseEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user?.userId;
    if (!studentId || req.user?.role !== 'student') return next();

    const courseId = req.params.courseId || req.query.course_id;
    if (!courseId) return next();

    const [enrollments] = await pool.execute<any[]>(
      `SELECT id FROM enrollments
       WHERE course_id = ? AND student_id = ? AND status = 'active'`,
      [courseId, studentId]
    );

    if (enrollments.length === 0) {
      return forbidden(res, req, 'course_enrollment', courseId as string, 'Access denied. You are not enrolled in this course.');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Verify Student Assignment Access
export const checkStudentAssignmentAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user?.userId;
    if (!studentId || req.user?.role !== 'student') return next();

    const assignmentId = req.params.id;
    if (!assignmentId) return next();

    const [enrollments] = await pool.execute<any[]>(
      `SELECT e.id FROM enrollments e
       JOIN assignments a ON e.course_id = a.course_id
       WHERE a.id = ? AND e.student_id = ? AND e.status = 'active' AND a.deleted_at IS NULL`,
      [assignmentId, studentId]
    );

    if (enrollments.length === 0) {
      return forbidden(res, req, 'assignment', assignmentId, 'Access denied. You are not enrolled in the course for this assignment.');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Verify Student Lecture Access
export const checkStudentLectureAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user?.userId;
    if (!studentId || req.user?.role !== 'student') return next();

    const lectureId = req.params.id;
    if (!lectureId) return next();

    const [enrollments] = await pool.execute<any[]>(
      `SELECT e.id FROM enrollments e
       JOIN lectures l ON e.course_id = l.course_id
       WHERE l.id = ? AND e.student_id = ? AND e.status = 'active'`,
      [lectureId, studentId]
    );

    if (enrollments.length === 0) {
      return forbidden(res, req, 'lecture', lectureId, 'Access denied. You are not enrolled in the course for this lecture.');
    }

    next();
  } catch (error) {
    next(error);
  }
};
