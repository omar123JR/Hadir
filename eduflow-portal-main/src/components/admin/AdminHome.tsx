import { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, Settings, ArrowLeft, ShieldCheck, Sparkles, UserPlus, FileSpreadsheet, Lock, CreditCard, TrendingUp, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface AdminHomeProps {
  onNavigate: (tab: string) => void;
}

export function AdminHome({ onNavigate }: AdminHomeProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    courses: 0,
    admins: 0,
  });
  const [finSummary, setFinSummary] = useState({
    totalExpected: 0,
    totalCollected: 0,
    totalDebt: 0,
    frozenCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [res, finRes] = await Promise.all([
          api.get('/admin/stats').catch(() => null),
          api.get('/financials/summary').catch(() => null),
        ]);

        if (res && res.success && res.data) {
          setStats({
            teachers: res.data.teachers_count ?? res.data.staff ?? res.data.teachers ?? 0,
            students: res.data.students_count ?? res.data.students ?? 0,
            courses: res.data.courses_count ?? res.data.courses ?? 0,
            admins: res.data.admins_count ?? res.data.admins ?? 0,
          });
        }

        if (finRes && finRes.success && finRes.data) {
          setFinSummary({
            totalExpected: finRes.data.totalExpected || 0,
            totalCollected: finRes.data.totalCollected || 0,
            totalDebt: finRes.data.totalDebt || 0,
            frozenCount: finRes.data.frozenCount || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ========================================================
          ADMIN HERO BANNER
          ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-8 text-primary-foreground shadow-glow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none transform -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/15 border border-primary-foreground/20 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>إدارة النظام وحوكمة البيانات</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              لوحة الإدارة المركزية 🛡️
            </h2>
            <p className="text-primary-foreground/80 text-xs sm:text-sm font-medium">
              مرحباً بك {user?.name}، النظام يعمل بكفاءة وأمان مع تدقيق التزامن ومعاملات ACID المشفرة.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-3.5 rounded-2xl text-center">
              <span className="text-[11px] text-primary-foreground/80 block font-medium">الطلاب</span>
              <div className="text-2xl font-black my-0.5">{loading ? '...' : stats.students}</div>
              <span className="text-[10px] text-primary-foreground/70">طالب</span>
            </div>

            <div className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-3.5 rounded-2xl text-center">
              <span className="text-[11px] text-primary-foreground/80 block font-medium">المحاضرون</span>
              <div className="text-2xl font-black my-0.5">{loading ? '...' : stats.teachers}</div>
              <span className="text-[10px] text-primary-foreground/70">محاضر</span>
            </div>

            <div className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-3.5 rounded-2xl text-center">
              <span className="text-[11px] text-primary-foreground/80 block font-medium">المقررات</span>
              <div className="text-2xl font-black my-0.5">{loading ? '...' : stats.courses}</div>
              <span className="text-[10px] text-primary-foreground/70">مقرر</span>
            </div>

            <div className="bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-3.5 rounded-2xl text-center">
              <span className="text-[11px] text-primary-foreground/80 block font-medium">المشرفون</span>
              <div className="text-2xl font-black my-0.5">{loading ? '...' : stats.admins}</div>
              <span className="text-[10px] text-primary-foreground/70">مدير</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          SYSTEM HEALTH & STATUS SEAL
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/60 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">معاملات ACID والتزامن</h4>
            <p className="text-[11px] text-muted-foreground">حماية ضد هجمات السباق والحضور المزدوج</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">محرك درجات Moodle</h4>
            <p className="text-[11px] text-muted-foreground">أوزان 100% ومعدل GPA تراكمي حقيقي</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">رمز QR ديناميكي</h4>
            <p className="text-[11px] text-muted-foreground">توليد مشفر TOTP ينتهي كل 20 ثانية</p>
          </div>
        </div>
      </div>

      {/* ========================================================
          ADMIN MODULES TILES
          ======================================================== */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-foreground">وحدات الإدارة الأكاديمية</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onNavigate('users')}
            className="p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-lg transition-all text-right group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-foreground">إدارة المستخدمين</h4>
              <p className="text-xs text-muted-foreground mt-1">
                إضافة وحذف وتعديل بيانات الطلاب، المحاضرين، وإعادة تعيين كلمات المرور
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('courses')}
            className="p-6 rounded-3xl bg-card border border-border/60 hover:border-emerald-500/40 hover:shadow-lg transition-all text-right group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                <BookOpen className="w-7 h-7" />
              </div>
              <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-foreground">المقررات والشُعب</h4>
              <p className="text-xs text-muted-foreground mt-1">
                إنشاء المواد، تحديد الساعات المعتمدة، وسعة القاعات الاستيعابية
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('enrollment')}
            className="p-6 rounded-3xl bg-card border border-border/60 hover:border-indigo-500/40 hover:shadow-lg transition-all text-right group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                <UserPlus className="w-7 h-7" />
              </div>
              <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-foreground">التسجيل الأكاديمي</h4>
              <p className="text-xs text-muted-foreground mt-1">
                تنسيب الطلاب للمقررات الدراسية وتعيين أساتذة المواد
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('financials')}
            className="p-6 rounded-3xl bg-card border border-border/60 hover:border-amber-500/40 hover:shadow-lg transition-all text-right group flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                <CreditCard className="w-7 h-7" />
              </div>
              <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-amber-600 transition-colors" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-foreground">الشؤون المالية والتجميد</h4>
              <p className="text-xs text-muted-foreground mt-1">
                سداد الأقساط، إيصالات القبض، وإدارة تجميد الحسابات للدعم الفني
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================
          INSTITUTIONAL FINANCIAL & OPERATIONAL ANALYTICS
          ======================================================== */}
      <div className="p-6 rounded-3xl bg-card border border-border/70 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-base text-foreground">مؤشرات الأداء المالي والأكاديمي للكلية</h3>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">تحديث لحظي</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
            <span className="text-xs font-bold text-emerald-600">إجمالي المبالغ المحصّلة</span>
            <div className="text-2xl font-black text-emerald-600">
              {Number(finSummary.totalCollected).toLocaleString('ar-LY')} <span className="text-xs font-normal">د.ل</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              نسبة التحصيل: {finSummary.totalExpected > 0 ? ((finSummary.totalCollected / finSummary.totalExpected) * 100).toFixed(1) : 0}%
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
            <span className="text-xs font-bold text-rose-500">المتأخرات والديون المتبقية</span>
            <div className="text-2xl font-black text-rose-500">
              {Number(finSummary.totalDebt).toLocaleString('ar-LY')} <span className="text-xs font-normal">د.ل</span>
            </div>
            <span className="text-[10px] text-muted-foreground">رسوم غير محصلة</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
            <span className="text-xs font-bold text-amber-600">الحسابات الموقوفة / المجمدة</span>
            <div className="text-2xl font-black text-amber-600">
              {finSummary.frozenCount} <span className="text-xs font-normal">طالب</span>
            </div>
            <span className="text-[10px] text-muted-foreground">تجميد إداري ومالي</span>
          </div>
        </div>
      </div>

    </div>
  );
}
