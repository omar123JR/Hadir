import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { checkAssignmentOwnership, checkStudentAssignmentAccess } from '../middleware/ownership';
import { ROLES } from '../utils/permissions';
import { validateRequest } from '../middleware/validator';
import { createAssignmentSchema, updateAssignmentSchema, gradeSubmissionSchema } from '../schemas/assignment.schema';
import * as assignmentService from '../services/assignmentService';
import * as assignmentSubmissionService from '../services/assignmentSubmissionService';
import { pool } from '../config/database';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { validateFileUpload } from '../middleware/fileValidator';

// Configure multer for memory storage with a strict 10MB limit
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Reject oversized payloads early
});

const router = Router();

// ==================== Teacher Routes ====================
const teacherRoutes = Router();
teacherRoutes.use(authenticate);
teacherRoutes.use(authorize(ROLES.TEACHER, ROLES.ADMIN));

// GET /api/assignments/teacher - Get all teacher assignments
teacherRoutes.get('/', async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const assignments = await assignmentService.getTeacherAssignments(teacherId);
    res.json({
      success: true,
      data: assignments,
      count: assignments.length,
    });
  } catch (error: any) {
    console.error('Get teacher assignments error:', error);
    next(error);
  }
});

// GET /api/assignments/teacher/course/:courseId - Get assignments for a course
teacherRoutes.get('/course/:courseId', async (req, res, next) => {
  try {
    const assignments = await assignmentService.getCourseAssignments(req.params.courseId);
    res.json({
      success: true,
      data: assignments,
      count: assignments.length,
    });
  } catch (error: any) {
    console.error('Get course assignments error:', error);
    next(error);
  }
});

// GET /api/assignments/teacher/:id - Get assignment details
teacherRoutes.get('/:id', checkAssignmentOwnership, async (req, res, next) => {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }
    res.json({
      success: true,
      data: assignment,
    });
  } catch (error: any) {
    console.error('Get assignment error:', error);
    next(error);
  }
});

// POST /api/assignments/teacher - Create assignment
teacherRoutes.post('/', upload.single('file'), validateFileUpload, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const assignmentData = req.body as assignmentService.CreateAssignmentRequest;

    if (!assignmentData.course_id || !assignmentData.title || !assignmentData.due_date) {
      return res.status(400).json({
        success: false,
        message: 'Course ID, title, and due date are required',
      });
    }

    if (req.file) {
      const uploadDir = path.join(__dirname, '../../storage/private/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileId = crypto.randomUUID();
      const extension = path.extname(req.file.originalname).toLowerCase();
      const fileName = `${fileId}${extension}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);

      assignmentData.file_url = fileName;
      assignmentData.file_name = req.file.originalname;
    }

    const assignment = await assignmentService.createAssignment(teacherId, assignmentData);
    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: assignment,
    });
  } catch (error: any) {
    console.error('Create assignment error:', error);
    next(error);
  }
});

// PUT /api/assignments/teacher/:id - Update assignment
teacherRoutes.put('/:id', checkAssignmentOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const assignmentData = req.body as assignmentService.UpdateAssignmentRequest;
    const assignment = await assignmentService.updateAssignment(req.params.id, teacherId, assignmentData);
    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment,
    });
  } catch (error: any) {
    console.error('Update assignment error:', error);
    next(error);
  }
});

// DELETE /api/assignments/teacher/:id - Delete assignment
teacherRoutes.delete('/:id', checkAssignmentOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    await assignmentService.deleteAssignment(req.params.id, teacherId);
    res.json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete assignment error:', error);
    next(error);
  }
});

// GET /api/assignments/teacher/:id/download - Secure file download
teacherRoutes.get('/:id/download', checkAssignmentOwnership, async (req: any, res, next) => {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id);
    if (!assignment || !assignment.file_url) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    const filename = path.basename(assignment.file_url);
    const filePath = path.join(__dirname, '../../storage/private/uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File no longer exists on server' });
    }
    // Hardened Download Headers (MIME Sniffing Prevention)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${assignment.file_name || filename}"`);
    res.download(filePath, assignment.file_name || filename);
  } catch (error: any) {
    console.error('Download assignment error:', error);
    next(error);
  }
});

// GET /api/assignments/teacher/:id/submissions - Get all submissions for an assignment
teacherRoutes.get('/:id/submissions', checkAssignmentOwnership, async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const submissions = await assignmentSubmissionService.getAssignmentSubmissions(req.params.id, teacherId);
    res.json({
      success: true,
      data: submissions,
      count: submissions.length,
    });
  } catch (error: any) {
    console.error('Get submissions error:', error);
    next(error);
  }
});

// POST /api/assignments/teacher/submissions/:id/grade - Grade a submission
teacherRoutes.post('/submissions/:id/grade', async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    const gradeData = req.body as assignmentSubmissionService.GradeAssignmentRequest;

    if (!gradeData.grade) {
      return res.status(400).json({
        success: false,
        message: 'Grade is required',
      });
    }

    const submission = await assignmentSubmissionService.gradeSubmission(
      parseInt(req.params.id),
      teacherId,
      gradeData
    );
    res.json({
      success: true,
      message: 'Assignment graded successfully',
      data: submission,
    });
  } catch (error: any) {
    console.error('Grade submission error:', error);
    next(error);
  }
});

