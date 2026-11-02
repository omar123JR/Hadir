import { useState, useMemo } from 'react';
import { Home, Users, BookOpen, UserPlus, User, Settings, CreditCard } from 'lucide-react';
import { AppShell, NavItem } from '@/components/layout/AppShell';
import { AdminHome } from '@/components/admin/AdminHome';
import { UserManagement } from '@/components/admin/UserManagement';
import { CourseManagement } from '@/components/admin/CourseManagement';
import { EnrollmentManagement } from '@/components/admin/EnrollmentManagement';
import { AdminFinancials } from '@/components/admin/AdminFinancials';
import { ProfileView } from '@/components/shared/ProfileView';
import { SettingsView } from '@/components/shared/SettingsView';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('home');

  const navItems: NavItem[] = useMemo(() => [
    { id: 'home', icon: Home, label: 'لوحة الإحصائيات' },
    { id: 'users', icon: Users, label: 'إدارة المستخدمين والدعم' },
    { id: 'financials', icon: CreditCard, label: 'الشؤون المالية والتجميد' },
    { id: 'courses', icon: BookOpen, label: 'المقررات والشُعب' },
    { id: 'enrollment', icon: UserPlus, label: 'التسجيل الأكاديمي' },
    { id: 'profile', icon: User, label: 'حساب المدير' },
    { id: 'settings', icon: Settings, label: 'إعدادات النظام' },
  ], []);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const renderView = () => {
    switch (activeTab) {
      case 'home':
        return <AdminHome onNavigate={handleNavigate} />;
      case 'users':
        return <UserManagement onBack={() => setActiveTab('home')} />;
      case 'financials':
        return <AdminFinancials onBack={() => setActiveTab('home')} />;
      case 'courses':
        return <CourseManagement onBack={() => setActiveTab('home')} />;
      case 'enrollment':
        return <EnrollmentManagement onBack={() => setActiveTab('home')} />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <AdminHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppShell
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="animate-in fade-in duration-300">
        {renderView()}
      </div>
    </AppShell>
  );
}
