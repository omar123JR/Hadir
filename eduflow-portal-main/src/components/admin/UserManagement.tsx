import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Search, GraduationCap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface UserManagementProps {
  onBack: () => void;
}

export function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'teacher' | 'student'>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, [filter, searchQuery]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('role', filter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const response = await api.get(`/admin/users?${params}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل المستخدمين',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    const name = userToDelete?.name || 'المستخدم';
    const ok = window.confirm(`هل أنت متأكد من حذف ${name}؟ هذا الإجراء لا يمكن التراجع عنه.`);
    if (!ok) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      toast({
        title: 'تم الحذف',
        description: `${name} تم حذفه بنجاح`,
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف المستخدم',
        variant: 'destructive',
      });
    }
  };

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleUpdate = async (updated: User) => {
    try {
      await api.put(`/admin/users/${updated.id}`, updated);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditingUser(null);
      toast({ title: 'تم التعديل', description: `${updated.name} تم تحديث البيانات` });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المستخدم',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="flex justify-between items-start gap-4">
        <PageHeader
          title="إدارة المستخدمين"
          subtitle={`${users.length} مستخدم`}
          onBack={onBack}
        />
        <AddUserDialog onAdd={(user) => setUsers([...users, user])} />
      </div>

      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن مستخدم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'teacher', 'student'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? 'gradient-primary text-primary-foreground' : ''}
            >
              {f === 'all' ? 'الكل' : f === 'teacher' ? 'معلمين' : 'طلاب'}
            </Button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">لا توجد مستخدمين</div>
        ) : (
          users.map((user) => (
            <UserCard key={user.id} user={user} onDelete={() => handleDelete(user.id)} onEdit={() => setEditingUser(user)} />
          ))
        )}
        {editingUser && (
          <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} onUpdate={handleUpdate} />
        )}
      </div>
    </div>
  );
}

interface UserCardProps {
  user: User;
  onDelete: () => void;
  onEdit?: () => void;
}

function UserCard({ user, onDelete, onEdit }: UserCardProps) {
  const Icon = user.role === 'teacher' ? BookOpen : GraduationCap;
  const roleLabel = user.role === 'teacher' ? 'معلم' : 'طالب';
  const variant = user.role === 'teacher' ? 'primary' : 'success';

  return (
    <div className="bg-card p-4 rounded-xl shadow-card border border-border/50 flex justify-between items-center hover:shadow-card-hover transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          user.role === 'teacher' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-foreground">{user.name}</h4>
          <p className="text-xs text-muted-foreground">
            {user.email} {user.studentId && `• ${user.studentId}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill label={roleLabel} variant={variant as 'success' | 'warning' | 'destructive' | 'default'} />
        <button onClick={typeof onEdit === 'function' ? onEdit : undefined} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface EditUserDialogProps {
  user: User;
  onClose: () => void;
  onUpdate: (user: User) => void;
}

function EditUserDialog({ user, onClose, onUpdate }: EditUserDialogProps) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [role, setRole] = useState<User['role']>(user.role || 'student');
  const [studentId, setStudentId] = useState(user.studentId || '');
  const [newPassword, setNewPassword] = useState('');

  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast({ title: 'خطأ', description: 'أكمل الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    const updated: User = { ...user, name: name.trim(), email: email.trim(), role, studentId: role === 'student' ? studentId.trim() : undefined };
    
    if (newPassword.trim()) {
      const ok = window.confirm('هل أنت متأكد من تغيير كلمة المرور لهذا المستخدم؟');
      if (!ok) return;
      try {
        await api.post(`/admin/users/${user.id}/password`, { newPassword: newPassword.trim() });
        toast({ title: 'نجاح', description: 'تم تغيير كلمة المرور بنجاح' });
      } catch (err: any) {
        toast({ title: 'خطأ', description: err.message || 'فشل تغيير كلمة المرور', variant: 'destructive' });
        return; // Stop update if password reset failed
      }
    }
    
    onUpdate(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-overlay absolute inset-0" onClick={onClose} />
      <div className="bg-card p-6 rounded-xl shadow-lg w-full max-w-md z-10">
        <h3 className="font-bold text-lg mb-4">تعديل المستخدم</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm">الاسم</label>
            <input className="w-full p-2 rounded mt-1 bg-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">البريد</label>
            <input className="w-full p-2 rounded mt-1 bg-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className={`flex-1 p-2 rounded ${role === 'student' ? 'gradient-primary text-primary-foreground' : 'border'}`} onClick={() => setRole('student')}>طالب</button>
            <button className={`flex-1 p-2 rounded ${role === 'teacher' ? 'gradient-primary text-primary-foreground' : 'border'}`} onClick={() => setRole('teacher')}>معلم</button>
          </div>
          {role === 'student' && (
            <div>
              <label className="text-sm">الرقم الجامعي</label>
              <input className="w-full p-2 rounded mt-1 bg-input" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            </div>
          )}
          <div className="mt-4 pt-4 border-t">
            <label className="text-sm font-bold text-destructive">إعادة تعيين كلمة المرور (اختياري)</label>
            <input className="w-full p-2 rounded mt-1 bg-input" type="password" placeholder="اتركه فارغاً لعدم التغيير" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 p-2 rounded bg-muted" onClick={onClose}>إلغاء</button>
            <button className="flex-1 p-2 rounded gradient-primary text-primary-foreground" onClick={handleSubmit}>حفظ</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AddUserDialogProps {
  onAdd: (user: User) => void;
}

function AddUserDialog({ onAdd }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    if (role === 'student' && !studentId.trim()) {
      toast({
        title: 'خطأ',
        description: 'الرقم الجامعي مطلوب للطلاب',
        variant: 'destructive',
      });
      return;
    }

    try {
      const userData = {
        name: name.trim(),
        email: email.trim(),
        role,
        student_id: role === 'student' ? studentId.trim() : undefined,
        department: department.trim() || undefined,
      };

      const response = await api.post('/admin/users', userData);
      onAdd(response.data);
      toast({
        title: 'تمت الإضافة',
        description: `تم إضافة ${name} بنجاح`,
      });
      setOpen(false);
      setName('');
      setEmail('');
      setStudentId('');
      setDepartment('');
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إضافة المستخدم',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 ml-2" />
          إضافة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة مستخدم جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">الاسم الكامل</label>
            <Input
              placeholder="أدخل الاسم"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">البريد الإلكتروني</label>
            <Input
              type="email"
              placeholder="example@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">القسم (اختياري)</label>
            <Input
              placeholder="علوم الحاسوب"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">نوع المستخدم</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={role === 'student' ? 'default' : 'outline'}
                className={`flex-1 ${role === 'student' ? 'gradient-primary text-primary-foreground' : ''}`}
                onClick={() => setRole('student')}
              >
                طالب
              </Button>
              <Button
                type="button"
                variant={role === 'teacher' ? 'default' : 'outline'}
                className={`flex-1 ${role === 'teacher' ? 'gradient-primary text-primary-foreground' : ''}`}
                onClick={() => setRole('teacher')}
              >
                معلم
              </Button>
            </div>
          </div>
          {role === 'student' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">الرقم الجامعي</label>
              <Input
                placeholder="20251000"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
          )}
          <Button 
            onClick={handleSubmit}
            className="w-full gradient-primary text-primary-foreground"
          >
            إضافة المستخدم
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