// GET /api/assignments/teacher/submissions/:id/download - Download student submission
teacherRoutes.get('/submissions/:id/download', async (req: any, res, next) => {
  try {
    const teacherId = req.user?.userId;
    // Get the submission and verify ownership implicitly by getting the assignment details
    // We should do a DB query to verify the teacher owns the assignment this submission belongs to
    const [submissionRows] = await pool.execute<any[]>(
      `SELECT s.file_url, s.file_name, a.id as assignment_id
       FROM assignment_submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE s.id = ? AND c.teacher_id = ?`,
      [req.params.id, teacherId]
    );

    if (submissionRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found or unauthorized' });
    }

    const submission = submissionRows[0];
    if (!submission.file_url) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const filename = path.basename(submission.file_url);
    const filePath = path.join(__dirname, '../../storage/private/uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File no longer exists on server' });
    }

    // Hardened Download Headers (MIME Sniffing Prevention)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${submission.file_name || filename}"`);
    res.download(filePath, submission.file_name || filename);
  } catch (error: any) {
    console.error('Download submission error:', error);
    next(error);
  }
});

// ==================== Student Routes ====================
const studentRoutes = Router();
studentRoutes.use(authenticate);
studentRoutes.use(authorize(ROLES.STUDENT));

// GET /api/assignments/student - Get all student assignments
studentRoutes.get('/', async (req: any, res, next) => {
  try {
    const studentId = req.user?.userId;
    const assignments = await assignmentService.getStudentAssignments(studentId);
    res.json({
      success: true,
      data: assignments,
      count: assignments.length,
    });
  } catch (error: any) {
    console.error('Get student assignments error:', error);
    next(error);
  }
});

// GET /api/assignments/student/:id - Get assignment details
studentRoutes.get('/:id', checkStudentAssignmentAccess, async (req: any, res, next) => {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    // Verify enrollment
    const studentId = req.user?.userId;
    const [enrollment] = await pool.execute<any[]>(
      `SELECT id FROM enrollments
       WHERE course_id = ? AND student_id = ? AND status = 'active'`,
      [assignment.course_id, studentId]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course',
      });
    }

    // Get student submission if exists
    const submission = await assignmentSubmissionService.getStudentSubmission(studentId, assignment.id);

    res.json({
      success: true,
      data: {
        ...assignment,
        submission,
      },
    });
  } catch (error: any) {
    console.error('Get assignment error:', error);
    next(error);
  }
});

// GET /api/assignments/student/:id/download - Secure file download
studentRoutes.get('/:id/download', checkStudentAssignmentAccess, async (req: any, res, next) => {
  try {
    const assignment = await assignmentService.getAssignmentById(req.params.id);
    if (!assignment || !assignment.file_url) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    const filename = path.basename(assignment.file_url);
    const filePath = path.join(__dirname, '../../storage/private/uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File no longer exists on server' });
    }
    // Hardened Download Headers (MIME Sniffing Prevention)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${assignment.file_name || filename}"`);
    res.download(filePath, assignment.file_name || filename);
  } catch (error: any) {
    console.error('Download assignment error:', error);
    next(error);
  }
});

// POST /api/assignments/student/:id/submit - Submit assignment
studentRoutes.post('/:id/submit', checkStudentAssignmentAccess, upload.single('file'), validateFileUpload, async (req: any, res, next) => {
  try {
    const studentId = req.user?.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Assignment file is required',
      });
    }

    // Handle file upload
    const uploadDir = path.join(__dirname, '../../storage/private/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const fileId = crypto.randomUUID();
    const extension = path.extname(req.file.originalname).toLowerCase();
    const fileName = `${fileId}${extension}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const submissionData: assignmentSubmissionService.SubmitAssignmentRequest = {
      file_url: fileName,
      file_name: req.file.originalname,
      file_size: req.file.size.toString(),
    };

    const submission = await assignmentSubmissionService.submitAssignment(
      studentId,
      req.params.id,
      submissionData
    );
    res.json({
      success: true,
      message: 'Assignment submitted successfully',
      data: submission,
    });
  } catch (error: any) {
    console.error('Submit assignment error:', error);
    next(error);
  }
});

// GET /api/assignments/student/:id/submission - Get student submission
studentRoutes.get('/:id/submission', checkStudentAssignmentAccess, async (req: any, res, next) => {
  try {
    const studentId = req.user?.userId;
    const submission = await assignmentSubmissionService.getStudentSubmission(studentId, req.params.id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    res.json({
      success: true,
      data: submission,
    });
  } catch (error: any) {
    console.error('Get submission error:', error);
    next(error);
  }
});

// GET /api/assignments/student/:id/submission/download - Download student submission
studentRoutes.get('/:id/submission/download', checkStudentAssignmentAccess, async (req: any, res, next) => {
  try {
    const studentId = req.user?.userId;
    const submission = await assignmentSubmissionService.getStudentSubmission(studentId, req.params.id);
    
    if (!submission || !submission.file_url) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const filename = path.basename(submission.file_url);
    const filePath = path.join(__dirname, '../../storage/private/uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File no longer exists on server' });
    }

    // Hardened Download Headers (MIME Sniffing Prevention)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${submission.file_name || filename}"`);
    res.download(filePath, submission.file_name || filename);
  } catch (error: any) {
    console.error('Download submission error:', error);
    next(error);
  }
});

router.use('/teacher', teacherRoutes);
router.use('/student', studentRoutes);

export default router;