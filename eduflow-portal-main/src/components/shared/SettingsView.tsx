import { useState, useEffect } from 'react';
import { 
  Moon, 
  Sun, 
  Type, 
  Lock, 
  ShieldCheck, 
  Smartphone, 
  LogOut, 
  KeyRound, 
  Copy, 
  Check, 
  AlertTriangle, 
  RefreshCw,
  Palette,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SecureInput } from '@/components/ui/SecureInput';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export function SettingsView() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode, fontSize, setFontSize } = useTheme();
  const { toast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'appearance' | 'security' | 'password'>('appearance');

  // 2FA state
  const [secLoading, setSecLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState<'idle' | 'scanning'>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Disable 2FA
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling, setDisabling] = useState(false);

  // Revoke sessions
  const [revoking, setRevoking] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      setSecLoading(true);
      const res = await api.get('/security/status');
      if (res.success && res.data) {
        setTwoFactorEnabled(res.data.twoFactorEnabled);
      }
    } catch (err) {
      console.error('Failed to load 2FA status:', err);
    } finally {
      setSecLoading(false);
    }
  };

  const handleStart2FASetup = async () => {
    try {
      setActivating(true);
      const res = await api.post('/security/2fa/generate', {});
      if (res.success && res.data) {
        setQrCodeUrl(res.data.qrCodeUrl);
        setSecretKey(res.data.secret);
        setSetupStep('scanning');
      }
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message || 'فشل في إعداد 2FA',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      toast({
        title: 'تنبيه',
        description: 'أدخل رمز التحقق المكون من 6 أرقام',
        variant: 'destructive',
      });
      return;
    }

    try {
      setActivating(true);
      const res = await api.post('/security/2fa/verify-and-enable', {
        secret: secretKey,
        token: verifyCode.trim(),
      });
      if (res.success) {
        toast({ title: 'تم التفعيل بنجاح 🔒', description: res.message });
        setTwoFactorEnabled(true);
        setSetupStep('idle');
        setVerifyCode('');
      }
    } catch (err: any) {
      toast({
        title: 'رمز غير صحيح',
        description: err.message || 'تأكد من مطابقة الوقت في تطبيق المصادقة',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      toast({ title: 'تنبيه', description: 'أدخل كلمة المرور الحالية للتأكيد', variant: 'destructive' });
      return;
    }

    try {
      setDisabling(true);
      const res = await api.post('/security/2fa/disable', { password: disablePassword });
      if (res.success) {
        toast({ title: 'تم الإلغاء', description: res.message });
        setTwoFactorEnabled(false);
        setShowDisableDialog(false);
        setDisablePassword('');
      }
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message || 'كلمة المرور غير صحيحة', variant: 'destructive' });
    } finally {
      setDisabling(false);
    }
  };

  const handleRevokeSessions = async () => {
    const ok = window.confirm('هل أنت متأكد من تسجيل الخروج من كافة الأجهزة والمتصفحات الأخرى؟');
    if (!ok) return;

    try {
      setRevoking(true);
      const res = await api.post('/security/revoke-all-sessions', {});
      if (res.success) {
        toast({ title: 'تم إنهاء الجلسات', description: res.message });
      }
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setRevoking(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'خطأ', description: 'كلمة المرور الجديدة غير متطابقة', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'تنبيه', description: 'يجب أن لا تقل كلمة المرور عن 6 خانات', variant: 'destructive' });
      return;
    }

    try {
      setChangingPass(true);
      await api.put('/auth/password', { currentPassword, newPassword });
      toast({ title: 'تم التغيير', description: 'تم تحديث كلمة المرور بنجاح' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'فشل التغيير', description: err.message || 'كلمة المرور الحالية غير صحيحة', variant: 'destructive' });
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-foreground">الإعدادات والأمان</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          تخصيص المظهر، إعدادات الحماية والتحقق بخطوتين (2FA)، وتغيير كلمة المرور
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setActiveSubTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeSubTab === 'appearance'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>المظهر والعرض</span>
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeSubTab === 'security'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>الأمان والمصادقة (2FA)</span>
          {twoFactorEnabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('password')}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            activeSubTab === 'password'
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>تغيير كلمة المرور</span>
        </button>
      </div>

      {/* SUBTAB 1: Appearance */}
      {activeSubTab === 'appearance' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-card rounded-3xl border border-border/60 shadow-sm divide-y divide-border/50 overflow-hidden">
            {/* Dark Mode */}
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  {darkMode ? <Moon className="w-6 h-6 text-indigo-400" /> : <Sun className="w-6 h-6 text-amber-500" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-foreground">الوضع الليلي (Dark Mode)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    مظهر حجر سبجي داكن (Obsidian Slate) عالي التباين ومريح للعين
                  </p>
                </div>
              </div>

              <button
                onClick={toggleDarkMode}
                className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer ${
                  darkMode ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`block w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${
                    darkMode ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Font Size */}
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Type className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-foreground">حجم خط النصوص</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">تكبير أو تصغير نصوص المنصة بما يناسب شاشتك</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
                  {fontSize}%
                </span>
              </div>

              <input
                type="range"
                min="20"
                max="80"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-2.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          {/* System Info */}
          <div className="p-6 rounded-3xl bg-muted/40 border border-border/60 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              منصة حاضر الأكاديمية (Hadir LMS) • الإصدار 2.1
            </div>
            <p className="text-muted-foreground leading-relaxed">
              واجهة تفاعلية مرنة تتكيف مع كافة أحجام الشاشات (الهواتف الذكية، الأجهزة اللوحية، والحواسيب المحمولة).
            </p>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Security & 2FA */}
      {activeSubTab === 'security' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Two-Factor Authentication Card */}
          <div className="bg-card p-6 rounded-3xl border border-border/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground">التحقق بخطوتين (2FA - TOTP)</h3>
                  <p className="text-xs text-muted-foreground">Google Authenticator / Microsoft Authenticator</p>
                </div>
              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                twoFactorEnabled 
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              }`}>
                {twoFactorEnabled ? 'مفعل ومحمي' : 'غير مفعل'}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              عند تفعيل المصادقة الثنائية، ستحتاج إلى إدخال رمز مؤقت يتغير كل 30 ثانية من هاتفك، مما يمنع اختراق حسابك حتى لو تسربت كلمة المرور.
            </p>

            {twoFactorEnabled ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  حسابك الجامعي محمي بأعلى معايير الأمان الأكاديمي
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisableDialog(true)}
                  className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  إلغاء تفعيل التحقق بخطوتين
                </Button>
              </div>
            ) : setupStep === 'idle' ? (
              <Button
                onClick={handleStart2FASetup}
                disabled={activating}
                className="gradient-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
              >
                {activating ? 'جاري التحضير...' : 'بدء تفعيل التحقق بخطوتين (2FA)'}
              </Button>
            ) : (
              <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 space-y-4 animate-in fade-in">
                <div className="text-center space-y-2">
                  <p className="text-xs font-bold text-foreground">
                    1. امسح رمز الـ QR التالي بواسطة تطبيق Authenticator:
                  </p>
                  <div className="p-3 bg-white rounded-2xl inline-block shadow-md">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-36 h-36 mx-auto" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">أو أدخل المفتاح السري يدوياً:</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded border">
                      {secretKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(secretKey);
                        setCopiedSecret(true);
                        setTimeout(() => setCopiedSecret(false), 2000);
                        toast({ title: 'تم النسخ', description: 'تم نسخ المفتاح السري' });
                      }}
                      className="p-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleVerify2FA} className="space-y-3 pt-3 border-t border-border/50 max-w-xs mx-auto">
                  <label className="text-xs font-semibold text-foreground block text-center">
                    2. أدخل الرمز المكون من 6 أرقام:
                  </label>
                  <SecureInput
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center font-mono text-xl tracking-widest"
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1 text-xs" onClick={() => setSetupStep('idle')}>
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={activating || verifyCode.length !== 6} className="flex-1 text-xs gradient-primary text-primary-foreground font-bold">
                      {activating ? 'جاري التحقق...' : 'تأكيد وتفعيل'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Active Sessions & Remote Revoke */}
          <div className="bg-card p-6 rounded-3xl border border-border/60 shadow-sm space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-foreground">الجلسات والأجهزة المسجلة</h3>
                <p className="text-xs text-muted-foreground">التحكم في الأجهزة المتصلة بحسابك</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground/90 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                هل نسيت تسجيل الخروج في معمل الكلية أو جهاز عام؟
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                بنقرة واحدة يمكنك إبطال كافة الجلسات المفتوحة على أي أجهزة أخرى فوراً لحماية حسابك من الوصول غير المصرح به.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleRevokeSessions}
              disabled={revoking}
              className="w-full flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 border-destructive/30 font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span>{revoking ? 'جاري الإلغاء...' : 'تسجيل الخروج من كافة الأجهزة الأخرى'}</span>
            </Button>
          </div>

        </div>
      )}

      {/* SUBTAB 3: Change Password */}
      {activeSubTab === 'password' && (
        <div className="bg-card p-6 rounded-3xl border border-border/60 shadow-sm max-w-lg space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-foreground">تغيير كلمة المرور</h4>
              <p className="text-xs text-muted-foreground">اختر كلمة مرور قوية تحتوي على أرقام وحروف</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">كلمة المرور الحالية *</label>
              <div className="relative">
                <SecureInput
                  type={showCurrentPass ? 'text' : 'password'}
                  placeholder="أدخل كلمة المرور الحالية..."
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">كلمة المرور الجديدة *</label>
              <div className="relative">
                <SecureInput
                  type={showNewPass ? 'text' : 'password'}
                  placeholder="لا تقل عن 6 خانات..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">تأكيد كلمة المرور الجديدة *</label>
              <SecureInput
                type="password"
                placeholder="أعد إدخال كلمة المرور الجديدة..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={changingPass}
              className="w-full gradient-primary text-primary-foreground font-bold pt-2.5 pb-2.5"
            >
              {changingPass ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}
            </Button>
          </form>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisableDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black/60 backdrop-blur-sm absolute inset-0" onClick={() => setShowDisableDialog(false)} />
          <div className="bg-card border border-border p-6 rounded-3xl shadow-2xl w-full max-w-sm z-10 relative space-y-4">
            <h3 className="font-black text-foreground text-base">تأكيد إلغاء التحقق بخطوتين</h3>
            <p className="text-xs text-muted-foreground">
              أدخل كلمة المرور الحالية لتأكيد إيقاف الحماية الثنائية لحسابك:
            </p>
            <form onSubmit={handleDisable2FA} className="space-y-4">
              <SecureInput
                type="password"
                placeholder="كلمة المرور الحالية..."
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 text-xs" onClick={() => setShowDisableDialog(false)}>
                  إلغاء
                </Button>
                <Button type="submit" variant="destructive" className="flex-1 text-xs" disabled={disabling}>
                  {disabling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
