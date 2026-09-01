import { useState } from 'react';
import { QrCode, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);

  const { login }  = useAuth();
  const { toast }  = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال البريد الإلكتروني وكلمة المرور', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const result = await login(identifier.trim(), password);
    setLoading(false);
    if (!result.success) {
      toast({ title: 'فشل تسجيل الدخول', description: result.error || 'حدث خطأ غير متوقع', variant: 'destructive' });
    }
  };

  const fill = (id: string, pw: string) => { setIdentifier(id); setPassword(pw); };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background" dir="rtl">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 gradient-hero rounded-3xl mx-auto flex items-center justify-center shadow-glow transform -rotate-6 animate-float">
            <QrCode className="text-primary-foreground w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mt-6">مرحباً بك في حاضر</h1>
          <p className="text-muted-foreground">نظام الحضور الذكي وإدارة المحاضرات</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card p-8 rounded-3xl shadow-lg border border-border/50 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">البريد الإلكتروني</label>
              <Input
                type="text"
                placeholder="البريد الإلكتروني"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="text-right"
                dir="ltr"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">كلمة المرور</label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="text-right pl-10"
                  dir="rtl"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground shadow-glow py-6 text-base font-bold"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري تسجيل الدخول...</>
            ) : 'تسجيل الدخول'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          جميع الحقوق محفوظة © {new Date().getFullYear()} حاضر
        </p>
      </div>
    </div>
  );
}
