import { useState, useMemo } from 'react';
import { Home, QrCode, BarChart2, User, Settings } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { TeacherHome } from '@/components/teacher/TeacherHome';
import { TeacherCheckIn } from '@/components/teacher/TeacherCheckIn';
import { TeacherReports } from '@/components/teacher/TeacherReports';

import { TeacherAssignments } from '@/components/teacher/TeacherAssignments';
import { TeacherLectures } from '@/components/teacher/TeacherLectures';
import { TeacherCourseDetails } from '@/components/teacher/TeacherCourseDetails';
import { ProfileView } from '@/components/shared/ProfileView';
import { SettingsView } from '@/components/shared/SettingsView';
import { Course } from '@/types';

export function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const navItems = useMemo(() => [
    { id: 'home', icon: Home, label: 'الرئيسية' },
    { id: 'checkin', icon: QrCode, label: 'حاضر' },
    { id: 'reports', icon: BarChart2, label: 'تقارير' },
    { id: 'profile', icon: User, label: 'حسابي' },
    { id: 'settings', icon: Settings, label: 'إعدادات' },
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
    switch (activeTab) {
      case 'home':
        return <TeacherHome onNavigate={handleNavigate} />;
      case 'checkin':
        return <TeacherCheckIn />;
      case 'reports':
        return <TeacherReports />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      case 'assignments':
        return <TeacherAssignments onBack={() => setActiveTab('home')} />;
      case 'lectures':
        return <TeacherLectures onBack={() => setActiveTab('home')} />;
      case 'course-details':
        return selectedCourse ? (
          <TeacherCourseDetails
            course={selectedCourse}
            onBack={() => setActiveTab('home')}
          />
        ) : (
          <TeacherHome onNavigate={handleNavigate} />
        );
      default:
        return <TeacherHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="pt-6 pb-24 px-4 max-w-xl mx-auto min-h-screen">
        {renderView()}
      </div>
      <BottomNav
        items={navItems}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
