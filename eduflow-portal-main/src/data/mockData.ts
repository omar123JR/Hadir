import { Course, Lecture, Assignment, AttendanceSession, StudentAttendanceSummary, Grade, User } from '@/types';

export const MOCK_COURSES: Course[] = [
  {
    id: '1',
    code: 'CS-302',
    name: 'برمجة ويب (Django)',
    teacherId: '2',
    teacherName: 'د. أحمد علي',
    students: [
      '4', '5',
      '1001','1002','1003','1004','1005','1006','1007','1008','1009','1010',
      '1011','1012','1013','1014','1015','1016','1017','1018'
    ],
    lecturesCount: 12,
    description: 'تعلم تطوير تطبيقات الويب باستخدام Django',
  },
  {
    id: '2',
    code: 'CS-201',
    name: 'قواعد بيانات متقدمة',
    teacherId: '3',
    teacherName: 'د. مها السعيد',
    students: ['4', '5'],
    lecturesCount: 8,
    description: 'مفاهيم متقدمة في قواعد البيانات العلائقية',
  },
  {
    id: '3',
    code: 'AI-101',
    name: 'مقدمة في الذكاء الاصطناعي',
    teacherId: '2',
    teacherName: 'د. أحمد علي',
    students: [
      '1019','1020','1021','1022','1023','1024','1025','1026','1027','1028',
      '1029','1030','1031','1032','1033','1034','1035','1036','1037','1038'
    ],
    lecturesCount: 15,
    description: 'أساسيات الذكاء الاصطناعي وتعلم الآلة',
  },
  {
    id: '4',
    code: 'SEC-400',
    name: 'أمن سيبراني',
    teacherId: '3',
    teacherName: 'د. مها السعيد',
    students: ['5'],
    lecturesCount: 10,
    description: 'حماية الأنظمة والشبكات من الهجمات',
  },
];

export const MOCK_LECTURES: Record<string, Lecture[]> = {
  '1': [
    { id: '1', courseId: '1', title: 'المحاضرة 1: مقدمة Django', date: '2024-10-01', fileSize: '2.4 MB', fileType: 'PDF' },
    { id: '2', courseId: '1', title: 'المحاضرة 2: نمط MVT', date: '2024-10-08', fileSize: '1.8 MB', fileType: 'PDF' },
    { id: '3', courseId: '1', title: 'المحاضرة 3: Signals', date: '2024-10-15', fileSize: '3.1 MB', fileType: 'PDF' },
  ],
  '2': [
    { id: '4', courseId: '2', title: 'المحاضرة 1: SQL متقدم', date: '2024-10-02', fileSize: '1.5 MB', fileType: 'PDF' },
    { id: '5', courseId: '2', title: 'المحاضرة 2: تحسين الأداء', date: '2024-10-09', fileSize: '2.0 MB', fileType: 'PDF' },
  ],
  '3': [
    { id: '6', courseId: '3', title: 'المحاضرة 1: ما هو الذكاء الاصطناعي؟', date: '2024-10-03', fileSize: '4.2 MB', fileType: 'PDF' },
  ],
};

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: '1', courseId: '1', courseCode: 'CS-302', title: 'واجب 1: نموذج حضور', dueDate: '2024-10-10', status: 'pending', submittedCount: 10, totalStudents: 120 },
  { id: '2', courseId: '2', courseCode: 'CS-201', title: 'واجب 2: تحليل بيانات', dueDate: '2024-10-18', status: 'submitted', grade: '9/10' },
  { id: '3', courseId: '3', courseCode: 'AI-101', title: 'مشروع صغير: QR Service', dueDate: '2024-10-25', status: 'pending', submittedCount: 0, totalStudents: 120 },
  { id: '4', courseId: '4', courseCode: 'SEC-400', title: 'قراءة بحث: أمن الشبكات', dueDate: '2024-10-01', status: 'graded', grade: 'A' },
];

export const MOCK_ATTENDANCE_SESSIONS: AttendanceSession[] = [
  {
    id: '1',
    course_id: '1',
    course_name: 'برمجة ويب (Django)',
    course_code: 'CS-302',
    date: '2024-12-14',
    time: '09:30',
    qr_code: 'ATT-001',
    status: 'active',
    created_by: '2',
    created_at: '2024-12-14T09:30:00Z',
    closed_at: null,
    attendees_count: 1,
    attendees: ['4'],
  },
];

export const MOCK_ATTENDANCE_RECORDS: Record<string, StudentAttendanceSummary[]> = {
  '4': [
    { courseId: '1', course_name: 'برمجة ويب (Django)', totalLectures: 12, attendedLectures: 11, percentage: 92 },
    { courseId: '2', course_name: 'قواعد بيانات متقدمة', totalLectures: 8, attendedLectures: 7, percentage: 88 },
    { courseId: '3', course_name: 'مقدمة في الذكاء الاصطناعي', totalLectures: 15, attendedLectures: 15, percentage: 100 },
  ],
  '5': [
    { courseId: '1', course_name: 'برمجة ويب (Django)', totalLectures: 12, attendedLectures: 10, percentage: 83 },
    { courseId: '2', course_name: 'قواعد بيانات متقدمة', totalLectures: 8, attendedLectures: 8, percentage: 100 },
    { courseId: '4', course_name: 'أمن سيبراني', totalLectures: 10, attendedLectures: 9, percentage: 90 },
  ],
};

