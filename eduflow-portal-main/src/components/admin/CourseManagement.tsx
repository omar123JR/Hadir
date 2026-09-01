import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { Course } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CourseManagementProps {
  onBack: () => void;
}

export function CourseManagement({ onBack }: CourseManagementProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
    fetchUsers();
  }, [searchQuery]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users?role=teacher');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const params = searchQuery.trim() ? `?search=${searchQuery.trim()}` : '';
      const response = await api.get(`/admin/courses${params}`);
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setCourses([]);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل المقررات من الخادم',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    const name = course?.name || 'المقرر';
    const ok = window.confirm(`هل أنت متأكد من حذف المقرر ${name}؟`);
    if (!ok) return;

    try {
      await api.delete(`/admin/courses/${courseId}`);
      setCourses(courses.filter(c => c.id !== courseId));
      toast({
        title: 'تم الحذف',
        description: `${name} تم حذفه بنجاح`,
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف المقرر',
        variant: 'destructive',
      });
    }
  };

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const handleUpdate = async (updated: Course) => {
    try {
      await api.put(`/admin/courses/${updated.id}`, updated);
      setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingCourse(null);
      toast({ title: 'تم التعديل', description: `${updated.name} تم تحديث البيانات` });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المقرر',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="flex justify-between items-start gap-4">
        <PageHeader
          title="إدارة المقررات"
          subtitle={`${courses.length} مقرر`}
          onBack={onBack}
        />
        <AddCourseDialog onAdd={(course) => setCourses([...courses, course])} teachers={users} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="البحث عن مقرر..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Courses List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">لا توجد مقررات</div>
        ) : (
          courses.map((course) => (
            <CourseCard key={course.id} course={course} onDelete={() => handleDelete(course.id)} onEdit={() => setEditingCourse(course)} />
          ))
        )}
        {editingCourse && (
          <EditCourseDialog course={editingCourse} onClose={() => setEditingCourse(null)} onUpdate={handleUpdate} />
        )}
      </div>
    </div>
  );
}

interface CourseCardProps {
  course: Course;
  onDelete: () => void;
  onEdit?: () => void;
}

function CourseCard({ course, onDelete, onEdit }: CourseCardProps) {
  return (
    <div className="bg-card p-4 rounded-xl shadow-card border border-border/50 hover:shadow-card-hover transition-all">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
            {course.code ? course.code.split('-')[0] : 'N/A'}
          </div>
          <div>
            <h4 className="font-bold text-foreground">{course.name}</h4>
            <p className="text-xs text-muted-foreground">{course.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors">
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
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>المعلم: {course.teacher_name || 'غير معين'}</span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {course.students_count || 0} طالب
        </span>
      </div>
    </div>
  );
}

interface EditCourseDialogProps {
  course: Course;
  onClose: () => void;
  onUpdate: (course: Course) => void;
}

function EditCourseDialog({ course, onClose, onUpdate }: EditCourseDialogProps) {
  const [name, setName] = useState(course.name || '');
  const [code, setCode] = useState(course.code || '');
  const [teacherName, setTeacherName] = useState(course.teacher_name || '');
  const [description, setDescription] = useState(course.description || '');
  const [lecturesCount, setLecturesCount] = useState(course.lectures_count || 0);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!name.trim() || !code.trim()) {
      toast({ title: 'خطأ', description: 'الاسم والرمز مطلوبان', variant: 'destructive' });
      return;
    }
    const updated: Course = {
      ...course,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      teacher_name: teacherName.trim() || 'غير معين',
      description: description.trim(),
      lectures_count: Number(lecturesCount) || 0,
    };
    onUpdate(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-overlay absolute inset-0" onClick={onClose} />
      <div className="bg-card p-6 rounded-xl shadow-lg w-full max-w-md z-10" dir="rtl">
        <h3 className="font-bold text-lg mb-4">تعديل المقرر</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm">اسم المقرر</label>
            <input className="w-full p-2 rounded mt-1 bg-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">رمز المقرر</label>
            <input className="w-full p-2 rounded mt-1 bg-input" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">المعلم</label>
            <input className="w-full p-2 rounded mt-1 bg-input" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">عدد المحاضرات</label>
            <input type="number" className="w-full p-2 rounded mt-1 bg-input" value={String(lecturesCount)} onChange={(e) => setLecturesCount(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm">الوصف</label>
            <textarea className="w-full p-2 rounded mt-1 bg-input" value={description} onChange={(e) => setDescription(e.target.value)} />
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

interface AddCourseDialogProps {
  onAdd: (course: Course) => void;
  teachers: any[];
}

function AddCourseDialog({ onAdd, teachers }: AddCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim() || !teacherId) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    try {
      const courseData = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        teacher_id: teacherId || undefined,
      };

      const response = await api.post('/admin/courses', courseData);
      onAdd(response.data);
      toast({
        title: 'تمت الإضافة',
        description: `تم إضافة ${name} بنجاح`,
      });
      setOpen(false);
      setName('');
      setCode('');
      setTeacherId('');
      setDescription('');
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إضافة المقرر',
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
          <DialogTitle>إضافة مقرر جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">اسم المقرر</label>
            <Input
              placeholder="مثال: برمجة ويب"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">رمز المقرر</label>
            <Input
              placeholder="مثال: CS-101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">المعلم (اختياري)</label>
            <Select
              value={teacherId}
              onValueChange={setTeacherId}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر معلماً..." />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">الوصف (اختياري)</label>
            <Input
              placeholder="وصف مختصر للمقرر"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleSubmit}
            className="w-full gradient-primary text-primary-foreground"
          >
            إضافة المقرر
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
