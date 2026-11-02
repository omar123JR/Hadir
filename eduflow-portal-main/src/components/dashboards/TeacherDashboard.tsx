import { useState, useMemo } from 'react';
import { Home, QrCode, Award, BarChart2, User, Settings, UploadCloud, FileText } from 'lucide-react';
import { AppShell, NavItem } from '@/components/layout/AppShell';
import { TeacherHome } from '@/components/teacher/TeacherHome';
import { TeacherCheckIn } from '@/components/teacher/TeacherCheckIn';
import { TeacherGradebook } from '@/components/teacher/TeacherGradebook';
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

  const navItems: NavItem[] = useMemo(() => [
    { id: 'home', icon: Home, label: 'لوحة التدريس' },
    { id: 'checkin', icon: QrCode, label: 'جلسات الحضور (QR)' },
    { id: 'gradebook', icon: Award, label: 'دفتر الدرجات (رصد)' },
    { id: 'assignments', icon: FileText, label: 'الواجبات والتسليمات' },
    { id: 'lectures', icon: UploadCloud, label: 'المحاضرات والملفات' },
    { id: 'reports', icon: BarChart2, label: 'تقارير الحضور' },
    { id: 'profile', icon: User, label: 'الملف الأكاديمي' },
    { id: 'settings', icon: Settings, label: 'الإعدادات' },
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
      return (
        <TeacherCourseDetails
          course={selectedCourse}
          onBack={() => {
            setSelectedCourse(null);
            setActiveTab('home');
          }}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return <TeacherHome onNavigate={handleNavigate} />;
      case 'checkin':
        return <TeacherCheckIn />;
      case 'gradebook':
        return <TeacherGradebook />;
      case 'assignments':
        return <TeacherAssignments onBack={() => setActiveTab('home')} />;
      case 'lectures':
        return <TeacherLectures onBack={() => setActiveTab('home')} />;
      case 'reports':
        return <TeacherReports />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <TeacherHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <AppShell
      navItems={navItems}
      activeTab={selectedCourse ? 'home' : activeTab}
      onTabChange={handleTabChange}
    >
      <div className="animate-in fade-in duration-300">
        {renderView()}
      </div>
    </AppShell>
  );
}