export const MOCK_GRADES: Record<string, Grade[]> = {
  '4': [
    { id: '1', courseId: '1', courseName: 'برمجة ويب (Django)', studentId: '4', grade: 'A+', percentage: 98 },
    { id: '2', courseId: '2', courseName: 'قواعد بيانات متقدمة', studentId: '4', grade: 'B', percentage: 85 },
    { id: '3', courseId: '3', courseName: 'مقدمة في الذكاء الاصطناعي', studentId: '4', grade: 'A', percentage: 95 },
  ],
  '5': [
    { id: '4', courseId: '1', courseName: 'برمجة ويب (Django)', studentId: '5', grade: 'A', percentage: 93 },
    { id: '5', courseId: '2', courseName: 'قواعد بيانات متقدمة', studentId: '5', grade: 'A-', percentage: 90 },
    { id: '6', courseId: '4', courseName: 'أمن سيبراني', studentId: '5', grade: 'B+', percentage: 87 },
  ],
};

export const MOCK_ALL_USERS: User[] = [
  { id: '2', name: 'د. أحمد علي', email: 'ahmed@university.edu', role: 'teacher', department: 'علوم الحاسوب' },
  { id: '3', name: 'د. مها السعيد', email: 'maha@university.edu', role: 'teacher', department: 'الذكاء الاصطناعي' },
  { id: '4', name: 'أيمن محمد', email: 'ayman@student.edu', role: 'student', studentId: '20251034', department: 'علوم الحاسوب' },
  { id: '5', name: 'سارة أحمد', email: 'sara@student.edu', role: 'student', studentId: '20251035', department: 'علوم الحاسوب' },
  // Generated additional students to reflect actual class sizes (IDs 1001-1038)
  { id: '1001', name: 'طالب 1001', email: '1001@student.edu', role: 'student', studentId: '20251101', department: 'علوم الحاسوب' },
  { id: '1002', name: 'طالب 1002', email: '1002@student.edu', role: 'student', studentId: '20251102', department: 'علوم الحاسوب' },
  { id: '1003', name: 'طالب 1003', email: '1003@student.edu', role: 'student', studentId: '20251103', department: 'علوم الحاسوب' },
  { id: '1004', name: 'طالب 1004', email: '1004@student.edu', role: 'student', studentId: '20251104', department: 'علوم الحاسوب' },
  { id: '1005', name: 'طالب 1005', email: '1005@student.edu', role: 'student', studentId: '20251105', department: 'علوم الحاسوب' },
  { id: '1006', name: 'طالب 1006', email: '1006@student.edu', role: 'student', studentId: '20251106', department: 'علوم الحاسوب' },
  { id: '1007', name: 'طالب 1007', email: '1007@student.edu', role: 'student', studentId: '20251107', department: 'علوم الحاسوب' },
  { id: '1008', name: 'طالب 1008', email: '1008@student.edu', role: 'student', studentId: '20251108', department: 'علوم الحاسوب' },
  { id: '1009', name: 'طالب 1009', email: '1009@student.edu', role: 'student', studentId: '20251109', department: 'علوم الحاسوب' },
  { id: '1010', name: 'طالب 1010', email: '1010@student.edu', role: 'student', studentId: '20251110', department: 'علوم الحاسوب' },
  { id: '1011', name: 'طالب 1011', email: '1011@student.edu', role: 'student', studentId: '20251111', department: 'علوم الحاسوب' },
  { id: '1012', name: 'طالب 1012', email: '1012@student.edu', role: 'student', studentId: '20251112', department: 'علوم الحاسوب' },
  { id: '1013', name: 'طالب 1013', email: '1013@student.edu', role: 'student', studentId: '20251113', department: 'علوم الحاسوب' },
  { id: '1014', name: 'طالب 1014', email: '1014@student.edu', role: 'student', studentId: '20251114', department: 'علوم الحاسوب' },
  { id: '1015', name: 'طالب 1015', email: '1015@student.edu', role: 'student', studentId: '20251115', department: 'علوم الحاسوب' },
  { id: '1016', name: 'طالب 1016', email: '1016@student.edu', role: 'student', studentId: '20251116', department: 'علوم الحاسوب' },
  { id: '1017', name: 'طالب 1017', email: '1017@student.edu', role: 'student', studentId: '20251117', department: 'علوم الحاسوب' },
  { id: '1018', name: 'طالب 1018', email: '1018@student.edu', role: 'student', studentId: '20251118', department: 'علوم الحاسوب' },
  { id: '1019', name: 'طالب 1019', email: '1019@student.edu', role: 'student', studentId: '20251119', department: 'علوم الحاسوب' },
  { id: '1020', name: 'طالب 1020', email: '1020@student.edu', role: 'student', studentId: '20251120', department: 'علوم الحاسوب' },
  { id: '1021', name: 'طالب 1021', email: '1021@student.edu', role: 'student', studentId: '20251121', department: 'علوم الحاسوب' },
  { id: '1022', name: 'طالب 1022', email: '1022@student.edu', role: 'student', studentId: '20251122', department: 'علوم الحاسوب' },
  { id: '1023', name: 'طالب 1023', email: '1023@student.edu', role: 'student', studentId: '20251123', department: 'علوم الحاسوب' },
  { id: '1024', name: 'طالب 1024', email: '1024@student.edu', role: 'student', studentId: '20251124', department: 'علوم الحاسوب' },
  { id: '1025', name: 'طالب 1025', email: '1025@student.edu', role: 'student', studentId: '20251125', department: 'علوم الحاسوب' },
  { id: '1026', name: 'طالب 1026', email: '1026@student.edu', role: 'student', studentId: '20251126', department: 'علوم الحاسوب' },
  { id: '1027', name: 'طالب 1027', email: '1027@student.edu', role: 'student', studentId: '20251127', department: 'علوم الحاسوب' },
  { id: '1028', name: 'طالب 1028', email: '1028@student.edu', role: 'student', studentId: '20251128', department: 'علوم الحاسوب' },
  { id: '1029', name: 'طالب 1029', email: '1029@student.edu', role: 'student', studentId: '20251129', department: 'علوم الحاسوب' },
  { id: '1030', name: 'طالب 1030', email: '1030@student.edu', role: 'student', studentId: '20251130', department: 'علوم الحاسوب' },
  { id: '1031', name: 'طالب 1031', email: '1031@student.edu', role: 'student', studentId: '20251131', department: 'علوم الحاسوب' },
  { id: '1032', name: 'طالب 1032', email: '1032@student.edu', role: 'student', studentId: '20251132', department: 'علوم الحاسوب' },
  { id: '1033', name: 'طالب 1033', email: '1033@student.edu', role: 'student', studentId: '20251133', department: 'علوم الحاسوب' },
  { id: '1034', name: 'طالب 1034', email: '1034@student.edu', role: 'student', studentId: '20251134', department: 'علوم الحاسوب' },
  { id: '1035', name: 'طالب 1035', email: '1035@student.edu', role: 'student', studentId: '20251135', department: 'علوم الحاسوب' },
  { id: '1036', name: 'طالب 1036', email: '1036@student.edu', role: 'student', studentId: '20251136', department: 'علوم الحاسوب' },
  { id: '1037', name: 'طالب 1037', email: '1037@student.edu', role: 'student', studentId: '20251137', department: 'علوم الحاسوب' },
  { id: '1038', name: 'طالب 1038', email: '1038@student.edu', role: 'student', studentId: '20251138', department: 'علوم الحاسوب' },
];

