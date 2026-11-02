import { useState, useEffect, useMemo } from 'react';
import { Clock, QrCode, UploadCloud, FileText, BookOpen, ArrowLeft, Users, Award, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  useEffect(() => {
    loadData();
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

  const totalStudents = useMemo(() => 
    courses.reduce((sum, c) => sum + (c.students_count || 0), 0),
    [courses]
  );

  const totalCredits = useMemo(() => 
    courses.reduce((sum, c) => sum + (c.credit_hours || 3), 0),
    [courses]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ========================================================
          TEACHER HERO BANNER
          ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-8 text-primary-foreground shadow-glow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none transform -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/15 border border-primary-foreground/20 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>هيئة التدريس الأكاديمية</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              أهلاً بك، {user?.name} 👋
            </h2>
            <p className="text-primary-foreground/80 text-xs sm:text-sm font-medium">
              المنصة الأكاديمية تتيح لك إدارة حضور القاعات برمز QR ديناميكي، ورصد الدرجات التفاعلي بنظام Moodle.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-3.5 rounded-2xl text-center">
              <span className="text-[11px] text-primary-foreground/80 block font-medium">المقررات المُسنَدة</span>
              <div className="text-2xl font-black my-0.5">{courses.length}</div>
              <span className="text-[10px] text-primary-foreground/70">مقرر دراسي</span>
            </div>

            <div className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-3.5 rounded-2xl text-center">
              <span className="text-[11px] text-primary-foreground/80 block font-medium">إجمالي الطلاب</span>
              <div className="text-2xl font-black my-0.5">{totalStudents}</div>
              <span className="text-[10px] text-primary-foreground/70">طالب مسجل</span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-3.5 rounded-2xl text-center">
              <span className="text-[11px] text-primary-foreground/80 block font-medium">الساعات التدريسية</span>
              <div className="text-2xl font-black my-0.5">{totalCredits}</div>
              <span className="text-[10px] text-primary-foreground/70">ساعة معتمدة</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          ACTIVE SESSION ALERT
          ======================================================== */}
      {activeSession ? (
        <div className="p-5 sm:p-6 rounded-3xl bg-primary/10 border-2 border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
              <QrCode className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground animate-pulse">
                  جلسة حضور نشطة
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
            className="w-full sm:w-auto gradient-primary text-primary-foreground font-bold h-11 px-6 rounded-xl shadow-glow"
          >
            <QrCode className="w-4 h-4 ml-2" />
            عرض شاشة القاعة (ديناميكي 20 ثانية)
          </Button>
        </div>
      ) : null}

      {/* ========================================================
          QUICK ACTIONS
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('checkin')}
          className="p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all text-right group flex flex-col justify-between space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">جلسات الحضور (QR)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">بدء وعرض رمز القاعة المتجدد كل 20 ثانية</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('gradebook')}
          className="p-5 rounded-2xl bg-card border border-border/60 hover:border-emerald-500/40 hover:shadow-md transition-all text-right group flex flex-col justify-between space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">دفتر الدرجات (Moodle)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">تخصيص الأوزان، رصد درجات الطلاب، وتصدير Excel</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('lectures')}
          className="p-5 rounded-2xl bg-card border border-border/60 hover:border-indigo-500/40 hover:shadow-md transition-all text-right group flex flex-col justify-between space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">رفع المحاضرات</h4>
            <p className="text-xs text-muted-foreground mt-0.5">مشاركة الشرائح والملفات الأكاديمية مع الطلاب</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('assignments')}
          className="p-5 rounded-2xl bg-card border border-border/60 hover:border-amber-500/40 hover:shadow-md transition-all text-right group flex flex-col justify-between space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">الواجبات والتكليفات</h4>
            <p className="text-xs text-muted-foreground mt-0.5">إنشاء واجبات وتصحيح تسليمات الطلاب</p>
          </div>
        </button>
      </div>

      {/* ========================================================
          MY COURSES
          ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-extrabold text-foreground">المقررات الدراسية الحالية</h3>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {courses.length} مقرر دراسي
          </span>
        </div>

        {courses.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-3xl border border-dashed border-border text-muted-foreground">
            لا توجد مواد مسندة إليك حالياً
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-card p-5 rounded-3xl border border-border/60 hover:border-primary/40 hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {course.code.split('-')[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-foreground">{course.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{course.code}</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-muted border border-border/60 text-muted-foreground">
                    {course.credit_hours || 3} ساعات معتمدة
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-border/50">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    {course.students_count || 0} طالب مسجل
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigate('gradebook')}
                      className="text-xs font-bold h-8 rounded-xl"
                    >
                      <Award className="w-3.5 h-3.5 ml-1" />
                      الدرجات
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onNavigate('checkin')}
                      className="gradient-primary text-primary-foreground text-xs font-bold h-8 rounded-xl shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5 ml-1" />
                      الحضور
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
