import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import * as courseService from '../services/courseService';

const router = Router();

// All teacher routes require authentication and teacher role
router.use(authenticate);
router.use(authorize('teacher'));

// GET /api/teacher/courses - Get courses for the logged-in teacher
router.get('/courses', async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const courses = await courseService.getCoursesByTeacherId(teacherId);
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

// ... يمكنكِ إضافة أي routes أخرى خاصة بالمعلم هنا في المستقبل ...

export default router;
