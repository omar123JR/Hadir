import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import * as gradeEngine from '../services/gradeEngineService';

const router = Router();

// 1. جلب بنود وتوزيع أوزان المقرر (للمعلم والطالب)
router.get('/course/:courseId/items', authenticate, async (req: any, res) => {
  try {
    const items = await gradeEngine.getGradeItems(req.params.courseId);
    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 2. تحديث وتخصيص أوزان الدرجات بواسطة المعلم (يجب أن تساوي 100%)
router.put('/course/:courseId/items', authenticate, authorize('teacher'), async (req: any, res) => {
  try {
    const teacherId = req.user.userId;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'يجب إرسال بنود التقييم كمصفوفة' });
    }

    const updated = await gradeEngine.setGradeItems(req.params.courseId, teacherId, items);
    res.json({
      success: true,
      message: 'تم حفظ وتحديث توزيع أوزان الدرجات بنجاح، وجرى تحديث حسابات الطلاب.',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 3. رصد درجة طالب في بند معين (للمعلم فقط)
router.post('/course/:courseId/student-grade', authenticate, authorize('teacher'), async (req: any, res) => {
  try {
    const teacherId = req.user.userId;
    const { studentId, gradeItemId, score } = req.body;

    if (!studentId || gradeItemId === undefined || score === undefined) {
      return res.status(400).json({ success: false, message: 'studentId و gradeItemId و score حقول مطلوبة' });
    }

    await gradeEngine.setStudentGrade({
      courseId: req.params.courseId,
      studentId,
      gradeItemId: Number(gradeItemId),
      score: Number(score),
      gradedBy: teacherId,
    });

    res.json({ success: true, message: 'تم رصد الدرجة بنجاح واحتساب المجموع تلقائياً' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 4. دفتر الدرجات الكامل للمقرر (للمعلم فقط - مصفوفة الطلاب وبنود التقييم)
router.get('/course/:courseId/gradebook', authenticate, authorize('teacher'), async (req: any, res) => {
  try {
    const teacherId = req.user.userId;
    const gradebook = await gradeEngine.getCourseGradebookMatrix(req.params.courseId, teacherId);
    res.json({ success: true, data: gradebook });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 5. جلب المعدل التراكمي (GPA) الحقيقي وسجل المقررات للطالب
router.get('/student/gpa', authenticate, authorize('student'), async (req: any, res) => {
  try {
    const studentId = req.user.userId;
    const gpaData = await gradeEngine.calculateStudentGPA(studentId);
    res.json({ success: true, data: gpaData });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 6. تفصيل كشف درجات مقرر معين للطالب
router.get('/student/course/:courseId', authenticate, authorize('student'), async (req: any, res) => {
  try {
    const studentId = req.user.userId;
    const details = await gradeEngine.getStudentGradebook(req.params.courseId, studentId);
    res.json({ success: true, data: details });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

export default router;
