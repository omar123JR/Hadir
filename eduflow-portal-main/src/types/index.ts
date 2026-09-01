export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  student_id?: string | null;
  teacher_code?: string | null;
  department?: string | null;
  avatar?: string | null;
  // Legacy camelCase aliases kept for compatibility
  studentId?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  teacher_id?: string;
  teacher_name?: string;
  teacher_department?: string;
  students_count?: number;
  lectures_count?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceSession {
  id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  date: string;
  time: string;
  qr_code: string;
  status: 'active' | 'closed';
  created_by: string;
  created_at: string;
  closed_at: string | null;
  attendees_count: number;
}

export interface StudentAttendanceSummary {
  courseId: string;
  course_name: string;
  totalLectures: number;
  attendedLectures: number;
  percentage: number;
}

export interface AttendanceRecord {
  id: number;
  session_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_number: string | null;
  attendance_time: string;
  method: 'qr' | 'manual';
  courseId: string;
  course_name: string;
  course_code: string;
  date: string;
  time: string;
}

export interface Lecture {
  id: string;
  course_id: string;
  course_name?: string;
  course_code?: string;
  title: string;
  date: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: string | null;
  file_type?: string | null;
  created_at?: string;
  updated_at?: string;
  // Frontend mapped aliases
  courseId?: string;
  fileUrl?: string;
  fileSize?: string;
  fileType?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'submitted' | 'graded' | 'missed';
  grade?: string;

  // Backend snake_case properties (primary)
  course_id?: string;
  course_name?: string;
  course_code?: string;
  due_date?: string;
  file_url?: string | null;
  file_name?: string | null;
  created_at?: string;
  updated_at?: string;
  submitted_count?: number;
  total_students?: number;
  graded_count?: number;

  // Frontend mapped aliases
  courseId?: string;
  courseCode?: string;
  dueDate?: string;
  submittedCount?: number;
  totalStudents?: number;
}

export interface Grade {
  id: string;
  courseId: string;
  courseName: string;
  studentId: string;
  grade: string;
  percentage: number;
}
