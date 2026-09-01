import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { checkCourseOwnership } from '../middleware/ownership';
import { ROLES } from '../utils/permissions';
import * as courseService from '../services/courseService';

const router = Router();

// All course routes require authentication
router.use(authenticate);

// GET /api/courses/teacher - Get courses for current teacher
router.get('/teacher', authorize(ROLES.TEACHER), async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    console.log('Getting courses for teacher:', teacherId, 'role:', req.user?.role);
    const courses = await courseService.getCoursesByTeacherId(teacherId);
    console.log('Found courses:', courses.length);

    res.json({
      success: true,
      data: courses,
      count: courses.length,
    });
  } catch (error: any) {
    console.error('Get teacher courses error:', error);
    next(error);
  }
});

// GET /api/courses/student - Get courses for current student
router.get('/student', authorize(ROLES.STUDENT), async (req: any, res, next) => {
  try {
    const studentId = req.user?.userId;
    const courses = await courseService.getCoursesByStudentId(studentId);

    res.json({
      success: true,
      data: courses,
      count: courses.length,
    });
  } catch (error: any) {
    console.error('Get student courses error:', error);
    next(error);
  }
});

// GET /api/courses/:courseId/students - Get enrolled students for a course (teacher only)
// يجب أن يأتي هذا الـ route بعد الـ routes الثابتة (/teacher و /student)
router.get('/:courseId/students', authorize(ROLES.TEACHER), checkCourseOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const { courseId } = req.params;
    console.log('Getting enrolled students for course:', courseId, 'by teacher:', teacherId);

    // Verify that the course exists
    const course = await courseService.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Verify that the teacher owns this course
    if (course.teacher_id !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view students for this course',
      });
    }

    const students = await courseService.getEnrolledStudents(courseId);
    console.log('Found enrolled students:', students.length);

    res.json({
      success: true,
      data: students,
      count: students.length,
    });
  } catch (error: any) {
    console.error('Get enrolled students error:', error);
    next(error);
  }
});

export default router;