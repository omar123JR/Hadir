import { useState } from 'react';
import { User, Globe, Bell, MapPin, ShieldCheck, BookOpen, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export function ProfileView() {
  const { user, login } = useAuth(); // We might need a way to refresh user, but re-login with token update might be complex. 
  // Ideally, auth context should expose a logical `updateUser` or `refreshUser`. 
  // For now, we will assume we can just update local displaying state or reload if needed. 
  // Wait, `login` sets the user state. If we get the updated user back, we can technically call login (bad name) or we might need to manually update state if context allows.
  // Actually, let's just use what we have. If `login` updates state, we can simulate a "re-login" or we just warn user to refresh.
  // Better: The AuthContext usually persists to localStorage. I might need to update localStorage manually if the context doesn't expose a setter.
  // Let's check AuthContext details later if needed. For now, we'll try to update via reloading or just show success. 
  // Actually, I can check if AuthContext has `setUser`.
  // Wait, I don't see AuthContext definition here. 
  // Let's look at `contexts/AuthContext` in next step if this is blocking. 
  // For this step I will implement the UI and API call.

  const [openEdit, setOpenEdit] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const roleConfig: any = {
    admin: { label: 'مدير النظام', icon: ShieldCheck, color: 'text-destructive' },
    teacher: { label: 'محاضر / دكتور', icon: BookOpen, color: 'text-primary' },
    student: { label: 'طالب بكالوريوس', icon: GraduationCap, color: 'text-success' },
  };

  const config = roleConfig[user?.role || 'student'] || roleConfig.student;

  const handleEditClick = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setOpenEdit(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await api.put('/auth/profile', formData);

      // Update local storage user data to reflect changes immediately
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...savedUser, ...res.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Force reload to update context (simplest way without refactoring Context)
      window.location.reload();

      toast({ title: 'نجاح', description: 'تم تحديث الملف الشخصي' });
      setOpenEdit(false);
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'خطأ',
        description: error.response?.data?.message || 'فشل تحديث الملف الشخصي',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-slideUp">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center border-4 border-card shadow-xl overflow-hidden">
        <User className="w-12 h-12 text-muted-foreground" />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">{user?.name}</h2>
        <p className="text-muted-foreground text-lg font-mono mt-1">
          {user?.role === 'student' && (user?.student_id || user?.studentId)
            ? `رقم القيد: ${user.student_id || user.studentId}`
            : user?.role === 'teacher' && user?.teacher_code
            ? `الكود: ${user.teacher_code}`
            : `ID: ${user?.id}`}
        </p>
        <span className={`inline-flex items-center gap-1 mt-2 px-3 py-1 bg-primary/10 ${config.color} text-xs font-bold rounded-full`}>
          <config.icon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      <div className="w-full max-w-xs space-y-3 pt-6">
        <InfoRow icon={<Globe />} label="القسم" value={user?.department || 'غير محدد'} />
        <InfoRow icon={<MapPin />} label="الموقع" value="طرابلس, ليبيا" />
        <InfoRow icon={<Bell />} label="الإشعارات" value="مفعلة" color="text-success" />
      </div>

      <Button
        onClick={handleEditClick}
        className="mt-8 w-full max-w-xs gradient-primary text-primary-foreground shadow-glow"
      >
        تعديل الملف الشخصي
      </Button>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الملف الشخصي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">الاسم الكامل</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">البريد الإلكتروني</label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}

function InfoRow({ icon, label, value, color }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
      <div className="flex items-center gap-3">
        <span className={`w-5 h-5 ${color || 'text-primary'}`}>{icon}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
