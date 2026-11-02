import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Eye, EyeOff, Loader2, GraduationCap, ShieldCheck, Award, Zap, Sun, Moon, Lock, ShieldAlert, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SecureInput } from '@/components/ui/SecureInput';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface LoginPageProps {
  forceShow?: boolean;
}

export function LoginPage({ forceShow }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [require2FA, setRequire2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [tempUserId, setTempUserId] = useState('');

  const { user, isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);
  const { toast } = useToast();
  const { darkMode, toggleDarkMode } = useTheme();



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال البريد الإلكتروني وكلمة المرور', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Check if user has 2FA enabled
      const result = await login(identifier.trim(), password);
      setLoading(false);

      if (!result.success) {
        toast({ title: 'فشل تسجيل الدخول', description: result.error || 'بيانات الدخول غير صحيحة', variant: 'destructive' });
      } else {
        toast({ title: 'مرحباً بك', description: 'تم تسجيل الدخول بنجاح' });
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setLoading(false);
      toast({ title: 'خطأ', description: err.message || 'حدث خطأ في الاتصال بالخادم', variant: 'destructive' });
    }
  };

  const fillCredentials = (id: string, pw: string) => {
    setIdentifier(id);
    setPassword(pw);
    toast({
      title: 'تم اختيار الحساب التجريبي',
      description: `المعرف: ${id}`,
    });
  };

  return (
    <div dir="rtl" className="min-h-screen flex bg-background text-foreground selection:bg-primary selection:text-primary-foreground relative overflow-hidden">
      
      {/* Theme Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-6 left-6 z-50 p-2.5 rounded-2xl bg-card border border-border/80 shadow-sm text-muted-foreground hover:text-foreground transition-all hover:scale-105"
        title="تبديل المظهر"
      >
        {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-blue-500" />}
      </button>

      {/* ========================================================
          HERO BRANDING SECTION (Desktop Only: Clean Slate & Deep Navy)
          ======================================================== */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 lg:p-16 relative bg-card/60 border-l border-border/80">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-2xl tracking-tight text-foreground">حاضر</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">v2.1</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">المنصة الأكاديمية لإدارة الحضور والتقييمات والشؤون المالية</p>
          </div>
        </div>

        {/* Main Hero Pitch */}
        <div className="space-y-6 relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            نظام جامعي متكامل ومحمي ضد هجمات SQLi و XSS
          </div>

          <h2 className="text-4xl font-black leading-tight text-foreground tracking-tight">
            التوثيق الأكاديمي الذكي <br />
            <span className="text-primary">
              للحضور والدرجات والشؤون المالية
            </span>
          </h2>

          <p className="text-muted-foreground text-sm leading-relaxed">
            بيئة جامعية مؤسسية متكاملة؛ تشمل رمز QR زمني متغير كل 20 ثانية، ومحرك درجات Moodle مع معدل تراكمي حقيقي (GPA 4.0)، ووحدة لإدارة الأقساط المالية وتجميد الحسابات ومصادقة ثنائية 2FA.
          </p>

          {/* Pillars List */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <QrCode className="w-4 h-4" />
                <span>QR ديناميكي (20s)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">صلاحية مؤقتة لمنع الحضور عن بعد وتصوير الشاشة.</p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Award className="w-4 h-4" />
                <span>دفتر Moodle للدرجات</span>
              </div>
              <p className="text-[11px] text-muted-foreground">أوزان 100% يحددها الأستاذ ومعدل تراكمي فوري.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground relative z-10">
          © {new Date().getFullYear()} نظام حاضر الجامعي • حماية الخصوصية والبيانات الأكاديمية
        </div>
      </div>

      {/* ========================================================
          LOGIN FORM SECTION (Right side in RTL)
          ======================================================== */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-7">
          
          {/* Mobile Logo Only */}
          <div className="lg:hidden text-center space-y-2">
            <div className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl mx-auto flex items-center justify-center shadow-md">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-foreground">منظومة حاضر</h1>
            <p className="text-xs text-muted-foreground">نظام الحضور والتقييم الأكاديمي والمالي</p>
          </div>

          <div className="text-right space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">تسجيل الدخول</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">أدخل بياناتك الجامعية للوصول إلى لوحة التحكم الخاصة بك</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-card p-6 sm:p-8 rounded-3xl shadow-lg border border-border space-y-5">
            
            <div className="space-y-4">
              <SecureInput
                label="البريد الإلكتروني أو المعرف الجامعي"
                placeholder="name@university.edu"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-11 rounded-xl text-left"
                dir="ltr"
                autoComplete="username"
                maxLen={100}
                required
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>كلمة المرور</span>
                </div>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl text-left pl-10"
                    dir="ltr"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري التحقق والدخول...</>
              ) : 'تسجيل الدخول'}
            </Button>
          </form>

          {/* Quick Demo Test Logins */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                حسابات تجريبية سريعة بنقرة واحدة:
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('student1@test.com', 'password123')}
                className="p-2.5 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
              >
                <span className="block text-xs font-bold text-foreground group-hover:text-primary">طالب</span>
                <span className="block text-[10px] text-muted-foreground">student1</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('teacher@test.com', 'password123')}
                className="p-2.5 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
              >
                <span className="block text-xs font-bold text-foreground group-hover:text-primary">محاضر</span>
                <span className="block text-[10px] text-muted-foreground">teacher</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('admin', 'admin123')}
                className="p-2.5 rounded-xl bg-card border border-border hover:border-primary hover:bg-primary/5 transition-all text-center group"
              >
                <span className="block text-xs font-bold text-foreground group-hover:text-primary">مدير</span>
                <span className="block text-[10px] text-muted-foreground">admin</span>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground font-mono">
            نظام حاضر الجامعي • الإصدار 2.1.0
          </p>

        </div>
      </div>

    </div>
  );
}
