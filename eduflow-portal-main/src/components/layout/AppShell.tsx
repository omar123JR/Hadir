import React, { useState } from 'react';
import { LucideIcon, LogOut, Sun, Moon, Bell, GraduationCap, ShieldCheck, ChevronLeft, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';

export interface NavItem {
  id: string;
  icon: LucideIcon;
  label: string;
  badge?: string | number;
}

interface AppShellProps {
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
}

export function AppShell({ navItems, activeTab, onTabChange, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleTitle = {
    student: 'بوابة الطالب الجامعي',
    teacher: 'بوابة المحاضر الأكاديمي',
    admin: 'لوحة إدارة النظام المركزية',
  }[user?.role || 'student'];

  const roleBadge = {
    student: { label: 'طالب', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    teacher: { label: 'أستاذ مقرر', bg: 'bg-primary/10 text-primary border-primary/20' },
    admin: { label: 'مدير النظام', bg: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  }[user?.role || 'student'];

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased selection:bg-primary selection:text-primary-foreground">
      
      {/* ========================================================
          DESKTOP SIDEBAR (RTL: Appears on the Right)
          ======================================================== */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-l border-border/60 bg-card/60 backdrop-blur-xl shrink-0 sticky top-0 h-screen z-30">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 gradient-hero rounded-2xl flex items-center justify-center shadow-glow text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-foreground">حاضر</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">v2.0</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">المنصة الأكاديمية الذكية</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 mt-4 rounded-2xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shadow-inner">
              {user?.name ? user.name.slice(0, 2) : 'ح'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-bold text-sm text-foreground truncate">{user?.name || 'مستخدم حاضر'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${roleBadge.bg}`}>
                  {roleBadge.label}
                </span>
                {user?.student_id && (
                  <span className="text-[10px] font-mono text-muted-foreground truncate">
                    #{user.student_id}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30 font-bold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border/50 space-y-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
              <span>{darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
            </div>
            <span className="text-[10px] text-muted-foreground/70">{darkMode ? 'فاتح' : 'داكن'}</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ========================================================
          MOBILE TOPBAR
          ======================================================== */}
      <header className="md:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 gradient-hero rounded-xl flex items-center justify-center text-primary-foreground shadow-sm">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-none text-foreground">حاضر</h1>
            <p className="text-[10px] text-muted-foreground font-medium">{roleTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            title="تبديل المظهر"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================
          MAIN CONTENT AREA (Expands to 7xl on Desktop)
          ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-border/40 bg-card/30 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-xl border border-border/50">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              الفصل الأكاديمي الحالي: خريف 2026
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {roleTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-xs font-bold text-foreground">{user?.email}</p>
              <p className="text-[10px] text-muted-foreground">متصل بنظام التوثيق الأكاديمي</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 transition-all cursor-pointer ml-2"
              title="تسجيل الخروج والعودة لصفحة الدخول"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-12">
          {children}
        </main>
      </div>

      {/* ========================================================
          MOBILE BOTTOM NAVIGATION (Fixed at bottom on mobile)
          ======================================================== */}
      <div className="md:hidden">
        <BottomNav
          items={navItems}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      </div>

    </div>
  );
}
