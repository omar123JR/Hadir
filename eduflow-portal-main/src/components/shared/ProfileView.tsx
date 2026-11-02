import { useState } from 'react';
import { User, Globe, Bell, MapPin, ShieldCheck, BookOpen, GraduationCap, Loader2, Edit3, KeyRound, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export function ProfileView() {
  const { user } = useAuth();
  const [openEdit, setOpenEdit] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const { toast } = useToast();

  const roleConfig: any = {
    admin: { label: 'مدير النظام المركزي', icon: ShieldCheck, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
    teacher: { label: 'عضو هيئة تدريس', icon: BookOpen, color: 'text-primary bg-primary/10 border-primary/20' },
    student: { label: 'طالب جامعي مسجل', icon: GraduationCap, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  };

  const config = roleConfig[user?.role || 'student'] || roleConfig.student;

  const handleEditClick = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setOpenEdit(true);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const res = await api.put('/auth/profile', formData);
      const savedUser = JSON.parse(localStorage.getItem('hadir_user') || '{}');
      const updatedUser = { ...savedUser, ...res.data };
      localStorage.setItem('hadir_user', JSON.stringify(updatedUser));

      toast({ title: 'نجاح', description: 'تم تحديث البيانات الشخصية بنجاح' });
      setOpenEdit(false);
      setTimeout(() => window.location.reload(), 500);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل تحديث الملف الشخصي',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'خطأ', description: 'كلمتا المرور غير متطابقتين', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: 'خطأ', description: 'كلمة المرور يجب أن لا تقل عن 6 أحرف', variant: 'destructive' });
      return;
    }

    try {
      setSavingPassword(true);
      await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      toast({ title: 'تم التغيير', description: 'تم تغيير كلمة المرور بنجاح' });
      setOpenPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تغيير كلمة المرور',
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Profile Card Header */}
      <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/60 shadow-lg text-center relative overflow-hidden space-y-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative inline-block mx-auto">
          <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-3xl font-black shadow-inner mx-auto">
            {user?.name ? user.name.slice(0, 2) : 'ح'}
          </div>
          <div className="absolute -bottom-1 -left-1 p-1.5 rounded-xl bg-card border border-border shadow-sm text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-foreground">{user?.name}</h2>
          <p className="text-xs text-muted-foreground font-mono">{user?.email}</p>
          
          <div className="pt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.color}`}>
              <config.icon className="w-3.5 h-3.5" />
              {config.label}
            </span>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border/50 text-right">
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50">
            <span className="text-[10px] text-muted-foreground block font-bold">الرقم الأكاديمي / القيد</span>
            <span className="text-sm font-mono font-bold text-foreground">
              {user?.student_id || user?.studentId || user?.teacher_code || user?.id?.substring(0, 8)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50">
            <span className="text-[10px] text-muted-foreground block font-bold">القسم الأكاديمي</span>
            <span className="text-sm font-bold text-foreground">
              {user?.department || 'كلية تقنية المعلومات'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={handleEditClick}
            variant="outline"
            className="flex-1 font-bold text-xs h-11 rounded-xl"
          >
            <Edit3 className="w-4 h-4 ml-1.5" />
            تعديل الاسم والبريد
          </Button>

          <Button
            onClick={() => setOpenPassword(true)}
            className="flex-1 gradient-primary text-primary-foreground font-bold text-xs h-11 rounded-xl shadow-glow"
          >
            <KeyRound className="w-4 h-4 ml-1.5" />
            تغيير كلمة المرور
          </Button>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">تعديل الملف الشخصي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">الاسم الكامل</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">البريد الإلكتروني</label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-11 rounded-xl text-left"
                dir="ltr"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpenEdit(false)}>
                إلغاء
              </Button>
              <Button type="button" disabled={loading} onClick={handleSaveProfile} className="flex-1 gradient-primary text-primary-foreground font-bold shadow-glow">
                {loading ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : 'حفظ التعديلات'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={openPassword} onOpenChange={setOpenPassword}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">تغيير كلمة المرور</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">كلمة المرور الحالية</label>
              <Input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">كلمة المرور الجديدة</label>
              <Input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">تأكيد كلمة المرور الجديدة</label>
              <Input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpenPassword(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={savingPassword} className="flex-1 gradient-primary text-primary-foreground font-bold shadow-glow">
                {savingPassword ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : 'تحديث كلمة المرور'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
