import { useEffect, useState } from 'react';
import { getReportsApiUrl } from '@/config/reports';
import { BarChart2, CheckCircle2, TrendingUp, Loader2, BookOpen, Clock, Calendar, Award, ChevronLeft, FileText, Printer, ShieldCheck, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface EnrolledCourse {
  id: string;
  name: string;
  code: string;
  creditHours: number;
  attendancePercentage: number;
  finalGrade?: string;
  totalScore?: number | null;
  letterGrade?: string | null;
  gradePoints?: number | null;
  total_lectures?: number;
  attended_lectures?: number;
}

interface StudentStats {
  gpa: number;
  totalCredits: number;
  gradedCredits: number;
  enrolledCourses: number;
  attendanceRate: number;
  courses: EnrolledCourse[];
}

interface GradebookItem {
  gradeItemId: number;
  name: string;
  category: string;
  weight: number;
  maxScore: number;
  score: number | null;
  weightedScore: number | null;
}

export function StudentReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [courseBreakdown, setCourseBreakdown] = useState<GradebookItem[] | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('hadir_token');
        const res = await fetch(`${getReportsApiUrl()}/student`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error('فشل جلب التقارير الأكاديمية');

        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching student reports:', error);
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: 'فشل تحميل التقارير الأكاديمية من الخادم'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [toast]);

  const handleOpenCourse = async (courseId: string) => {
    setOpenCourseId(courseId);
    setLoadingBreakdown(true);
    setCourseBreakdown(null);
    try {
      const res = await api.get(`/grades/student/course/${courseId}`);
      if (res.success) {
        setCourseBreakdown(res.data);
      }
    } catch (err) {
      console.error('Error fetching course breakdown:', err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-medium">جاري احتساب المعدل وسجل الدرجات الأكاديمي...</span>
      </div>
    );
  }

  if (!stats) return null;

  const gpa = Number(stats.gpa || 0).toFixed(2);
  const gpaNum = parseFloat(gpa);
  const gpaLevel = gpaNum >= 3.5 ? 'ممتاز' : gpaNum >= 3.0 ? 'جيد جداً' : gpaNum >= 2.5 ? 'جيد' : gpaNum >= 2.0 ? 'مقبول' : 'إنذار أكاديمي';

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            السجل الأكاديمي والتقارير
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            المعدل التراكمي الحقيقي المحسوب وفق الساعات المعتمدة
          </p>
        </div>

        <Button
          onClick={() => setShowTranscript(true)}
          className="gradient-primary text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl shadow-sm self-start sm:self-auto"
        >
          <FileText className="w-4 h-4 ml-1.5" />
          كشف درجات معتمد (Official Transcript)
        </Button>
      </div>

      {/* GPA & Academic Summary Card */}
      <div className="gradient-hero rounded-3xl p-6 text-primary-foreground shadow-glow relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary-foreground/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary-foreground/15 rounded-full blur-xl" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-primary-foreground/80 text-xs font-semibold tracking-wide uppercase">
                المعدل التراكمي التراكمي (GPA 4.0)
              </span>
              <div className="text-4xl sm:text-5xl font-black mt-1 tracking-tight">
                {gpa}
              </div>
            </div>
            <div className="bg-primary-foreground/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold">
              <TrendingUp className="w-4 h-4" />
              <span>{gpaLevel}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-primary-foreground/15 text-center">
            <div>
              <div className="text-[11px] text-primary-foreground/75">الساعات المسجلة</div>
              <div className="text-base font-bold mt-0.5">{stats.totalCredits} س.م</div>
            </div>
            <div>
              <div className="text-[11px] text-primary-foreground/75">المواد المرصودة</div>
              <div className="text-base font-bold mt-0.5">{stats.gradedCredits} س.م</div>
            </div>
            <div>
              <div className="text-[11px] text-primary-foreground/75">متوسط الحضور</div>
              <div className="text-base font-bold mt-0.5">{stats.attendanceRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Details List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">تفاصيل المقررات والدرجات</h3>
          <span className="text-xs text-muted-foreground">{stats.courses.length} مواد مسجلة</span>
        </div>

        {stats.courses.length === 0 ? (
          <div className="bg-card p-8 rounded-2xl border border-border text-center text-muted-foreground text-sm">
            لا توجد مواد مسجلة في هذا الفصل.
          </div>
        ) : (
          stats.courses.map((course) => {
            const percentage = course.attendancePercentage;
            const isHighAtt = percentage >= 85;
            const isLowAtt = percentage < 75;

            return (
              <div
                key={course.id}
                onClick={() => handleOpenCourse(course.id)}
                className="bg-card p-4 rounded-2xl border border-border/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {course.code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {course.creditHours} ساعات
                      </span>
                    </div>
                    <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
                      {course.name}
                    </h4>
                  </div>

                  <div className="text-left flex flex-col items-end">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary">
                      {course.letterGrade ? `${course.letterGrade} (${course.totalScore}%)` : 'قيد الرصد'}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1">
                      {course.gradePoints !== null && course.gradePoints !== undefined
                        ? `نقاط: ${course.gradePoints.toFixed(2)}`
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Attendance Progress bar */}
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-muted-foreground shrink-0">الحضور:</span>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isHighAtt ? 'bg-emerald-500' : isLowAtt ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                    <span className="font-bold text-foreground shrink-0">{percentage}%</span>
                  </div>

                  <span className="text-primary text-xs flex items-center gap-0.5 group-hover:translate-x-[-2px] transition-transform">
                    تفصيل الدرجات
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Course Detailed Gradebook Breakdown Modal */}
      <Dialog open={!!openCourseId} onOpenChange={(v) => { if (!v) setOpenCourseId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Award className="w-5 h-5 text-primary" />
              تفصيل درجات المقرر (Moodle Gradebook)
            </DialogTitle>
          </DialogHeader>

          {openCourseId && (() => {
            const c = stats.courses.find((x) => x.id === openCourseId);
            if (!c) return null;

            return (
              <div className="space-y-4 pt-1">
                <div className="bg-muted/40 p-3.5 rounded-2xl border border-border/60">
                  <div className="text-xs text-muted-foreground font-mono">{c.code}</div>
                  <div className="text-base font-bold text-foreground mt-0.5">{c.name}</div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                    <span>الساعات المعتمدة: <b>{c.creditHours}</b></span>
                    <span>التقدير العام: <b className="text-primary font-bold">{c.letterGrade || 'لم يكتمل'}</b></span>
                    <span>المجموع: <b>{c.totalScore !== null && c.totalScore !== undefined ? `${c.totalScore}%` : '-'}</b></span>
                  </div>
                </div>

                {loadingBreakdown ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    جاري تحميل بنود التقييم والأوزان...
                  </div>
                ) : !courseBreakdown || courseBreakdown.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    لم يقم أستاذ المادة برصد أي بنود بعد.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground px-1">توزيع درجات المقرر والأوزان:</div>
                    <div className="divide-y divide-border/60 border border-border/60 rounded-2xl overflow-hidden bg-card">
                      {courseBreakdown.map((item) => (
                        <div key={item.gradeItemId} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-foreground">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              الوزن: <b>{item.weight}%</b> من المقرر • الحد الأقصى: {item.maxScore}
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="font-extrabold text-foreground text-sm">
                              {item.score !== null ? `${item.score} / ${item.maxScore}` : 'غير مرصود'}
                            </div>
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              {item.weightedScore !== null ? `المساهمة: +${item.weightedScore}%` : '-'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-muted/30 p-3 rounded-xl text-xs text-muted-foreground flex items-center justify-between">
                  <span>إجمالي المحاضرات: {c.total_lectures || 0}</span>
                  <span>المحاضرات المحضورة: {c.attended_lectures || 0}</span>
                  <span className="font-bold text-foreground">نسبة الحضور: {c.attendancePercentage}%</span>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Official Academic Transcript Modal & Printable Document */}
      <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base font-bold text-foreground border-b border-border/50 pb-3">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                معاينة كشف الدرجات والسجل التراكمي الرسمي
              </span>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="gradient-primary text-primary-foreground font-bold text-xs h-8 px-3"
              >
                <Printer className="w-3.5 h-3.5 ml-1.5" />
                طباعة / تصدير PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Printable Document Body */}
          <div className="p-6 bg-card text-foreground rounded-2xl border border-border/80 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0">
            {/* University Header */}
            <div className="border-b-2 border-primary/30 pb-4 flex items-center justify-between">
              <div className="text-right space-y-1">
                <p className="text-xs font-bold text-primary">الجمهورية الليبية • وزارة التعليم العالي والبحث العلمي</p>
                <h3 className="text-lg font-black tracking-tight text-foreground">جامعة طرابلس الأهلية • منصة حاضر الأكاديمية</h3>
                <p className="text-[11px] text-muted-foreground">إدارة القبول والتسجيل وشؤون الامتحانات</p>
              </div>
              <div className="text-center p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
                <div className="font-extrabold text-base text-primary">HADIR LMS</div>
                <div className="text-[9px] font-bold text-muted-foreground tracking-widest">OFFICIAL TRANSCRIPT</div>
              </div>
            </div>

            {/* Student Metadata Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground text-[10px] block">اسم الطالب:</span>
                <span className="font-bold text-foreground">{user?.name || 'طالب جامعي'}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">الرقم الجامعي / القيد:</span>
                <span className="font-mono font-bold text-foreground">{user?.student_id || user?.id || 'STU-001'}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">الفصل الأكاديمي:</span>
                <span className="font-bold text-foreground">خريف 2026 / 2027</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">تاريخ الإصدار:</span>
                <span className="font-bold text-foreground">{new Date().toLocaleDateString('ar-LY')}</span>
              </div>
            </div>

            {/* Course Grade Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-muted-foreground">
                    <th className="p-2.5 font-bold">رمز المقرر</th>
                    <th className="p-2.5 font-bold">اسم المقرر الدراسي</th>
                    <th className="p-2.5 font-bold text-center">الساعات</th>
                    <th className="p-2.5 font-bold text-center">الدرجة المئوية</th>
                    <th className="p-2.5 font-bold text-center">التقدير الحرفي</th>
                    <th className="p-2.5 font-bold text-center">النقاط (Grade Points)</th>
                    <th className="p-2.5 font-bold text-center">نسبة الحضور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {stats.courses.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="p-2.5 font-mono font-bold">{c.code}</td>
                      <td className="p-2.5 font-bold text-foreground">{c.name}</td>
                      <td className="p-2.5 text-center font-bold">{c.creditHours}</td>
                      <td className="p-2.5 text-center font-bold">{c.totalScore !== null && c.totalScore !== undefined ? `${c.totalScore}%` : 'قيد الرصد'}</td>
                      <td className="p-2.5 text-center font-bold text-primary">{c.letterGrade || '-'}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{c.gradePoints !== null && c.gradePoints !== undefined ? Number(c.gradePoints).toFixed(2) : '-'}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-600">{c.attendancePercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cumulative Statistics Summary */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] text-muted-foreground block">الساعات المنجزة</span>
                  <span className="text-sm font-bold text-foreground">{stats.gradedCredits} من {stats.totalCredits} س.م</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">المعدل التراكمي النهائي</span>
                  <span className="text-xl font-black text-primary">{gpa} / 4.00</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">التقدير العام</span>
                  <span className="text-sm font-bold text-emerald-600">{gpaLevel}</span>
                </div>
              </div>
              <div className="text-left text-[11px] text-muted-foreground">
                متوسط الحضور الفصلي: <b className="text-foreground">{stats.attendanceRate}%</b>
              </div>
            </div>

            {/* Registrar Signature & Official Verification Seal */}
            <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-muted/60 border border-border flex items-center justify-center p-1">
                  <QrCode className="w-10 h-10 text-foreground/80" />
                </div>
                <div>
                  <span className="font-bold text-[11px] block text-foreground">رمز التحقق الإلكتروني المشفر</span>
                  <span className="font-mono text-[9px] text-muted-foreground block">VERIFIED-HADIR-STU-TR-2026</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">وثيقة رسمية معتمدة من مسجل الكلية</span>
                </div>
              </div>

              <div className="text-center space-y-3">
                <span className="font-bold text-muted-foreground text-[11px] block">خاتم واعتماد المسجل العام</span>
                <div className="w-28 h-9 border-b-2 border-dashed border-border mx-auto" />
                <span className="text-[10px] text-muted-foreground font-semibold">د. مدير شؤون الامتحانات</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
