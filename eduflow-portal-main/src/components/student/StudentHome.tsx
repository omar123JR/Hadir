import { useState, useEffect, useMemo } from 'react';
import { Clock, QrCode, Calendar, BookOpen, ArrowLeft, UploadCloud, BarChart2, Award, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { api, getStudentCourses } from '@/lib/api';
import { Course } from '@/types';

interface StudentHomeProps {
  onNavigate: (tab: string, data?: unknown) => void;
}

export function StudentHome({ onNavigate }: StudentHomeProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [gpaData, setGpaData] = useState<{ gpa: number; totalCredits: number; gradedCredits: number } | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number>(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [coursesData, gpaRes, activeSessionsRes] = await Promise.all([
        getStudentCourses().catch(() => []),
        api.get('/grades/student/gpa').catch(() => ({ success: false })),
        api.get('/attendance/student/sessions/active').catch(() => ({ success: false, data: [] }))
      ]);

      setCourses(coursesData);
      
      if (gpaRes.success && gpaRes.data) {
        setGpaData(gpaRes.data);
      }

      if (activeSessionsRes.success && activeSessionsRes.data && activeSessionsRes.data.length > 0) {
        setActiveSession(activeSessionsRes.data[0]);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.error('Error loading student dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGpaTier = (gpa: number) => {
    if (gpa >= 3.75) return { label: 'امتياز مرتفع', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' };
    if (gpa >= 3.5) return { label: 'جيد جداً مرتفع', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' };
    if (gpa >= 3.0) return { label: 'جيد جداً', color: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30' };
    if (gpa >= 2.0) return { label: 'جيد', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' };
    return { label: 'مقبول', color: 'bg-rose-500/15 text-rose-600 border-rose-500/30' };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ========================================================
          ACADEMIC HERO METRICS BANNER
          ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-8 text-white shadow-glow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none transform -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold backdrop-blur-md text-white">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>العام الجامعي 2026/2027</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              أهلاً بك، {user?.name} 👋
            </h2>
            <p className="text-white/80 text-xs sm:text-sm font-medium">
              الرقم الجامعي: <span className="font-mono font-bold text-white">{user?.student_id || '2026001'}</span> • مرحباً بك في بوابتك الأكاديمية الذكية
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* GPA Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl text-center text-white shadow-sm">
              <span className="text-[11px] text-white/80 block font-medium">المعدل التراكمي</span>
              <div className="text-2xl sm:text-3xl font-black my-0.5 text-white">
                {gpaData?.gpa !== undefined && gpaData.gpa !== null ? Number(gpaData.gpa).toFixed(2) : '4.00'}
              </div>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-400/25 text-emerald-200 border border-emerald-400/40">
                {gpaData ? getGpaTier(gpaData.gpa).label : 'امتياز'}
              </span>
            </div>

            {/* Credit Hours Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl text-center text-white shadow-sm">
              <span className="text-[11px] text-white/80 block font-medium">الساعات المعتمدة</span>
              <div className="text-2xl sm:text-3xl font-black my-0.5 text-white">
                {gpaData?.totalCredits || courses.reduce((acc, c) => acc + (c.credit_hours || 3), 0)}
              </div>
              <span className="text-[10px] text-white/80">ساعة مسجلة</span>
            </div>

            {/* Courses Count */}
            <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl text-center text-white shadow-sm">
              <span className="text-[11px] text-white/80 block font-medium">المقررات الحالية</span>
              <div className="text-2xl sm:text-3xl font-black my-0.5 text-white">{courses.length}</div>
              <span className="text-[10px] text-white/80">مقرر دراسي</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          ACTIVE SESSION ALERT (If session is live now)
          ======================================================== */}
      {activeSession ? (
        <div className="p-5 sm:p-6 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
              <QrCode className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                  جلسة حضور نشطة الآن
                </span>
                <span className="text-xs text-muted-foreground font-mono">{activeSession.course_code}</span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-foreground mt-1">
                {activeSession.course_name}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                {activeSession.date} • {activeSession.time}
              </p>
            </div>
          </div>

          <Button
            onClick={() => onNavigate('checkin')}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-6 rounded-xl shadow-md shadow-emerald-600/30"
          >
            <QrCode className="w-4 h-4 ml-2" />
            مسح رمز الـ QR الآن
          </Button>
        </div>
      ) : null}

      {/* ========================================================
          QUICK ACTION TILES
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('checkin')}
          className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all text-right group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">تسجيل الحضور</h4>
              <p className="text-xs text-muted-foreground">مسح كود الـ QR الزمني للقاعة</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button
          onClick={() => onNavigate('reports')}
          className="p-5 rounded-2xl bg-card border border-border/60 hover:border-emerald-500/40 hover:shadow-md transition-all text-right group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">السجل والدرجات</h4>
              <p className="text-xs text-muted-foreground">كشف الدرجات والـ GPA الأكاديمي</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
        </button>

        <button
          onClick={() => onNavigate('schedule')}
          className="p-5 rounded-2xl bg-card border border-border/60 hover:border-indigo-500/40 hover:shadow-md transition-all text-right group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">الجدول والمحاضرات</h4>
              <p className="text-xs text-muted-foreground">مواعيد القاعات والمحاضرات</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
        </button>
      </div>

      {/* ========================================================
          ENROLLED COURSES SECTION
          ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-extrabold text-foreground">المقررات الدراسية المسجلة</h3>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {courses.length} مقرر نشط
          </span>
        </div>

        {courses.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-3xl border border-dashed border-border text-muted-foreground">
            لا توجد مقررات دراسية مسجلة حالياً
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => onNavigate('course-details', course)}
                className="bg-card p-5 rounded-3xl border border-border/60 hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer group space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm group-hover:scale-105 transition-transform">
                      {course.code.split('-')[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        {course.name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono">{course.code}</p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted border border-border/60 text-muted-foreground">
                    {course.credit_hours || 3} ساعات معتمدة
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    المحاضر: د. {course.teacher_name || 'أستاذ المقرر'}
                  </span>
                  <span className="text-primary font-semibold flex items-center gap-1 group-hover:-translate-x-1 transition-transform">
                    تفاصيل المادة
                    <ArrowLeft className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
