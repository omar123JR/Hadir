import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, Clock, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Course } from '@/types';

interface TeacherCourseDetailsProps {
  course: Course;
  onBack: () => void;
}

interface AttendanceSession {
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

interface AttendanceRecord {
  id: number;
  session_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  attendance_time: string;
  method: 'qr' | 'manual';
}

interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  student_id: string;
  enrollment_date: string;
}

export function TeacherCourseDetails({ course, onBack }: TeacherCourseDetailsProps) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showStudents, setShowStudents] = useState(false);

  useEffect(() => {
    loadCourseSessions();
  }, [course.id]);

  const loadCourseSessions = async () => {
    try {
      const response = await api.get(`/attendance/teacher/course/${course.id}/sessions`);
      if (response.success) {
        setSessions(response.data);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionAttendance = async (session: AttendanceSession) => {
    try {
      const response = await api.get(`/attendance/teacher/sessions/${session.id}/attendees`);
      if (response.success) {
        setAttendanceRecords(response.data);
        setSelectedSession(session);
        setShowAttendance(true);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const loadEnrolledStudents = async () => {
    if (enrolledStudents.length > 0) {
      setShowStudents(true);
      return;
    }

    setLoadingStudents(true);
    try {
      // تأكد من أن course.id صحيح
      console.log('Loading students for course:', course.id, 'type:', typeof course.id);

      if (!course.id || typeof course.id !== 'string') {
        throw new Error('Invalid course ID');
      }

      const url = `/courses/${encodeURIComponent(course.id)}/students`;
      console.log('Making request to URL:', url);

      const response = await api.get(url);
      console.log('Students response:', response);

      if (response.success) {
        setEnrolledStudents(response.data);
        setShowStudents(true);
      } else {
        throw new Error(response.message || 'Failed to load students');
      }
    } catch (error: any) {
      console.error('Error loading enrolled students:', error);
      // عرض رسالة خطأ للمستخدم
      alert(error.message || 'فشل في تحميل قائمة الطلاب');
    } finally {
      setLoadingStudents(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  if (showAttendance && selectedSession) {
    return (
      <div className="space-y-6 animate-slideUp">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setShowAttendance(false)}>
            <ArrowLeft className="w-4 h-4 ml-2" />
            العودة
          </Button>
          <h2 className="text-lg font-bold text-foreground">سجل الحضور</h2>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border">
          <h3 className="font-bold text-foreground mb-2">{selectedSession.course_name}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {formatDate(selectedSession.date)} • {formatTime(selectedSession.time)}
          </p>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span>عدد الحاضرين:</span>
              <span className="font-bold text-success">{attendanceRecords.length}</span>
            </div>

            {attendanceRecords.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا يوجد طلاب حاضرين</p>
            ) : (
              <div className="space-y-2">
                {attendanceRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{record.student_name}</p>
                      <p className="text-xs text-muted-foreground">{record.student_email}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">{record.attendance_time}</p>
                      <p className="text-xs">
                        {record.method === 'qr' ? 'مسح QR' : 'يدوي'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 ml-2" />
          العودة
        </Button>
        <h2 className="text-lg font-bold text-foreground">تفاصيل المادة</h2>
      </div>

      {/* Course Info */}
      <div className="bg-card p-6 rounded-xl border border-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
            {course.code.split('-')[0]}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{course.name}</h3>
            <p className="text-muted-foreground">{course.code}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{course.students_count || 0} طالب</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{sessions.length} محاضرة</span>
          </div>
        </div>

        {course.description && (
          <p className="text-sm text-muted-foreground mt-4">{course.description}</p>
        )}

        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadEnrolledStudents}
            disabled={loadingStudents}
            className="w-full"
          >
            <UserCheck className="w-4 h-4 ml-2" />
            {loadingStudents ? 'جاري التحميل...' : 'عرض الطلاب المسجلين'}
          </Button>
        </div>
      </div>

      {/* Enrolled Students */}
      {showStudents && (
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              الطلاب المسجلين ({enrolledStudents.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStudents(false)}
            >
              إخفاء
            </Button>
          </div>

          {enrolledStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا يوجد طلاب مسجلين في هذا المقرر</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {enrolledStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                      <p className="text-xs text-muted-foreground">رقم الطالب: {student.student_id}</p>
                    </div>
                  </div>
                  <div className="text-left text-xs text-muted-foreground">
                    مسجل منذ: {new Date(student.enrollment_date).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attendance Sessions */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          جلسات الحضور
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد جلسات حضور لهذه المادة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-card p-4 rounded-xl border border-border hover:border-primary/20 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-foreground">{formatDate(session.date)}</p>
                    <p className="text-sm text-muted-foreground">{formatTime(session.time)}</p>
                  </div>
                  <div className="text-left">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      session.status === 'active'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {session.status === 'active' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {session.status === 'active' ? 'نشط' : 'مغلق'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {session.attendees_count} حاضر
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadSessionAttendance(session)}
                  >
                    عرض السجل
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}