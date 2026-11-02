import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Search, Users, MapPin, Clock, Calendar, ShieldCheck } from 'lucide-react';
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
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const params = searchQuery.trim() ? `?search=${searchQuery.trim()}` : '';
      const response = await api.get(`/admin/courses${params}`);
      setCourses(response.data || []);
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
      toast({ title: 'تم التعديل', description: `تم تحديث جدول وبيانات مقرر ${updated.name}` });
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في تحديث المقرر',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="إدارة المقررات والجداول الدراسية"
          subtitle={`${courses.length} مقرر معتمد • تحديد القاعات والمواعيد`}
          onBack={onBack}
        />
        <AddCourseDialog onAdd={(course) => setCourses([course, ...courses])} teachers={users} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="البحث برمز المقرر، الاسم، أو القاعة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Courses List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">جاري تحميل المقررات...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
            لا توجد مقررات دراسية مضافة
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <CourseCard 
                key={course.id} 
                course={course} 
                onDelete={() => handleDelete(course.id)} 
                onEdit={() => setEditingCourse(course)} 
              />
            ))}
          </div>
        )}

        {editingCourse && (
          <EditCourseDialog 
            course={editingCourse} 
            teachers={users}
            onClose={() => setEditingCourse(null)} 
            onUpdate={handleUpdate} 
          />
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
    <div className="bg-card p-5 rounded-2xl shadow-sm border border-border/70 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div>
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary font-bold text-sm">
              {course.code ? course.code.split('-')[0] : 'CRS'}
            </div>
            <div>
              <h4 className="font-extrabold text-base text-foreground">{course.name}</h4>
              <p className="text-xs text-muted-foreground font-mono">{course.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={onEdit} 
              className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
              title="تعديل المقرر والجدول والقاعة"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={onDelete}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
              title="حذف المقرر"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Schedule & Hall Location Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/50 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/40">
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] text-muted-foreground block">مكان القاعة</span>
              <span className="font-bold text-foreground truncate block">
                {course.room || 'قاعة 101'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/40">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] text-muted-foreground block">الموعد الأسبوعي</span>
              <span className="font-bold text-foreground truncate block">
                {course.schedule_day || 'الأحد - الثلاثاء'} ({course.schedule_time || '09:00 ص'})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
        <span>المحاضر: <strong className="text-foreground">{course.teacher_name || 'غير معين'}</strong></span>
        <span>الساعات: <strong className="text-primary">{course.credit_hours || 3} س.م</strong></span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {course.students_count || 0} طالب
        </span>
      </div>
    </div>
  );
}

interface EditCourseDialogProps {
  course: Course;
  teachers: any[];
  onClose: () => void;
  onUpdate: (course: Course) => void;
}

function EditCourseDialog({ course, teachers, onClose, onUpdate }: EditCourseDialogProps) {
  const [name, setName] = useState(course.name || '');
  const [code, setCode] = useState(course.code || '');
  const [teacherId, setTeacherId] = useState(course.teacher_id || '');
  const [room, setRoom] = useState(course.room || 'قاعة الخوارزمي (204)');
  const [scheduleDay, setScheduleDay] = useState(course.schedule_day || 'الأحد - الثلاثاء');
  const [scheduleTime, setScheduleTime] = useState(course.schedule_time || '09:00 ص - 10:30 ص');
  const [creditHours, setCreditHours] = useState(course.credit_hours || 3);
  const [description, setDescription] = useState(course.description || '');
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
      teacher_id: teacherId || undefined,
      teacher_name: teachers.find(t => t.id === teacherId)?.name || course.teacher_name,
      room: room.trim() || 'قاعة 101',
      schedule_day: scheduleDay.trim() || 'الأحد - الثلاثاء',
      schedule_time: scheduleTime.trim() || '09:00 ص - 10:30 ص',
      credit_hours: Number(creditHours) || 3,
      description: description.trim(),
    };
    onUpdate(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-black/60 backdrop-blur-sm absolute inset-0" onClick={onClose} />
      <div className="bg-card border border-border/80 p-6 rounded-2xl shadow-2xl w-full max-w-lg z-10 relative overflow-y-auto max-h-[90vh]" dir="rtl">
        <h3 className="font-extrabold text-lg text-foreground mb-4">تعديل المقرر وتحديد القاعة والجدول</h3>
        
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">اسم المقرر *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="font-semibold text-foreground block mb-1">رمز المقرر *</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">المحاضر</label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر محاضراً..." />
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
            <div>
              <label className="font-semibold text-foreground block mb-1">الساعات المعتمدة</label>
              <Input 
                type="number" 
                min={1} 
                max={6} 
                value={creditHours} 
                onChange={(e) => setCreditHours(Number(e.target.value))} 
              />
            </div>
          </div>

          {/* Room & Schedule inputs */}
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
            <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              <MapPin className="w-4 h-4 text-emerald-500" />
              تحديد مكان القاعة والجدول الزمني
            </h4>

            <div>
              <label className="text-muted-foreground block mb-1">مكان القاعة (Room / Hall)</label>
              <Input 
                placeholder="مثال: قاعة الخوارزمي (204) - مبنى الحاسوب" 
                value={room} 
                onChange={(e) => setRoom(e.target.value)} 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground block mb-1">أيام المحاضرة</label>
                <Input 
                  placeholder="مثال: الأحد - الثلاثاء" 
                  value={scheduleDay} 
                  onChange={(e) => setScheduleDay(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">وقت المحاضرة</label>
                <Input 
                  placeholder="مثال: 09:00 ص - 10:30 ص" 
                  value={scheduleTime} 
                  onChange={(e) => setScheduleTime(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">وصف المقرر</label>
            <textarea 
              rows={2} 
              className="w-full p-2.5 rounded-xl border border-input bg-background text-foreground text-xs" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
            <Button className="flex-1 gradient-primary text-primary-foreground font-bold" onClick={handleSubmit}>
              حفظ التعديلات
            </Button>
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
  const [room, setRoom] = useState('قاعة الخوارزمي (204)');
  const [scheduleDay, setScheduleDay] = useState('الأحد - الثلاثاء');
  const [scheduleTime, setScheduleTime] = useState('09:00 ص - 10:30 ص');
  const [creditHours, setCreditHours] = useState(3);
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast({
        title: 'خطأ',
        description: 'اسم المقرر ورمزه حقول مطلوبة',
        variant: 'destructive',
      });
      return;
    }

    try {
      const courseData = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        teacher_id: teacherId || undefined,
        credit_hours: Number(creditHours) || 3,
        room: room.trim() || 'قاعة 101',
        schedule_day: scheduleDay.trim() || 'الأحد - الثلاثاء',
        schedule_time: scheduleTime.trim() || '09:00 ص - 10:30 ص',
        description: description.trim() || undefined,
      };

      const response = await api.post('/admin/courses', courseData);
      onAdd(response.data);
      toast({
        title: 'تمت الإضافة بنجاح',
        description: `تم إضافة المقرر ${name} وتحديد القاعة ${room}`,
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
        <Button className="gradient-primary text-primary-foreground font-bold shadow-md shadow-primary/20">
          <Plus className="w-4 h-4 ml-1.5" />
          إضافة مقرر وجدول
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">إضافة مقرر دراسي وجدولة القاعة</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 pt-2 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-semibold block mb-1">اسم المقرر *</label>
              <Input
                placeholder="مثال: هندسة البرمجيات"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">رمز المقرر *</label>
              <Input
                placeholder="مثال: CS-301"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-semibold block mb-1">المحاضر</label>
              <Select value={teacherId} onValueChange={setTeacherId}>
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
            <div>
              <label className="font-semibold block mb-1">الساعات المعتمدة</label>
              <Input
                type="number"
                min={1}
                max={6}
                value={creditHours}
                onChange={(e) => setCreditHours(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Classroom & Schedule Group */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
            <label className="font-bold text-foreground flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-500" />
              مكان القاعة والموعد الأكاديمي
            </label>
            <div>
              <Input
                placeholder="مكان القاعة (مثال: قاعة 104 - مبنى العلوم)"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                placeholder="الأيام: الأحد - الثلاثاء"
                value={scheduleDay}
                onChange={(e) => setScheduleDay(e.target.value)}
              />
              <Input
                placeholder="الوقت: 09:00 ص - 10:30 ص"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">الوصف (اختياري)</label>
            <Input
              placeholder="وصف موجز للمقرر الدراسي..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleSubmit}
            className="w-full gradient-primary text-primary-foreground font-bold mt-2"
          >
            تأكيد حفظ المقرر والجدول
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
