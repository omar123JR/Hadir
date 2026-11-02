import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface GradeItem {
  id: number;
  course_id: string;
  name: string;
  category: 'attendance' | 'assignments' | 'midterm' | 'final' | 'other';
  weight: number;
  max_score: number;
}

export interface CreateGradeItemInput {
  name: string;
  category: 'attendance' | 'assignments' | 'midterm' | 'final' | 'other';
  weight: number;
  max_score: number;
}

export interface StudentGrade {
  id: number;
  course_id: string;
  student_id: string;
  grade_item_id: number;
  score: number | null;
  version: number;
  graded_by: string | null;
  graded_at: string | null;
}

export interface CourseGradeResult {
  courseId: string;
  studentId: string;
  totalScore: number;
  letterGrade: string;
  gradePoints: number;
}

export interface CourseGPAEntry {
  courseId: string;
  courseName: string;
  courseCode: string;
  creditHours: number;
  totalScore: number | null;
  letterGrade: string | null;
  gradePoints: number | null;
  attendancePercentage: number;
}

export interface GPAResult {
  gpa: number;
  totalCredits: number;
  gradedCredits: number;
  courses: CourseGPAEntry[];
}

export interface StudentGradebookItem {
  gradeItemId: number;
  name: string;
  category: string;
  weight: number;
  maxScore: number;
  score: number | null;
  weightedScore: number | null;
}

// Convert numeric percentage (0-100) to Letter Grade and 4.0 Scale
export function scoreToLetterAndPoints(score: number): { letterGrade: string; gradePoints: number } {
  if (score >= 90) return { letterGrade: 'A', gradePoints: 4.00 };
  if (score >= 85) return { letterGrade: 'B+', gradePoints: 3.50 };
  if (score >= 80) return { letterGrade: 'B', gradePoints: 3.00 };
  if (score >= 75) return { letterGrade: 'C+', gradePoints: 2.50 };
  if (score >= 70) return { letterGrade: 'C', gradePoints: 2.00 };
  if (score >= 60) return { letterGrade: 'D', gradePoints: 1.00 };
  return { letterGrade: 'F', gradePoints: 0.00 };
}

/**
 * 1. جلب بنود التقييم لمقرر معين (Grade Items)
 * إذا لم تكن موجودة، يتم إنشاء التوزيع الافتراضي تلقائياً.
 */
