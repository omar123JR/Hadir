
import { Users, BookOpen, GraduationCap, Settings, ArrowLeft, ShieldCheck } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');

        if (res && res.success && res.data) {
          setStats({
            teachers: res.data.teachers_count ?? res.data.staff ?? res.data.teachers ?? 0,
            students: res.data.students_count ?? res.data.students ?? 0,
            courses: res.data.courses_count ?? res.data.courses ?? 0,
            admins: res.data.admins_count ?? res.data.admins ?? 0,
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
    <div className="space-y-6 animate-slideUp">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          مرحباً، {user?.name}! 👋
        </h2>
        <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-success" />
          لوحة تحكم المدير
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          value={loading ? '...' : stats.teachers}
          label="المعلمين"
          variant="primary"
          icon={Users}
        />
        <StatCard
          value={loading ? '...' : stats.students}
          label="الطلاب"
          variant="success"
          icon={GraduationCap}
        />
        <StatCard
          value={loading ? '...' : stats.courses}
          label="المقررات"
          variant="warning"
          icon={BookOpen}
        />
        <StatCard
          value={loading ? '...' : stats.admins}
          label="مشرفين"
          variant="destructive"
          icon={Settings}
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">الإدارة السريعة</h3>

        <AdminMenuItem
          icon={Users}
          iconColor="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
          title="إدارة المستخدمين"
          subtitle="إضافة وحذف المعلمين والطلاب"
          onClick={() => onNavigate('users')}
        />

        <AdminMenuItem
          icon={BookOpen}
          iconColor="text-purple-600"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
          title="إدارة المقررات"
          subtitle="إضافة وتعديل المواد الدراسية"
          onClick={() => onNavigate('courses')}
        />

        <AdminMenuItem
          icon={GraduationCap}
          iconColor="text-green-600"
          bgColor="bg-green-50 dark:bg-green-900/20"
          title="إدارة التسجيل"
          subtitle="تعيين الطلاب والمعلمين للمقررات"
          onClick={() => onNavigate('enrollment')}
        />
      </div>
    </div>
  );
}

interface AdminMenuItemProps {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}

function AdminMenuItem({ icon: Icon, iconColor, bgColor, title, subtitle, onClick }: AdminMenuItemProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card p-4 rounded-xl shadow-card border border-border/50 flex justify-between items-center cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div>
          <h4 className="font-bold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="p-2 bg-muted rounded-full text-muted-foreground">
        <ArrowLeft className="w-4 h-4" />
      </div>
    </div>
  );
}
