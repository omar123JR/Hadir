import { useState, useEffect, useMemo } from 'react';
import { Clock, QrCode, UploadCloud, FileText, BookOpen, ArrowLeft, Users, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { api, getTeacherCourses } from '@/lib/api';
import { Course } from '@/types';

interface TeacherHomeProps {
  onNavigate: (tab: string, data?: unknown) => void;
}

export function TeacherHome({ onNavigate }: TeacherHomeProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // We want to poll for active session updates in case they change
  useEffect(() => {
    loadData();
    // Poll every 30 seconds for active sessions
    const interval = setInterval(loadActiveSession, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCourses(),
        loadActiveSession()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const data = await getTeacherCourses();
      setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadActiveSession = async () => {
    try {
      const response = await api.get('/attendance/teacher/sessions/active');
      if (response.success && response.data && response.data.length > 0) {
        setActiveSession(response.data[0]);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error loading active session:', error);
    }
  };
  
  const myCourses = useMemo(() => courses, [courses]);

  const totalStudents = useMemo(() => 
    myCourses.reduce((sum, c) => sum + (c.students_count || 0), 0),
    [myCourses]
  );

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          مرحباً، {user?.name}! 👋
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          لديك {myCourses.length} مواد للتدريس اليوم
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={myCourses.length} label="مواد" variant="primary" icon={BookOpen} />
        <StatCard value={totalStudents} label="طالب" variant="success" icon={Users} />
        <StatCard value="0" label="تنبيهات" variant="warning" icon={Bell} />
      </div>

      {/* Current Session Card */}
      <div className="gradient-hero rounded-2xl p-5 shadow-glow text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary-foreground rounded-full" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary-foreground rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="bg-primary-foreground/20 px-2 py-1 rounded-lg text-xs font-medium border border-primary-foreground/30 backdrop-blur-sm">
                الآن
              </span>
              <h3 className="text-lg font-bold mt-2">
                {activeSession ? activeSession.course_name : 'لا توجد جلسات نشطة حالياً'}
              </h3>
              <p className="text-primary-foreground/80 text-xs">
                {activeSession ? `${activeSession.date} • ${activeSession.time}` : 'يمكنك بدء جلسة حضور جديدة'}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <Button
            onClick={() => onNavigate('checkin')}
            variant="secondary"
            className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold py-6"
          >
            <QrCode className="w-5 h-5 ml-2" />
            إدارة الحضور (QR)
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink
          icon={UploadCloud}
          iconColor="text-purple-600"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
          label="رفع محاضرة"
          sub="ملف PDF"
          onClick={() => onNavigate('lectures')}
        />
        <QuickLink
          icon={FileText}
          iconColor="text-orange-600"
          bgColor="bg-orange-50 dark:bg-orange-900/20"
          label="إضافة واجب"
          sub="للطلاب"
          onClick={() => onNavigate('assignments')}
        />
      </div>

      {/* My Courses */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          المواد التي أدرسها
        </h3>
        <div className="space-y-3">
          {myCourses.map((course) => (
            <div
              key={course.id}
              onClick={() => onNavigate('course-details', course)}
              className="bg-card p-4 rounded-xl shadow-card border border-border/50 flex justify-between items-center cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-sm">
                  {course.code.split('-')[0]}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">{course.name}</h4>
                  <p className="text-xs text-muted-foreground">{course.students_count || 0} طالب مسجل</p>
                </div>
              </div>
              <div className="p-2 bg-muted rounded-full text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface QuickLinkProps {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  label: string;
  sub: string;
  onClick: () => void;
}

function QuickLink({ icon: Icon, iconColor, bgColor, label, sub, onClick }: QuickLinkProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card p-4 rounded-xl shadow-card border border-border/50 flex items-center gap-3 cursor-pointer hover:shadow-card-hover transition-all active:scale-[0.98]"
    >
      <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div>
        <h4 className="font-bold text-sm text-foreground">{label}</h4>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
