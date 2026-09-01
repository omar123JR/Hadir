import { useState, useEffect, useMemo } from 'react';
import { Clock, QrCode, Calendar, BookOpen, ArrowLeft, UploadCloud, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { api, getStudentCourses } from '@/lib/api';
import { Course } from '@/types';
import { getReportsApiUrl } from '@/config/reports';

interface StudentHomeProps {
  onNavigate: (tab: string, data?: unknown) => void;
}

export function StudentHome({ onNavigate }: StudentHomeProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({ totalLectures: 0, attendedLectures: 0, avgPercentage: 0, absences: 0 });
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [coursesData, statsRes, activeSessionsRes] = await Promise.all([
        getStudentCourses(),
        api.get(getReportsApiUrl() + '/student').catch(() => ({ success: false })),
        api.get('/attendance/student/sessions/active').catch(() => ({ success: false, data: [] }))
      ]);

      setCourses(coursesData);
      
      if (statsRes.success && statsRes.data) {
        const total = statsRes.data.courses?.reduce((acc: number, c: any) => acc + c.total_lectures, 0) || 0;
        const attended = statsRes.data.courses?.reduce((acc: number, c: any) => acc + c.attended_lectures, 0) || 0;
        setStats({
          totalLectures: total,
          attendedLectures: attended,
          avgPercentage: statsRes.data.attendanceRate || 0,
          absences: Math.max(0, total - attended),
        });
      }

      if (activeSessionsRes.success && activeSessionsRes.data && activeSessionsRes.data.length > 0) {
        setActiveSession(activeSessionsRes.data[0]);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const myCourses = useMemo(() => courses, [courses]);

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          مرحباً، {user?.name?.split(' ')[0]}! 👋
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {activeSession ? 'لديك محاضرة قادمة، استعد!' : 'مرحباً بك في نظام حاضر الذكي'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={stats.attendedLectures} label="جلسة حضور" variant="primary" />
        <StatCard value={`${stats.avgPercentage}%`} label="نسبة الحضور" variant="success" />
        <StatCard value={stats.absences} label="غياب" variant="destructive" />
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
                {activeSession ? activeSession.course_name : 'لا توجد محاضرات حالية'}
              </h3>
              <p className="text-primary-foreground/80 text-xs">
                {activeSession ? `${activeSession.date} • ${activeSession.time}` : 'يمكنك تصفح المواد والجدول الدراسي'}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <Button
            onClick={() => onNavigate('checkin')}
            variant="secondary"
            disabled={!activeSession}
            className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold py-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <QrCode className="w-5 h-5 ml-2" />
            تسجيل الحضور
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink
          icon={UploadCloud}
          iconColor="text-purple-600"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
          label="رفع واجب"
          sub="تسليم المهام"
          onClick={() => onNavigate('assignments')}
        />
        <QuickLink
          icon={Calendar}
          iconColor="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
          label="الجدول الدراسي"
          sub="الفصل الحالي"
          onClick={() => onNavigate('schedule')}
        />
      </div>

      {/* My Courses */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          موادي الدراسية
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
                  <p className="text-xs text-muted-foreground">{course.lectures_count || 0} محاضرة مرفوعة</p>
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
