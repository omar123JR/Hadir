import { useEffect, useState } from 'react';
import { getReportsApiUrl } from '@/config/reports';
import { BarChart2, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/shared/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// Define types for response data
interface CourseStat {
  id: string;
  name: string;
  code: string;
}

interface TeacherStats {
  totalCourses: number;
  totalStudents: number;
  averageAttendance: number;
  courses: CourseStat[];
}

export function TeacherReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCourse, setOpenCourse] = useState<CourseStat | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('hadir_token');
        const res = await fetch(`${getReportsApiUrl()}/teacher`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error('Failed to fetch reports');

        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'فشل تحميل التقارير من الخادم المنفصل'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [toast]);

  const handleExport = async () => {
    if (!stats || stats.courses.length === 0) {
      toast({ title: 'تنبيه', description: 'لا يوجد مواد لتصديرها', variant: 'default' });
      return;
    }
    
    toast({ title: 'جاري التصدير...', description: 'يتم الآن تجميع البيانات وتحميل ملف Excel' });
    
    try {
      const token = localStorage.getItem('hadir_token');
      const { utils, writeFile } = await import('xlsx');
      const wb = utils.book_new();
      
      for (const course of stats.courses) {
        const res = await fetch(`${getReportsApiUrl()}/teacher/course/${course.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success && data.data.students) {
          const wsData = data.data.students.map((s: any) => ({
            'رقم القيد': s.studentId,
            'اسم الطالب': s.name,
            'المحاضرات الكلية': s.totalLectures,
            'المحاضرات المحضورة': s.attendedLectures,
            'تعديل الحضور': s.attendanceOverride,
            'نسبة الحضور': `${s.attendancePercentage}%`,
            'الدرجة': s.finalGrade || 'لم يتم الرصد'
          }));
          
          if (wsData.length > 0) {
            const ws = utils.json_to_sheet(wsData);
            utils.book_append_sheet(wb, ws, course.code.substring(0, 31) || 'Course');
          } else {
             const ws = utils.json_to_sheet([{'ملاحظة': 'لا يوجد طلاب مسجلين في هذه المادة'}]);
             utils.book_append_sheet(wb, ws, course.code.substring(0, 31) || 'Course');
          }
        }
      }
      
      if (wb.SheetNames.length > 0) {
        writeFile(wb, 'تقرير_حضور_ودرجات_الطلاب.xlsx');
        toast({ title: 'نجاح', description: 'تم تصدير الملف بنجاح', variant: 'default' });
      } else {
        toast({ title: 'تنبيه', description: 'لا توجد بيانات قابلة للتصدير', variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء التصدير', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="mr-2">جاري الاتصال بخدمة التقارير...</span>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" />
          التقارير والإحصائيات
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="text-success border-success/30 hover:bg-success/10"
        >
          <FileText className="w-4 h-4 ml-2" />
          تصدير Excel
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={`${stats.averageAttendance}%`} label="متوسط الحضور" variant="success" />
        <StatCard value={`${stats.totalStudents}`} label="إجمالي الطلاب" variant="primary" />
      </div>

      {/* Course Reports */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground">تقارير المواد التي تدرسها</h3>
        {stats.courses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">لا توجد مواد مسجلة لهذا الفصل.</div>
        )}
        {stats.courses.map((course) => (
          <div
            key={course.id}
            className="bg-card p-4 rounded-xl shadow-card border border-border/50 flex justify-between items-center cursor-pointer hover:shadow-card-hover hover:border-primary/20 transition-all"
          >
            <div>
              <h4 className="font-bold text-foreground">{course.name}</h4>
              <p className="text-xs text-muted-foreground">{course.code}</p>
              <div className="mt-2 flex gap-3">
                <div className="text-xs text-muted-foreground">متوسط الحضور: --%</div>
                <div className="text-xs text-muted-foreground">متوسط الدرجات: --%</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpenCourse(course)}>
                عرض
              </Button>
            </div>
          </div>
        ))}

        {/* Dialog showing details (Placeholder for now since we don't fetch deep details) */}
        <Dialog open={!!openCourse} onOpenChange={(v) => { if (!v) setOpenCourse(null); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>تفاصيل مادة: {openCourse?.name}</DialogTitle>
            </DialogHeader>
            <div className="pt-4">
              <TeacherCourseDetails courseId={openCourse?.id} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function TeacherCourseDetails({ courseId }: { courseId?: string }) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [updates, setUpdates] = useState<Record<string, { finalGrade: string; attendanceOverride: string }>>({});

  useEffect(() => {
    if (!courseId) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('hadir_token');
        const res = await fetch(`${getReportsApiUrl()}/teacher/course/${courseId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setDetails(data.data);
          // Initialize updates state
          const initialUpdates: any = {};
          data.data.students.forEach((s: any) => {
             initialUpdates[s.id] = {
               finalGrade: s.finalGrade || '',
               attendanceOverride: s.attendanceOverride?.toString() || '0'
             };
          });
          setUpdates(initialUpdates);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [courseId]);

  if (loading) return <div className="text-center p-4"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!details) return <div className="text-center p-4 text-destructive">فشل تحميل البيانات</div>;

  const handleUpdateChange = (studentId: string, field: 'finalGrade' | 'attendanceOverride', value: string) => {
    setUpdates(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('hadir_token');
      
      const payload = Object.entries(updates).map(([studentId, data]) => ({
        studentId,
        finalGrade: data.finalGrade,
        attendanceOverride: parseInt(data.attendanceOverride) || 0
      }));

      const res = await fetch(`${getReportsApiUrl()}/teacher/course/${courseId}/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates: payload })
      });

      const result = await res.json();
      if (result.success) {
        toast({ title: 'نجاح', description: 'تم حفظ التعديلات بنجاح', variant: 'default' });
      } else {
        toast({ title: 'خطأ', description: 'فشل حفظ التعديلات', variant: 'destructive' });
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        <div className="bg-muted p-3 rounded-lg flex-1 text-center">
          <span className="text-xs text-muted-foreground block">إجمالي الطلاب</span>
          <span className="font-bold text-xl">{details.students.length}</span>
        </div>
        <div className="bg-muted p-3 rounded-lg flex-1 text-center">
          <span className="text-xs text-muted-foreground block">متوسط الحضور</span>
          <span className="font-bold text-xl">
            {Math.round(details.students.reduce((acc: any, s: any) => acc + s.attendancePercentage, 0) / (details.students.length || 1))}%
          </span>
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="p-3 text-right">الطالب</th>
              <th className="p-3 text-center">الدرجة</th>
              <th className="p-3 text-center">تعديل الحضور (+/-)</th>
              <th className="p-3 text-center">المحاضرات</th>
              <th className="p-3 text-center">النسبة</th>
            </tr>
          </thead>
          <tbody>
            {details.students.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">لا يوجد طلاب مسجلين</td></tr>
            )}
            {details.students.map((student: any) => (
              <tr key={student.id} className="border-t hover:bg-muted/50">
                <td className="p-3">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-xs text-muted-foreground">{student.studentId}</div>
                </td>
                <td className="p-3 text-center">
                  <Input 
                    value={updates[student.id]?.finalGrade || ''} 
                    onChange={(e) => handleUpdateChange(student.id, 'finalGrade', e.target.value)}
                    className="w-20 text-center mx-auto"
                    placeholder="الدرجة"
                  />
                </td>
                <td className="p-3 text-center">
                  <Input 
                    type="number"
                    value={updates[student.id]?.attendanceOverride || ''} 
                    onChange={(e) => handleUpdateChange(student.id, 'attendanceOverride', e.target.value)}
                    className="w-20 text-center mx-auto"
                    placeholder="0"
                  />
                </td>
                <td className="p-3 text-center">{student.attendedLectures} / {student.totalLectures}</td>
                <td className="p-3 text-center font-bold">
                  <span className={`px-2 py-1 rounded-full text-xs ${student.attendancePercentage >= 75 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                    {student.attendancePercentage}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'حفظ التعديلات'}
        </Button>
      </div>
    </div>
  );
}
