import { useState, useMemo } from 'react';
import { Home, Users, BookOpen, User, Settings } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { AdminHome } from '@/components/admin/AdminHome';
import { UserManagement } from '@/components/admin/UserManagement';
import { CourseManagement } from '@/components/admin/CourseManagement';
import { EnrollmentManagement } from '@/components/admin/EnrollmentManagement';
import { ProfileView } from '@/components/shared/ProfileView';
import { SettingsView } from '@/components/shared/SettingsView';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('home');

  const navItems = useMemo(() => [
    { id: 'home', icon: Home, label: 'الرئيسية' },
    { id: 'users', icon: Users, label: 'المستخدمين' },
    { id: 'courses', icon: BookOpen, label: 'المقررات' },
    { id: 'profile', icon: User, label: 'حسابي' },
    { id: 'settings', icon: Settings, label: 'إعدادات' },
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
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="pt-6 pb-32 px-4 max-w-xl mx-auto min-h-screen">
        {renderView()}
      </div>
      <BottomNav 
        items={navItems} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
    </div>
  );
}
