import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { ROLES } from '../utils/permissions';
import { validateRequest } from '../middleware/validator';
import { createUserSchema, updateUserSchema, resetPasswordSchema, getUsersSchema } from '../schemas/user.schema';
import { createCourseSchema, updateCourseSchema, getCoursesSchema } from '../schemas/course.schema';
import * as userService from '../services/userService';
import * as courseService from '../services/courseService';
import * as enrollmentService from '../services/enrollmentService';
import * as adminStatsService from '../services/adminStatsService';
import { securityLogger } from '../logging/securityLogger';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

// Helper to extract admin context from request
const adminCtx = (req: any) => ({
  ip: req.ip ?? 'unknown',
  adminId: req.user?.userId ?? 'unknown',
});

// ==================== Statistics ====================
// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await adminStatsService.getAdminStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Get stats error:', error);
    next(error);
  }
});

// ==================== Users Management ====================
// GET /api/admin/users
router.get('/users', validateRequest(getUsersSchema), async (req, res, next) => {
  try {
    const role   = req.query.role   as 'teacher' | 'student' | 'all' | undefined;
    const search = req.query.search as string | undefined;
    const users  = await userService.getAllUsers({ role, search });
    res.json({ success: true, data: users, count: users.length });
  } catch (error: any) {
    console.error('Get users error:', error);
    next(error);
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Get user error:', error);
    next(error);
  }
});

// POST /api/admin/users
router.post('/users', validateRequest(createUserSchema), async (req, res, next) => {
  try {
    const userData = req.body as userService.CreateUserRequest;

    if (!userData.name || !userData.email || !userData.role) {
      return res.status(400).json({ success: false, message: 'Name, email, and role are required' });
    }
    if (userData.role === 'student' && !userData.student_id) {
      return res.status(400).json({ success: false, message: 'Student ID is required for students' });
    }

    const user = await userService.createUser(userData);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'USER_CREATED',
      resourceType: 'user',
      resourceId: (user as any)?.id != null ? String((user as any).id) : undefined,
      detail: { role: userData.role, email: userData.email },
    });
    res.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (error: any) {
    console.error('Create user error:', error);
    next(error);
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', validateRequest(updateUserSchema), async (req, res, next) => {
  try {
    const userData = req.body as userService.UpdateUserRequest;
    const user     = await userService.updateUser(req.params.id, userData);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'USER_UPDATED',
      resourceType: 'user',
      resourceId: req.params.id,
    });
    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error: any) {
    console.error('Update user error:', error);
    next(error);
  }
});

// POST /api/admin/users/:id/password
router.post('/users/:id/password', validateRequest(resetPasswordSchema), async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });

    await userService.adminResetPassword(req.params.id, password);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'USER_PASSWORD_RESET',
      resourceType: 'user',
      resourceId: req.params.id,
    });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    next(error);
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'USER_DELETED',
      resourceType: 'user',
      resourceId: req.params.id,
    });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    next(error);
  }
});

// ==================== Courses Management ====================
// GET /api/admin/courses
router.get('/courses', validateRequest(getCoursesSchema), async (req, res, next) => {
  try {
    const search  = req.query.search as string | undefined;
    const courses = await courseService.getAllCourses(search);
    res.json({ success: true, data: courses, count: courses.length });
  } catch (error: any) {
    console.error('Get courses error:', error);
    next(error);
  }
});

// GET /api/admin/courses/:id
router.get('/courses/:id', async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (error: any) {
    console.error('Get course error:', error);
    next(error);
  }
});

// POST /api/admin/courses
router.post('/courses', validateRequest(createCourseSchema), async (req, res, next) => {
  try {
    const courseData = req.body as courseService.CreateCourseRequest;

    if (!courseData.name || !courseData.code) {
      return res.status(400).json({ success: false, message: 'Name and code are required' });
    }

    const course = await courseService.createCourse(courseData);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'COURSE_CREATED',
      resourceType: 'course',
      resourceId: (course as any)?.id != null ? String((course as any).id) : undefined,
      detail: { name: courseData.name, code: courseData.code },
    });
    res.status(201).json({ success: true, message: 'Course created successfully', data: course });
  } catch (error: any) {
    console.error('Create course error:', error);
    next(error);
  }
});

