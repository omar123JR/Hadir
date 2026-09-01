import { useState, useMemo } from 'react';
import { Home, QrCode, BarChart2, User, Settings } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { StudentHome } from '@/components/student/StudentHome';
import { StudentCheckIn } from '@/components/student/StudentCheckIn';
import { StudentReports } from '@/components/student/StudentReports';

import { StudentSchedule } from '@/components/student/StudentSchedule';
import { StudentAssignments } from '@/components/student/StudentAssignments';
import { CourseDetails } from '@/components/student/CourseDetails';
import { ProfileView } from '@/components/shared/ProfileView';
import { SettingsView } from '@/components/shared/SettingsView';
import { Course } from '@/types';

export function StudentDashboard() {
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
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      case 'schedule':
        return <StudentSchedule onBack={() => setActiveTab('home')} />;
      case 'assignments':
        return <StudentAssignments onBack={() => setActiveTab('home')} />;
      default:
        return <StudentHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="pt-6 pb-24 px-4 max-w-xl mx-auto min-h-screen">
        {renderView()}
      </div>
      <BottomNav
        items={navItems}
        activeTab={selectedCourse ? 'home' : activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
