import { useState, useEffect } from 'react';
import { RefreshCw, Users, Wifi, WifiOff, Plus, X, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api, getTeacherCourses } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface Course {
  id: string;
  code: string;
  name: string;
  teacher_id: string;
}

export function TeacherCheckIn() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state for creating new session
  const [formData, setFormData] = useState({
    course_id: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
  });

  useEffect(() => {
    loadCourses();
    loadActiveSessions();
  }, []);

  const loadCourses = async () => {
    try {
      let courses;
      if (user?.role === 'admin') {
        // Admin can see all courses
        const response = await api.get('/admin/courses');
        courses = response.data;
      } else {
        // Teacher sees only their courses
        courses = await getTeacherCourses();
      }
      setCourses(courses);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل المواد.',
        variant: 'destructive',
      });
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await api.get('/attendance/teacher/sessions/active');
      if (response.success) {
        setSessions(response.data);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createSession = async () => {
    if (!formData.course_id || !formData.date || !formData.time) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/attendance/teacher/sessions', formData);
      if (response.success) {
        toast({
          title: 'تم إنشاء الجلسة بنجاح',
          description: `رمز QR: ${response.data.qr_code}`,
        });
        setShowCreateForm(false);
        setFormData({
          course_id: '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
        });
        loadActiveSessions();
      }
    } catch (error: any) {
      toast({
        title: 'خطأ في إنشاء الجلسة',
        description: error.message || 'يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshQR = async (sessionId: string) => {
    try {
      const response = await api.post(`/attendance/teacher/sessions/${sessionId}/refresh-qr`, {});
      if (response.success) {
        toast({
          title: 'تم تجديد الرمز',
          description: `الرمز الجديد: ${response.data.qr_code}`,
        });
        loadActiveSessions();
      }
    } catch (error: any) {
      toast({
        title: 'خطأ في تجديد الرمز',
        description: error.message || 'يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    }
  };

  const closeSession = async (sessionId: string) => {
    try {
      await api.post(`/attendance/teacher/sessions/${sessionId}/close`, {});
      toast({
        title: 'تم إغلاق الجلسة',
        description: 'لم يعد بإمكان الطلاب التسجيل',
      });
      loadActiveSessions();
    } catch (error: any) {
      toast({
        title: 'خطأ في إغلاق الجلسة',
        description: error.message || 'يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    }
  };

  const viewAttendees = async (session: AttendanceSession) => {
    setLoading(true);
    try {
      const response = await api.get(`/attendance/teacher/sessions/${session.id}/attendees`);
      if (response.success) {
        setAttendees(response.data);
        setSelectedSession(session);
        setShowAttendeesModal(true);
      }
    } catch (error) {
      console.error('Error loading attendees:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل قائمة الحضور',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (showCreateForm) {
    return (
      <div className="space-y-6 animate-slideUp">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">إنشاء جلسة حضور</h2>
          <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">المادة</label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="w-full p-3 border border-border rounded-xl bg-background"
            >
              <option value="">اختر المادة</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">التاريخ</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full p-3 border border-border rounded-xl bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">الوقت</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full p-3 border border-border rounded-xl bg-background"
            />
          </div>

          <Button
            onClick={createSession}
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء الجلسة'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">إدارة الحضور</h2>
          <p className="text-muted-foreground text-sm">إنشاء وإدارة جلسات الحضور</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="gradient-primary">
          <Plus className="w-4 h-4 ml-2" />
          جلسة جديدة
        </Button>
      </div>

      {/* Active Sessions */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد جلسات حضور نشطة
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-card p-4 rounded-2xl border border-border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-foreground">{session.course_name}</h3>
                  <p className="text-sm text-muted-foreground">{session.course_code}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {session.date} • {session.time}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {session.qr_code}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {session.attendees_count} حاضر
                  </p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${session.qr_code}`}
                  alt="QR Code"
                  className="w-32 h-32 rounded-lg border"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refreshQR(session.id)}
                  className="flex-1"
                >
                  <RefreshCw className="w-3 h-3 ml-1" />
                  تجديد
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => viewAttendees(session)}
                  className="flex-1"
                >
                  <Users className="w-3 h-3 ml-1" />
                  الحضور
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => closeSession(session.id)}
                  className="flex-1"
                >
                  <X className="w-3 h-3 ml-1" />
                  إغلاق
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Offline Mode Toggle */}
      <div className="pt-4 border-t border-border">
        <div className="bg-warning/10 border border-warning/20 p-3 rounded-xl flex justify-between items-center">
          <div>
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              {isOffline ? (
                <WifiOff className="w-4 h-4 text-destructive" />
              ) : (
                <Wifi className="w-4 h-4 text-success" />
              )}
              وضع عدم الاتصال
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isOffline ? 'الحفظ محلي - المزامنة لاحقاً' : 'متصل بالخادم'}
            </p>
          </div>
          <button
            onClick={() => setIsOffline(!isOffline)}
            className={`w-12 h-7 rounded-full relative transition-colors duration-300 shadow-inner cursor-pointer ${
              isOffline ? 'bg-warning' : 'bg-muted'
            }`}
          >
            <span
              className={`block w-5 h-5 bg-card rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${
                isOffline ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Attendees Modal */}
      <Dialog open={showAttendeesModal} onOpenChange={setShowAttendeesModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              قائمة الحضور - {selectedSession?.course_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {attendees.length === 0 ? (
              <p className="text-center text-muted-foreground">لا يوجد طلاب حاضرين بعد</p>
            ) : (
              <div className="space-y-2">
                {attendees.map((attendee, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                    <div>
                      <p className="font-medium">{attendee.student_name}</p>
                      <p className="text-sm text-muted-foreground">{attendee.student_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{attendee.attendance_time}</p>
                      <p className="text-xs text-muted-foreground">{attendee.method === 'qr' ? 'مسح QR' : 'يدوي'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