// PUT /api/admin/courses/:id
router.put('/courses/:id', validateRequest(updateCourseSchema), async (req, res, next) => {
  try {
    const courseData = req.body as courseService.UpdateCourseRequest;
    const course     = await courseService.updateCourse(req.params.id, courseData);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'COURSE_UPDATED',
      resourceType: 'course',
      resourceId: req.params.id,
    });
    res.json({ success: true, message: 'Course updated successfully', data: course });
  } catch (error: any) {
    console.error('Update course error:', error);
    next(error);
  }
});

// DELETE /api/admin/courses/:id
router.delete('/courses/:id', async (req, res, next) => {
  try {
    await courseService.deleteCourse(req.params.id);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'COURSE_DELETED',
      resourceType: 'course',
      resourceId: req.params.id,
    });
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error: any) {
    console.error('Delete course error:', error);
    next(error);
  }
});

// ==================== Enrollment Management ====================
// POST /api/admin/courses/:courseId/assign-teacher
router.post('/courses/:courseId/assign-teacher', async (req, res, next) => {
  try {
    const { teacher_id } = req.body;
    if (!teacher_id) return res.status(400).json({ success: false, message: 'Teacher ID is required' });

    const result = await enrollmentService.assignTeacher(req.params.courseId, teacher_id);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'TEACHER_ASSIGNED',
      resourceType: 'course',
      resourceId: req.params.courseId,
      detail: { teacherId: teacher_id },
    });
    res.json({ success: true, message: 'Teacher assigned successfully', data: result });
  } catch (error: any) {
    console.error('Assign teacher error:', error);
    next(error);
  }
});

// POST /api/admin/courses/:courseId/enroll
router.post('/courses/:courseId/enroll', async (req, res, next) => {
  try {
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ success: false, message: 'Student ID is required' });

    const result = await enrollmentService.enrollStudent(req.params.courseId, student_id);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'STUDENT_ENROLLED',
      resourceType: 'course',
      resourceId: req.params.courseId,
      detail: { studentId: student_id },
    });
    res.json({ success: true, message: 'Student enrolled successfully', data: result });
  } catch (error: any) {
    console.error('Enroll student error:', error);
    next(error);
  }
});

// DELETE /api/admin/courses/:courseId/enroll/:studentId
router.delete('/courses/:courseId/enroll/:studentId', async (req, res, next) => {
  try {
    await enrollmentService.unenrollStudent(req.params.courseId, req.params.studentId);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'STUDENT_UNENROLLED',
      resourceType: 'course',
      resourceId: req.params.courseId,
      detail: { studentId: req.params.studentId },
    });
    res.json({ success: true, message: 'Student unenrolled successfully' });
  } catch (error: any) {
    console.error('Unenroll student error:', error);
    next(error);
  }
});

// GET /api/admin/courses/:courseId/enrollments
router.get('/courses/:courseId/enrollments', async (req, res, next) => {
  try {
    const enrollments = await enrollmentService.getCourseEnrollments(req.params.courseId);
    res.json({ success: true, data: enrollments, count: enrollments.length });
  } catch (error: any) {
    console.error('Get enrollments error:', error);
    next(error);
  }
});

// POST /api/admin/courses/:courseId/enroll/bulk
router.post('/courses/:courseId/enroll/bulk', async (req, res, next) => {
  try {
    const { student_ids } = req.body;
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Student IDs array is required' });
    }

    const result = await enrollmentService.bulkEnrollStudents(req.params.courseId, student_ids);
    securityLogger.adminAction({
      ...adminCtx(req),
      action: 'STUDENTS_BULK_ENROLLED',
      resourceType: 'course',
      resourceId: req.params.courseId,
      detail: { count: result.success.length, studentIds: student_ids },
    });
    res.json({ success: true, message: `Enrolled ${result.success.length} students`, data: result });
  } catch (error: any) {
    console.error('Bulk enroll error:', error);
    next(error);
  }
});

export default router;
