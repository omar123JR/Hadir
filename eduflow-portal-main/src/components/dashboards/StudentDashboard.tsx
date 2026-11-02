import { useState, useMemo } from 'react';
import { Home, QrCode, BarChart2, User, Settings, FileCheck, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { AppShell, NavItem } from '@/components/layout/AppShell';
import { StudentHome } from '@/components/student/StudentHome';
import { StudentCheckIn } from '@/components/student/StudentCheckIn';
import { StudentReports } from '@/components/student/StudentReports';
import { StudentSchedule } from '@/components/student/StudentSchedule';
import { StudentAssignments } from '@/components/student/StudentAssignments';
import { StudentFinancialRecord } from '@/components/student/StudentFinancialRecord';
import { CourseDetails } from '@/components/student/CourseDetails';
import { ProfileView } from '@/components/shared/ProfileView';
import { SettingsView } from '@/components/shared/SettingsView';
import { Course } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const navItems: NavItem[] = useMemo(() => [
    { id: 'home', icon: Home, label: 'الرئيسية' },
    { id: 'checkin', icon: QrCode, label: 'تسجيل الحضور' },
    { id: 'reports', icon: BarChart2, label: 'السجل والمعدل' },
    { id: 'financials', icon: CreditCard, label: 'السجل المالي' },
    { id: 'assignments', icon: FileCheck, label: 'الواجبات' },
    { id: 'schedule', icon: Calendar, label: 'الجدول الدراسي' },
    { id: 'profile', icon: User, label: 'حسابي الجامعي' },
    { id: 'settings', icon: Settings, label: 'الإعدادات والأمان' },
  ], []);

  const handleNavigate = (tab: string, data?: unknown) => {
    if (tab === 'course-details' && data) {
      setSelectedCourse(data as Course);
      setActiveTab('course-details');
    } else {
      setActiveTab(tab);
      setSelectedCourse(null);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedCourse(null);
  };

  const renderView = () => {
    if (selectedCourse) {
      return <CourseDetails course={selectedCourse} onBack={() => setSelectedCourse(null)} />;
    }

    switch (activeTab) {
      case 'home':
        return <StudentHome onNavigate={handleNavigate} />;
      case 'checkin':
        return <StudentCheckIn />;
      case 'reports':
        return <StudentReports />;
      case 'financials':
        return <StudentFinancialRecord />;
      case 'assignments':
        return <StudentAssignments onBack={() => setActiveTab('home')} />;
      case 'schedule':
        return <StudentSchedule onBack={() => setActiveTab('home')} />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <StudentHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppShell
      navItems={navItems}
      activeTab={selectedCourse ? 'home' : activeTab}
      onTabChange={handleTabChange}
    >
      <div className="animate-in fade-in duration-300 space-y-4">
        {user?.is_frozen && (
          <div className="p-4 rounded-2xl bg-destructive/15 border-2 border-destructive/40 text-destructive flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-extrabold text-sm block">تنبيه: تم تجميد حسابك الأكاديمي لمراجعة الشؤون المالية</span>
                <span className="text-xs text-muted-foreground">{user.freeze_reason || 'يرجى مراجعة إدارة شؤون الطلاب لتسوية الرسوم'}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('financials')}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shrink-0"
            >
              عرض السجل المالي
            </button>
          </div>
        )}
        {renderView()}
      </div>
    </AppShell>
  );
}
