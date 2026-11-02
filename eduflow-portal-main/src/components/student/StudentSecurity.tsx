import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Smartphone, 
  LogOut, 
  Copy, 
  Check, 
  AlertTriangle, 
  QrCode, 
  CreditCard, 
  Lock, 
  Unlock,
  RefreshCw,
  Clock,
  FileText,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SecureInput } from '@/components/ui/SecureInput';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface FinancialStatus {
  total_tuition: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  is_frozen: boolean;
  freeze_reason: string | null;
  last_payment_date: string | null;
  transactions?: Array<{
    id: number;
    amount: number;
    receipt_number: string;
    payment_method: string;
    created_at: string;
    notes?: string;
  }>;
}

export function StudentSecurity() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Security state
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  
  // 2FA Setup flow
  const [setupStep, setSetupStep] = useState<'idle' | 'scanning' | 'verifying'>('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Disable 2FA flow
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling, setDisabling] = useState(false);

  // Revoke sessions
  const [revoking, setRevoking] = useState(false);

  // Financial status
  const [financials, setFinancials] = useState<FinancialStatus | null>(null);

  useEffect(() => {
    loadSecurityAndFinancials();
  }, []);

  const loadSecurityAndFinancials = async () => {
    try {
      setLoading(true);
      const [secRes, finRes] = await Promise.allSettled([
        api.get('/security/status'),
        api.get('/financials/my-status'),
      ]);

      if (secRes.status === 'fulfilled' && secRes.value.success) {
        setTwoFactorEnabled(secRes.value.data.twoFactorEnabled);
      }

      if (finRes.status === 'fulfilled' && finRes.value.success) {
        setFinancials(finRes.value.data);
      }
    } catch (err: any) {
      console.error('Failed to load security info:', err);
    } finally {
      setLoading(false);
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
        description: err.message || 'فشل في بدء إعداد المصادقة الثنائية',
        variant: 'destructive',
      });
    } finally {
      setActivating(false);
    }
  };

  const handleVerifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      toast({
        title: 'تنبيه',
        description: 'يرجى إدخال رمز التحقق المكون من 6 أرقام',
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
        toast({
          title: 'تم التفعيل بنجاح! 🔒',
          description: res.message,
        });
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
      toast({
        title: 'تنبيه',
        description: 'أدخل كلمة المرور لتأكيد إلغاء التفعيل',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDisabling(true);
      const res = await api.post('/security/2fa/disable', { password: disablePassword });
      if (res.success) {
        toast({
          title: 'تم الإلغاء',
          description: res.message,
        });
        setTwoFactorEnabled(false);
        setShowDisableDialog(false);
        setDisablePassword('');
      }
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message || 'كلمة المرور غير صحيحة',
        variant: 'destructive',
      });
    } finally {
      setDisabling(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    const ok = window.confirm('هل أنت متأكد من تسجيل الخروج من كافة الأجهزة والمتصفحات الأخرى؟');
    if (!ok) return;

    try {
      setRevoking(true);
      const res = await api.post('/security/revoke-all-sessions', {});
      if (res.success) {
        toast({
          title: 'تم إنهاء الجلسات',
          description: res.message,
        });
      }
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message || 'فشل في إلغاء الجلسات',
        variant: 'destructive',
      });
    } finally {
      setRevoking(false);
    }
  };

  const copySecretKey = () => {
    navigator.clipboard.writeText(secretKey);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast({ title: 'تم النسخ', description: 'تم نسخ المفتاح السري' });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">أمان الحساب والتحقق الثنائي</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                تأمين حسابك الأكاديمي، إدارة الأجهزة المسجلة، ومتابعة السجل المالي
              </p>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadSecurityAndFinancials} 
          disabled={loading}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Account Freeze Alert Banner */}
      {financials?.is_frozen && (
        <div className="p-5 rounded-2xl bg-destructive/10 border-2 border-destructive/40 shadow-lg shadow-destructive/10 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 border border-destructive/40 flex items-center justify-center text-destructive shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-base text-destructive">حسابك الأكاديمي مجمد مؤقتاً!</h4>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {financials.freeze_reason || 'تم إيقاف صلاحيات الحضور وتسليم الواجبات لمراجعة الشؤون المالية للكلية.'}
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              يرجى مراجعة الإدارة المالية لشؤون الطلاب لتسوية الوضع الأكاديمي وإعادة تفعيل الحساب فوراً.
            </p>
          </div>
        </div>
      )}

      {/* Grid: 2FA & Session Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Two-Factor Authentication Card */}
        <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">التحقق بخطوتين (2FA)</h3>
                  <p className="text-xs text-muted-foreground">Google / Microsoft Authenticator</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                twoFactorEnabled 
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              }`}>
                {twoFactorEnabled ? 'مفعل ومحمي' : 'غير مفعل'}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              عند تفعيل التحقق بخطوتين، سيطلب منك النظام إدخال رمز إضافي من هاتفك عند تسجيل الدخول، مما يمنع أي شخص من اختراق حسابك حتى لو حصل على كلمة المرور.
            </p>

            {/* If 2FA is Enabled */}
            {twoFactorEnabled && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  حسابك الجامعي محمي بأعلى معايير الأمان الأكاديمي
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisableDialog(true)}
                  className="w-full text-xs text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                  إلغاء تفعيل التحقق بخطوتين
                </Button>
              </div>
            )}

            {/* If 2FA is Disabled and Not In Setup */}
            {!twoFactorEnabled && setupStep === 'idle' && (
              <Button
                onClick={handleStart2FASetup}
                disabled={activating}
                className="w-full gradient-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
              >
                {activating ? 'جاري التحضير...' : 'بدء تفعيل التحقق بخطوتين'}
              </Button>
            )}

            {/* 2FA Setup Dialog / Step: Scanning */}
            {!twoFactorEnabled && setupStep === 'scanning' && (
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-4 animate-in fade-in">
                <div className="text-center space-y-2">
                  <p className="text-xs font-bold text-foreground">
                    1. امسح رمز الـ QR التالي بواسطة تطبيق Authenticator:
                  </p>
                  <div className="p-3 bg-white rounded-xl inline-block shadow-md">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-36 h-36 mx-auto" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    أو أدخل المفتاح السري يدوياً في التطبيق:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded border">
                      {secretKey}
                    </code>
                    <button
                      type="button"
                      onClick={copySecretKey}
                      className="p-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                      title="نسخ المفتاح"
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleVerifyAndEnable2FA} className="space-y-3 pt-2 border-t border-border/50">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      2. أدخل الرمز المكون من 6 أرقام للتحقق:
                    </label>
                    <SecureInput
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center font-mono text-lg tracking-widest"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 text-xs" 
                      onClick={() => setSetupStep('idle')}
                    >
                      إلغاء
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={activating || verifyCode.length !== 6}
                      className="flex-1 text-xs gradient-primary text-primary-foreground font-bold"
                    >
                      {activating ? 'جاري التحقق...' : 'تأكيد وحفظ'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* 2. Device & Session Management Card */}
        <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">الجلسات والأجهزة النشطة</h3>
                <p className="text-xs text-muted-foreground">التحكم في الأجهزة المتصلة بحسابك</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">الجهاز الحالي</span>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  نشط الآن
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                متصفح ويب • عنوان IP محمي • توكن الجلسة مشفر بـ JWT
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground/90 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                هل نسيت تسجيل الخروج في معمل الكلية؟
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                إذا قمت بتسجيل الدخول من جهاز عام أو تشك في أي نشاط مريب، يمكنك بنقرة واحدة إبطال كافة الجلسات المسجلة فوراً.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button
              variant="outline"
              onClick={handleRevokeAllSessions}
              disabled={revoking}
              className="w-full flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 border-destructive/30 font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>{revoking ? 'جاري الإلغاء...' : 'تسجيل الخروج من كافة الأجهزة الأخرى'}</span>
            </Button>
          </div>
        </div>

      </div>

      {/* 3. Financial & Academic Status Card */}
      <div className="bg-card p-6 rounded-2xl border border-border/60 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">السجل المالي والأكاديمي للطالب</h3>
              <p className="text-xs text-muted-foreground">متابعة الرسوم الدراسية وأقساط الفصل الحالي</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            financials?.status === 'paid'
              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
          }`}>
            {financials?.status === 'paid' ? 'تم سداد الرسوم بالكامل' : 'يوجد مستحقات مالية'}
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground">إجمالي الرسوم الدراسية</span>
            <p className="text-xl font-extrabold text-foreground mt-1">
              {financials ? Number(financials.total_tuition).toLocaleString() : '---'} د.ل
            </p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-xs text-emerald-600 font-semibold">المبلغ المسدد</span>
            <p className="text-xl font-extrabold text-emerald-500 mt-1">
              {financials ? Number(financials.paid_amount).toLocaleString() : '---'} د.ل
            </p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs text-amber-600 font-semibold">المبلغ المتبقي</span>
            <p className="text-xl font-extrabold text-amber-500 mt-1">
              {financials ? Number(financials.remaining_amount).toLocaleString() : '---'} د.ل
            </p>
          </div>
        </div>

        {/* Payment History */}
        {financials?.transactions && financials.transactions.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-foreground">إيصالات السداد المسجلة:</h4>
            <div className="space-y-2">
              {financials.transactions.map((tx) => (
                <div key={tx.id} className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <span className="font-bold text-foreground">إيصال رقم: {tx.receipt_number}</span>
                      <span className="text-muted-foreground mr-2 font-mono text-[11px]">
                        ({new Date(tx.created_at).toLocaleDateString('ar-LY')})
                      </span>
                    </div>
                  </div>
                  <div className="text-left font-bold text-emerald-500">
                    +{Number(tx.amount).toLocaleString()} د.ل ({tx.payment_method})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disable 2FA Modal */}
      {showDisableDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-black/60 backdrop-blur-sm absolute inset-0" onClick={() => setShowDisableDialog(false)} />
          <div className="bg-card border border-border p-6 rounded-2xl shadow-xl w-full max-w-sm z-10 relative space-y-4">
            <h3 className="font-bold text-foreground text-base">تأكيد إلغاء التحقق بخطوتين</h3>
            <p className="text-xs text-muted-foreground">
              يرجى إدخال كلمة المرور الحالية لتأكيد إيقاف الحماية الثنائية لحسابك:
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