export async function getGradeItems(courseId: string): Promise<GradeItem[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, course_id, name, category, weight, max_score
     FROM course_grade_items
     WHERE course_id = ?
     ORDER BY FIELD(category, 'attendance', 'assignments', 'midterm', 'final', 'other'), id ASC`,
    [courseId]
  );

  if (rows.length > 0) {
    return rows.map((r) => ({
      id: r.id,
      course_id: r.course_id,
      name: r.name,
      category: r.category,
      weight: parseFloat(r.weight),
      max_score: parseFloat(r.max_score),
    }));
  }

  // إنشاء البنود الافتراضية إذا كانت المادة جديدة
  const defaultItems: CreateGradeItemInput[] = [
    { name: 'الحضور والالتزام', category: 'attendance', weight: 10, max_score: 100 },
    { name: 'الواجبات والتكليفات', category: 'assignments', weight: 20, max_score: 100 },
    { name: 'الامتحان النصفي', category: 'midterm', weight: 20, max_score: 100 },
    { name: 'الامتحان النهائي', category: 'final', weight: 50, max_score: 100 },
  ];

  for (const item of defaultItems) {
    await pool.execute(
      `INSERT INTO course_grade_items (course_id, name, category, weight, max_score)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), weight = VALUES(weight), max_score = VALUES(max_score)`,
      [courseId, item.name, item.category, item.weight, item.max_score]
    );
  }

  return getGradeItems(courseId);
}

/**
 * 2. تخصيص وضبط أوزان الدرجات للمقرر من قِبل المحاضر
 * التحقق الصارم من أن مجموع الأوزان = 100%
 */
export async function setGradeItems(
  courseId: string,
  teacherId: string,
  items: CreateGradeItemInput[]
): Promise<GradeItem[]> {
  // التحقق من ملكية الأستاذ للمقرر
  const [courseRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM courses WHERE id = ? AND teacher_id = ? AND deleted_at IS NULL`,
    [courseId, teacherId]
  );
  if (courseRows.length === 0) {
    throw new Error('غير مصرح: هذا المقرر لا يتبع لك أو غير موجود');
  }

  // التحقق من أن مجموع الأوزان = 100%
  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(`مجموع أوزان الدرجات يجب أن يساوي 100% تماماً. المجموع الحالي هو: ${totalWeight}%`);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // حذف البنود القديمة التي تم إلغاؤها
    await conn.execute(`DELETE FROM course_grade_items WHERE course_id = ?`, [courseId]);

    for (const item of items) {
      await conn.execute(
        `INSERT INTO course_grade_items (course_id, name, category, weight, max_score)
         VALUES (?, ?, ?, ?, ?)`,
        [courseId, item.name, item.category, item.weight, item.max_score || 100]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // إعادة حساب الدرجات لكل الطلاب المسجلين لتحديث الإجماليات وفق الأوزان الجديدة
  const [enrolled] = await pool.execute<RowDataPacket[]>(
    `SELECT student_id FROM enrollments WHERE course_id = ? AND status = 'active'`,
    [courseId]
  );
  for (const s of enrolled) {
    await recalculateCourseGrade(courseId, s.student_id);
  }

  return getGradeItems(courseId);
}

/**
 * 3. رصد درجة طالب في بند معين مع Optimistic Locking ومعاملة ذرية
 */
export async function setStudentGrade(params: {
  courseId: string;
  studentId: string;
  gradeItemId: number;
  score: number;
  gradedBy: string;
}): Promise<void> {
  const { courseId, studentId, gradeItemId, score, gradedBy } = params;

  // التحقق من أن البند تابع لنفس المادة
  const [itemRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, max_score FROM course_grade_items WHERE id = ? AND course_id = ?`,
    [gradeItemId, courseId]
  );
  if (itemRows.length === 0) {
    throw new Error('بند التقييم غير موجود في هذا المقرر');
  }

  const maxScore = parseFloat(itemRows[0].max_score);
  if (score < 0 || score > maxScore) {
    throw new Error(`الدرجة المرصودة (${score}) غير صالحة. الحد الأقصى للبند هو ${maxScore}`);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // فحص ما إذا كان هناك تسجيل مسبق
    const [existing] = await conn.execute<RowDataPacket[]>(
      `SELECT id, version FROM student_grades WHERE student_id = ? AND grade_item_id = ? FOR UPDATE`,
      [studentId, gradeItemId]
    );

    if (existing.length === 0) {
      await conn.execute(
        `INSERT INTO student_grades (course_id, student_id, grade_item_id, score, version, graded_by, graded_at)
         VALUES (?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
        [courseId, studentId, gradeItemId, score, gradedBy]
      );
    } else {
      const currentVersion = existing[0].version;
      const [updateResult] = await conn.execute<ResultSetHeader>(
        `UPDATE student_grades
         SET score = ?, version = version + 1, graded_by = ?, graded_at = CURRENT_TIMESTAMP
         WHERE id = ? AND version = ?`,
        [score, gradedBy, existing[0].id, currentVersion]
      );

      if (updateResult.affectedRows === 0) {
        throw new Error('تم تعديل هذه الدرجة بواسطة مستخدم آخر بالتزامن. يرجى تحديث الصفحة والمحاولة مجدداً.');
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  // إعادة احتساب الدرجة الإجمالية للمقرر
  await recalculateCourseGrade(courseId, studentId);
}

/**
 * 4. إعادة حساب الدرجة الإجمالية للطالب في المقرر وحفظها في جدول enrollments
 */
export async function recalculateCourseGrade(courseId: string, studentId: string): Promise<CourseGradeResult> {
  const items = await getGradeItems(courseId);

  // حساب نسبة الحضور الفعلية تلقائياً
  const [sessionRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM attendance_sessions WHERE course_id = ?`,
    [courseId]
  );
  const totalSessions = sessionRows[0]?.total || 0;

  const [attendedRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as attended
     FROM attendance_records ar
     JOIN attendance_sessions s ON ar.session_id = s.id
     WHERE s.course_id = ? AND ar.student_id = ?`,
    [courseId, studentId]
  );
  const attendedCount = attendedRows[0]?.attended || 0;
  const attendanceRate = totalSessions > 0 ? (attendedCount / totalSessions) : 1; // 100% إذا لم تقم أي محاضرة بعد

  // جلب الدرجات المرصودة للطالب في بقية البنود
  const [scoresRows] = await pool.execute<RowDataPacket[]>(
    `SELECT grade_item_id, score FROM student_grades WHERE student_id = ? AND course_id = ?`,
    [studentId, courseId]
  );
  const scoreMap = new Map<number, number>();
  for (const row of scoresRows) {
    if (row.score !== null) {
      scoreMap.set(row.grade_item_id, parseFloat(row.score));
    }
  }

  let totalWeightedScore = 0;
  let hasAnyGrade = false;

  for (const item of items) {
    let itemScore: number | null = null;

    if (item.category === 'attendance') {
      // الحضور يحسب تلقائياً من المحاضرات
      itemScore = attendanceRate * item.max_score;
      hasAnyGrade = true;
    } else if (scoreMap.has(item.id)) {
      itemScore = scoreMap.get(item.id)!;
      hasAnyGrade = true;
    }

    if (itemScore !== null) {
      const itemPercentage = (itemScore / item.max_score);
      totalWeightedScore += itemPercentage * item.weight;
    }
  }

  totalWeightedScore = Math.min(100, Math.max(0, Math.round(totalWeightedScore * 100) / 100));

  const { letterGrade, gradePoints } = scoreToLetterAndPoints(totalWeightedScore);

  // تحديث سجل التسجيل في enrollments
  await pool.execute(
    `UPDATE enrollments 
     SET total_score = ?, letter_grade = ?, grade_points = ?
     WHERE course_id = ? AND student_id = ?`,
    [hasAnyGrade ? totalWeightedScore : null, hasAnyGrade ? letterGrade : null, hasAnyGrade ? gradePoints : null, courseId, studentId]
  );

  return {
    courseId,
    studentId,
    totalScore: totalWeightedScore,
    letterGrade,
    gradePoints,
  };
}

/**
 * 5. حساب المعدل التراكمي (GPA) الحقيقي للطالب عبر الساعات المعتمدة
 */
export async function calculateStudentGPA(studentId: string): Promise<GPAResult> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT c.id as course_id, c.name as course_name, c.code as course_code,
            c.credit_hours, e.total_score, e.letter_grade, e.grade_points,
            (SELECT COUNT(*) FROM attendance_sessions s WHERE s.course_id = c.id) as total_sessions,
            (SELECT COUNT(*) FROM attendance_records ar 
             JOIN attendance_sessions s ON ar.session_id = s.id 
             WHERE s.course_id = c.id AND ar.student_id = ?) as attended_sessions
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     WHERE e.student_id = ? AND e.status = 'active'`,
    [studentId, studentId]
  );

  let totalPointsAccumulator = 0;
  let totalGradedCredits = 0;
  let totalAllCredits = 0;

  const courses: CourseGPAEntry[] = rows.map((r) => {
    const credits = parseInt(r.credit_hours) || 3;
    totalAllCredits += credits;

    const totalSessions = parseInt(r.total_sessions) || 0;
    const attendedSessions = parseInt(r.attended_sessions) || 0;
    const attendancePercentage = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 100;

    const score = r.total_score !== null ? parseFloat(r.total_score) : null;
    const gradePoints = r.grade_points !== null ? parseFloat(r.grade_points) : null;

    if (gradePoints !== null && score !== null) {
      totalPointsAccumulator += gradePoints * credits;
      totalGradedCredits += credits;
    }

    return {
      courseId: r.course_id,
      courseName: r.course_name,
      courseCode: r.course_code,
      creditHours: credits,
      totalScore: score,
      letterGrade: r.letter_grade,
      gradePoints,
      attendancePercentage,
    };
  });

  const cumulativeGpa = totalGradedCredits > 0
    ? Math.round((totalPointsAccumulator / totalGradedCredits) * 100) / 100
    : 0.00;

  return {
    gpa: cumulativeGpa,
    totalCredits: totalAllCredits,
    gradedCredits: totalGradedCredits,
    courses,
  };
}

/**
 * 6. جلب كشف درجات الطالب لمقرر معين (تفصيل كل بند)
 */
export async function getStudentGradebook(courseId: string, studentId: string): Promise<StudentGradebookItem[]> {
  const items = await getGradeItems(courseId);

  // حساب نسبة الحضور
  const [sessionRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM attendance_sessions WHERE course_id = ?`,
    [courseId]
  );
  const totalSessions = sessionRows[0]?.total || 0;

  const [attendedRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as attended
     FROM attendance_records ar
     JOIN attendance_sessions s ON ar.session_id = s.id
     WHERE s.course_id = ? AND ar.student_id = ?`,
    [courseId, studentId]
  );
  const attendedCount = attendedRows[0]?.attended || 0;
  const attendanceRate = totalSessions > 0 ? (attendedCount / totalSessions) : 1;

  const [scores] = await pool.execute<RowDataPacket[]>(
    `SELECT grade_item_id, score FROM student_grades WHERE student_id = ? AND course_id = ?`,
    [studentId, courseId]
  );
  const scoreMap = new Map<number, number>();
  for (const s of scores) {
    if (s.score !== null) scoreMap.set(s.grade_item_id, parseFloat(s.score));
  }

  return items.map((item) => {
    let score: number | null = null;
    if (item.category === 'attendance') {
      score = Math.round(attendanceRate * item.max_score * 10) / 10;
    } else if (scoreMap.has(item.id)) {
      score = scoreMap.get(item.id)!;
    }

    const weightedScore = score !== null
      ? Math.round((score / item.max_score) * item.weight * 10) / 10
      : null;

    return {
      gradeItemId: item.id,
      name: item.name,
      category: item.category,
      weight: item.weight,
      maxScore: item.max_score,
      score,
      weightedScore,
    };
  });
}

/**
 * 7. دفتر الدرجات الكامل للمقرر للأستاذ (Moodle-Style Matrix)
 */
export async function getCourseGradebookMatrix(courseId: string, teacherId: string) {
  // التحقق من الأستاذ
  const [courseRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, name, code, credit_hours FROM courses WHERE id = ? AND teacher_id = ?`,
    [courseId, teacherId]
  );
  if (courseRows.length === 0) {
    throw new Error('المقرر غير موجود أو لا تملك صلاحية الوصول إليه');
  }

  const items = await getGradeItems(courseId);

  // جلب كل الطلاب المسجلين
  const [students] = await pool.execute<RowDataPacket[]>(
    `SELECT u.id, u.name, u.email, u.student_id, e.total_score, e.letter_grade, e.grade_points
     FROM enrollments e
     JOIN users u ON e.student_id = u.id
     WHERE e.course_id = ? AND e.status = 'active'
     ORDER BY u.name ASC`,
    [courseId]
  );

  // جلب كل الدرجات المرصودة
  const [allScores] = await pool.execute<RowDataPacket[]>(
    `SELECT student_id, grade_item_id, score FROM student_grades WHERE course_id = ?`,
    [courseId]
  );
  const studentScoresMap = new Map<string, Map<number, number>>();
  for (const row of allScores) {
    if (!studentScoresMap.has(row.student_id)) {
      studentScoresMap.set(row.student_id, new Map());
    }
    studentScoresMap.get(row.student_id)!.set(row.grade_item_id, parseFloat(row.score));
  }

  // حساب الحضور لكل طالب
  const [sessionRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM attendance_sessions WHERE course_id = ?`,
    [courseId]
  );
  const totalSessions = sessionRows[0]?.total || 0;

  const [attendanceCounts] = await pool.execute<RowDataPacket[]>(
    `SELECT ar.student_id, COUNT(*) as attended
     FROM attendance_records ar
     JOIN attendance_sessions s ON ar.session_id = s.id
     WHERE s.course_id = ?
     GROUP BY ar.student_id`,
    [courseId]
  );
  const attendanceMap = new Map<string, number>();
  for (const a of attendanceCounts) {
    attendanceMap.set(a.student_id, a.attended);
  }

  const studentEntries = students.map((s) => {
    const attended = attendanceMap.get(s.id) || 0;
    const attendancePercentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;

    const scoresObj: Record<number, number | null> = {};
    for (const item of items) {
      if (item.category === 'attendance') {
        scoresObj[item.id] = Math.round((attendancePercentage / 100) * item.max_score * 10) / 10;
      } else {
        const studentMap = studentScoresMap.get(s.id);
        scoresObj[item.id] = studentMap && studentMap.has(item.id) ? studentMap.get(item.id)! : null;
      }
    }

    return {
      studentId: s.id,
      studentName: s.name,
      studentNumber: s.student_id || s.email,
      attendancePercentage,
      scores: scoresObj,
      totalScore: s.total_score !== null ? parseFloat(s.total_score) : null,
      letterGrade: s.letter_grade,
      gradePoints: s.grade_points !== null ? parseFloat(s.grade_points) : null,
    };
  });

  return {
    course: courseRows[0],
    gradeItems: items,
    totalSessions,
    students: studentEntries,
  };
}
