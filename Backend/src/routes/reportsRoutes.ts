import { Router } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Admin Stats
router.get('/admin', authenticate, async (req: any, res) => {
    try {
        const [users] = await pool.execute<any[]>('SELECT count(*) as count FROM users');
        const [admins] = await pool.execute<any[]>('SELECT count(*) as count FROM admin_accounts');
        const [courses] = await pool.execute<any[]>('SELECT count(*) as count FROM courses');
        const [students] = await pool.execute<any[]>('SELECT count(*) as count FROM users WHERE role = "student"');
        const [teachers] = await pool.execute<any[]>('SELECT count(*) as count FROM users WHERE role = "teacher"');

        res.json({
            success: true,
            data: {
                totalUsers: users[0].count + admins[0].count,
                admins: admins[0].count,
                staff: teachers[0].count,
                students: students[0].count,
                courses: courses[0].count
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Teacher Stats
router.get('/teacher', authenticate, async (req: any, res) => {
    try {
        const teacherId = req.user.userId;

        const [courses] = await pool.execute<any[]>(
            'SELECT id, name, code FROM courses WHERE teacher_id = ?',
            [teacherId]
        );

        let totalStudents = 0;
        if (courses.length > 0) {
            const [studentsRow] = await pool.query<any[]>(
                `SELECT count(DISTINCT student_id) as count FROM enrollments WHERE course_id IN (?) AND status = 'active'`,
                [courses.map(c => c.id)]
            );
            totalStudents = studentsRow[0]?.count || 0;
        }

        const avgAttendance = 0; // Keeping simple as before

        res.json({
            success: true,
            data: {
                totalCourses: courses.length,
                totalStudents: totalStudents,
                averageAttendance: avgAttendance,
                courses: courses
            }
        });
    } catch (error) {
        console.error('Error fetching teacher stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Student Stats
router.get('/student', authenticate, async (req: any, res) => {
    try {
        const userId = req.user.userId;

        const [enrollments] = await pool.execute<any[]>(
            `SELECT c.id, c.name, c.code, e.final_grade, e.attendance_override,
              (SELECT count(*) FROM attendance_sessions ats WHERE ats.course_id = c.id AND ats.status = 'active') +
              (SELECT count(*) FROM attendance_sessions ats WHERE ats.course_id = c.id AND ats.status = 'closed') as total_lectures,
              (SELECT count(*) FROM attendance_records ar
               JOIN attendance_sessions ats ON ar.session_id = ats.id
               WHERE ats.course_id = c.id AND ar.student_id = ?) as attended_lectures
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ? AND e.status = 'active'`,
            [userId, userId]
        );

        const coursesWithStats = enrollments.map((c: any) => {
            const total = parseInt(c.total_lectures) || 0;
            const baseAttended = parseInt(c.attended_lectures) || 0;
            const override = parseInt(c.attendance_override) || 0;
            const attended = baseAttended + override;
            const percentage = total > 0 ? Math.round((attended / total) * 100) : (attended > 0 ? 100 : 0);
            
            return { 
                ...c, 
                total_lectures: total, 
                attended_lectures: attended, 
                attendancePercentage: percentage,
                finalGrade: c.final_grade 
            };
        });

        const avg = coursesWithStats.length > 0
            ? Math.round(coursesWithStats.reduce((acc: number, c: any) => acc + c.attendancePercentage, 0) / coursesWithStats.length)
            : 0;

        res.json({
            success: true,
            data: {
                enrolledCourses: enrollments.length,
                attendanceRate: Math.min(100, avg), // Cap at 100% just in case
                assignmentsCompleted: 0,
                courses: coursesWithStats
            }
        });

    } catch (error) {
        console.error('Error fetching student stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Teacher: Get specific course details (students & attendance & grades)
router.get('/teacher/course/:courseId', authenticate, async (req: any, res) => {
    try {
        const { courseId } = req.params;

        const [courseRows] = await pool.execute<any[]>('SELECT name, code FROM courses WHERE id = ?', [courseId]);
        if (courseRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        const course = courseRows[0];

        const [students] = await pool.execute<any[]>(
            `SELECT 
                u.id, 
                u.name, 
                u.student_id, 
                u.avatar,
                e.final_grade,
                e.attendance_override,
                (SELECT count(*) FROM attendance_records ar 
                 JOIN attendance_sessions as2 ON ar.session_id = as2.id 
                 WHERE as2.course_id = ? AND ar.student_id = u.id) as attended_count,
                (SELECT count(*) FROM attendance_sessions WHERE course_id = ?) as total_lectures
             FROM enrollments e
             JOIN users u ON e.student_id = u.id
             WHERE e.course_id = ? AND e.status = 'active'`,
            [courseId, courseId, courseId]
        );

        const studentsWithStats = students.map(s => {
            const total = s.total_lectures || 0;
            const baseAttended = s.attended_count || 0;
            const override = parseInt(s.attendance_override) || 0;
            const attended = baseAttended + override;
            const percentage = total > 0 ? Math.round((attended / total) * 100) : (attended > 0 ? 100 : 0);
            
            return {
                id: s.id,
                name: s.name,
                studentId: s.student_id,
                avatar: s.avatar,
                attendancePercentage: Math.min(100, percentage),
                attendedLectures: attended,
                totalLectures: total,
                finalGrade: s.final_grade,
                attendanceOverride: override
            };
        });

        res.json({
            success: true,
            data: {
                course: course,
                students: studentsWithStats
            }
        });

    } catch (error) {
        console.error('Error fetching course details:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Teacher: Update grades and attendance for a course
router.put('/teacher/course/:courseId/update', authenticate, async (req: any, res) => {
    try {
        const { courseId } = req.params;
        const { updates } = req.body; // updates: [{ studentId: '...', finalGrade: 'A', attendanceOverride: 2 }, ...]

        if (!Array.isArray(updates)) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        for (const update of updates) {
            const { studentId, finalGrade, attendanceOverride } = update;
            await pool.execute(
                `UPDATE enrollments SET final_grade = ?, attendance_override = ? WHERE course_id = ? AND student_id = ?`,
                [finalGrade || null, attendanceOverride || 0, courseId, studentId]
            );
        }

        res.json({ success: true, message: 'Updated successfully' });
    } catch (error) {
        console.error('Error updating course details:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