// Additional users imported from db.txt
import seed from './seed.json';

export const SEED_ADMINS = (seed && seed.admins) || [];

export const SEED_USERS: User[] = ((seed && seed.users) || []).map((u: any) => ({
  id: String(u.id || u.studentId || u.email),
  name: u.name,
  email: u.email || `${u.studentId}@student.edu`,
  role: u.role === 'معلم' || u.role === 'teacher' || u.role === 'معلمة' ? 'teacher' : 'student',
  studentId: u.studentId || undefined,
  department: u.department,
}));

// Merge seed users with built-in mock users
export const ALL_USERS = [...MOCK_ALL_USERS, ...SEED_USERS];

export const SCHEDULE_DATA = [
  { day: 'السبت', classes: [{ name: 'معمارية الكمبيوتر', time: '12:00 - 03:00', loc: 'قاعة 301', courseId: '1' }] },
  { day: 'الأحد', classes: [] },
  { day: 'الإثنين', classes: [{ name: 'علم بيانات', time: '09:00 - 12:00', loc: 'معمل 2', courseId: '2' }] },
  { day: 'الثلاثاء', classes: [{ name: 'مقدمة في التشفير', time: '09:30 - 12:30', loc: 'قاعة 105', courseId: '3' }] },
  { day: 'الأربعاء', classes: [
    { name: 'تصميم وهندسة البرمجيات', time: '10:30 - 12:30', loc: 'قاعة 202', courseId: '1' },
    { name: 'ندوة المواضيع الحديثة', time: '12:30 - 01:30', loc: 'المدرج الرئيسي', courseId: '2' },
  ]},
  { day: 'الخميس', classes: [
    { name: 'تصميم وهندسة البرمجيات', time: '09:00 - 11:00', loc: 'قاعة 202', courseId: '1' },
    { name: 'شبكات', time: '11:00 - 02:00', loc: 'معمل الشبكات', courseId: '4' },
  ]},
];
