import { Router, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { checkLectureOwnership, checkCourseOwnership, checkCourseEnrollment, checkStudentLectureAccess } from '../middleware/ownership';
import { ROLES } from '../utils/permissions';
import { validateRequest } from '../middleware/validator';
import { createLectureSchema, updateLectureSchema } from '../schemas/lecture.schema';
import * as lectureService from '../services/lectureService';
import { pool } from '../config/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateFileUpload } from '../middleware/fileValidator';

// 2. Configure multer for memory storage with a strict 10MB limit
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Reject payloads > 10MB before they hit disk/app logic
});

const router = Router();

// ==================== Teacher Routes ====================
const teacherRoutes = Router();
teacherRoutes.use(authenticate);
teacherRoutes.use(authorize(ROLES.TEACHER, ROLES.ADMIN));

// GET /api/lectures/teacher - Get all teacher lectures
teacherRoutes.get('/', async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const lectures = await lectureService.getTeacherLectures(teacherId);
    res.json({
      success: true,
      data: lectures,
      count: lectures.length,
    });
  } catch (error: any) {
    console.error('Get teacher lectures error:', error);
    next(error);
  }
});

// GET /api/lectures/teacher/course/:courseId - Get lectures for a course
teacherRoutes.get('/course/:courseId', checkCourseOwnership, async (req, res, next) => {
  try {
    const lectures = await lectureService.getCourseLectures(req.params.courseId);
    res.json({
      success: true,
      data: lectures,
      count: lectures.length,
    });
  } catch (error: any) {
    console.error('Get course lectures error:', error);
    next(error);
  }
});

// POST /api/lectures/teacher - Create lecture
// 3. Add the multer middleware 'upload.single('file')' here
// Wrapped middleware for better error handling
const uploadMiddleware = [
  (req: any, res: any, next: any) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        console.error('Multer Upload Error:', err);
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + err.message
        });
      }
      next();
    });
  },
  validateFileUpload
];

teacherRoutes.post('/', uploadMiddleware, checkCourseOwnership, async (req: any, res: Response, next: NextFunction) => {
  try {
    console.log('Incoming Lecture Upload Request');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    // IMPORTANT: Now req.file will contain the file, and req.body will contain the text fields
    if (!req.file) {
      console.error('Validation Error: No file provided');
      return res.status(400).json({
        success: false,
        message: 'Lecture file is required',
      });
    }

    const teacherId = req.user?.userId;
    const lectureData = req.body as lectureService.CreateLectureRequest;

    if (!lectureData.course_id || !lectureData.title || !lectureData.date) {
      console.error('Validation Error: Missing fields', {
        courseId: !!lectureData.course_id,
        title: !!lectureData.title,
        date: !!lectureData.date
      });
      return res.status(400).json({
        success: false,
        message: 'Course ID, title, and date are required',
      });
    }

    // Pass the file buffer and original name to the service
    const lecture = await lectureService.createLecture(teacherId, lectureData, req.file);
    res.status(201).json({
      success: true,
      message: 'Lecture created successfully',
      data: lecture,
    });
  } catch (error: any) {
    console.error('Create lecture error:', error);
    next(error);
  }
});

// PUT /api/lectures/teacher/:id - Update lecture
teacherRoutes.put('/:id', checkLectureOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const lectureData = req.body as lectureService.UpdateLectureRequest;
    const lecture = await lectureService.updateLecture(req.params.id, teacherId, lectureData);
    res.json({
      success: true,
      message: 'Lecture updated successfully',
      data: lecture,
    });
  } catch (error: any) {
    console.error('Update lecture error:', error);
    next(error);
  }
});

// DELETE /api/lectures/teacher/:id - Delete lecture
teacherRoutes.delete('/:id', checkLectureOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    await lectureService.deleteLecture(req.params.id, teacherId);
    res.json({
      success: true,
      message: 'Lecture deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete lecture error:', error);
    next(error);
  }
});

// GET /api/lectures/teacher/:id/download - Secure file download
teacherRoutes.get('/:id/download', checkLectureOwnership, async (req: any, res, next) => {
  try {
    const lecture = await lectureService.getLectureById(req.params.id);
    if (!lecture || !lecture.file_url) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    // Prevent directory traversal attacks by taking only the basename
    const filename = path.basename(lecture.file_url);
    const filePath = path.join(__dirname, '../../storage/private/uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File no longer exists on server' });
    }
    // Hardened Download Headers (MIME Sniffing Prevention)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${lecture.file_name || filename}"`);
    res.download(filePath, lecture.file_name || filename);
  } catch (error: any) {
    console.error('Download lecture error:', error);
    next(error);
  }
});

// ==================== Student Routes ====================
const studentRoutes = Router();
studentRoutes.use(authenticate);
studentRoutes.use(authorize(ROLES.STUDENT));

// GET /api/lectures/student/course/:courseId - Get lectures for enrolled course
studentRoutes.get('/course/:courseId', checkCourseEnrollment, async (req: any, res, next) => {
  try {
    const studentId = req.user?.userId;
    const courseId = req.params.courseId;

    // Verify enrollment
    const [enrollment] = await pool.execute<any[]>(
      `SELECT id FROM enrollments
       WHERE course_id = ? AND student_id = ? AND status = 'active'`,
      [courseId, studentId]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course',
      });
    }

    const lectures = await lectureService.getCourseLectures(courseId);
    res.json({
      success: true,
      data: lectures,
      count: lectures.length,
    });
  } catch (error: any) {
    console.error('Get student lectures error:', error);
    next(error);
  }
});

// GET /api/lectures/student/:id - Get lecture details
studentRoutes.get('/:id', checkStudentLectureAccess, async (req: any, res, next) => {
  try {
    const lecture = await lectureService.getLectureById(req.params.id);
    if (!lecture) {
      return res.status(404).json({
        success: false,
        message: 'Lecture not found',
      });
    }
    res.json({
      success: true,
      data: lecture,
    });
  } catch (error: any) {
    console.error('Get lecture error:', error);
    next(error);
  }
});

// GET /api/lectures/student/:id/download - Secure file download
studentRoutes.get('/:id/download', checkStudentLectureAccess, async (req: any, res, next) => {
  try {
    const lecture = await lectureService.getLectureById(req.params.id);
    if (!lecture || !lecture.file_url) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    // Prevent directory traversal attacks by taking only the basename
    const filename = path.basename(lecture.file_url);
    const filePath = path.join(__dirname, '../../storage/private/uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File no longer exists on server' });
    }
    // Hardened Download Headers (MIME Sniffing Prevention)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${lecture.file_name || filename}"`);
    res.download(filePath, lecture.file_name || filename);
  } catch (error: any) {
    console.error('Download lecture error:', error);
    next(error);
  }
});

router.use('/teacher', teacherRoutes);
router.use('/student', studentRoutes);

export default router;
