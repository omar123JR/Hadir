import { useEffect, useState, useMemo } from 'react';
import { getReportsApiUrl } from '@/config/reports';
import { BarChart2, CheckCircle, Type, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EnrolledCourse {
  id: string;
  name: string;
  code: string;
  attendancePercentage: number;
  finalGrade?: string;
}

interface StudentStats {
  enrolledCourses: number;
  attendanceRate: number;
  assignmentsCompleted: number;
  courses: EnrolledCourse[];
}

export function StudentReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('hadir_token');
        const res = await fetch(`${getReportsApiUrl()}/student`, {
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
        console.error('Error fetching student reports:', error);
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

  // Mock GPA for now as backend doesn't have grades yet
  const gpa = "3.85";

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
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-primary" />
        التقارير والإحصائيات
      </h2>

      {/* GPA Card */}
      <div className="gradient-hero rounded-2xl p-5 text-primary-foreground shadow-glow relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary-foreground/10 rounded-full" />
        <div className="absolute -bottom-5 -right-5 w-24 h-24 bg-primary-foreground/10 rounded-full" />

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-primary-foreground/80 text-sm font-medium">المعدل التراكمي (GPA)</span>
            <TrendingUp className="w-5 h-5 text-primary-foreground/80" />
          </div>
          <div className="text-4xl font-bold mb-1">{gpa}</div>
          <div className="text-xs text-primary-foreground/70">ممتاز - حافظ على هذا المستوى!</div>
        </div>
      </div>

      {/* Course Details */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground">تفاصيل المواد</h3>
        {stats.courses.length === 0 && <div className="text-muted-foreground">لا توجد مواد مسجلة.</div>}
        {stats.courses.map((course) => {
          const percentage = course.attendancePercentage;
          const color = percentage >= 90 ? 'success' : percentage >= 75 ? 'warning' : 'destructive';

          const gradeLabel = (course as any).finalGrade || "غير متوفر";

          return (
            <CourseReportItem
              key={course.id}
              name={course.name}
              attendance={percentage}
              gradeLabel={gradeLabel}
              color={color}
              onOpen={() => setOpenCourseId(course.id)}
            />
          );
        })}

        <Dialog open={!!openCourseId} onOpenChange={(v) => { if (!v) setOpenCourseId(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>تفاصيل المادة</DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              {openCourseId ? (() => {
                const c = stats.courses.find(x => x.id === openCourseId);
                if (!c) return <div>لا توجد بيانات للمادة</div>;
                return (
                  <div className="space-y-3">
                    <div className="font-bold text-foreground">{c.name}</div>
                    <div className="text-sm text-muted-foreground">رمز المقرر: {c.code}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${c.attendancePercentage >= 75 ? 'bg-success' : 'bg-destructive'}`}
                          style={{ width: `${c.attendancePercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold">{c.attendancePercentage}%</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-muted/50 p-3 rounded-lg text-center">
                        <div className="text-xs text-muted-foreground">المحاضرات الكلية</div>
                        <div className="font-bold text-lg">{(c as any).total_lectures || 0}</div>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg text-center">
                        <div className="text-xs text-muted-foreground">محاضرات حضرتها</div>
                        <div className="font-bold text-lg">{(c as any).attended_lectures || 0}</div>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground mt-2">
                      الغياب: {((c as any).total_lectures || 0) - ((c as any).attended_lectures || 0)} محاضرات
                    </div>
                    <div className="text-sm text-muted-foreground">الدرجة: {c.finalGrade || 'لم يتم الرصد بعد'}</div>
                  </div>
                );
              })() : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface CourseReportItemProps {
  name: string;
  attendance: number;
  gradeLabel: string;
  color: 'success' | 'warning' | 'destructive';
  onOpen: () => void;
}

function CourseReportItem({ name, attendance, gradeLabel, color, onOpen }: CourseReportItemProps) {
  const colorClasses = {
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  const bgColorClasses = {
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    destructive: 'bg-destructive/10',
  };

  return (
    <div className="bg-card p-4 rounded-xl shadow-card border border-border/50 flex justify-between items-center transition-all hover:shadow-card-hover">
      <div>
        <h4 className="font-bold text-foreground text-sm">{name}</h4>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-success" /> الحضور: {attendance}%
          </span>
          <span className={`flex items-center gap-1 ${colorClasses[color]}`}>
            <Type className="w-3 h-3" /> التقدير: {gradeLabel}
          </span>
        </p>
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={onOpen}>تفاصيل</Button>
      </div>
    </div>
  );
}
