import { useState, useEffect } from 'react';
import {
  File,
  Calendar,
  Plus,
  Trash2,
  Users,
  Loader2,
  Download,
  Eye,
  Award,
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api, getTeacherCourses } from '@/lib/api';
import { Assignment, Course } from '@/types';

interface TeacherAssignmentsProps {
  onBack?: () => void;
}

interface Submission {
  id: number;
  student_name: string;
  student_id: string; // Database student_id (enrollment number)
  submitted_at: string;
  file_url: string;
  file_name?: string;
  grade: string | number | null;
  feedback?: string | null;
  status: 'submitted' | 'graded';
}

export function TeacherAssignments({ onBack }: TeacherAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  // Submissions State
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);

  // Grading State per submission
  const [gradingScores, setGradingScores] = useState<Record<number, string>>({});
  const [gradingFeedbacks, setGradingFeedbacks] = useState<Record<number, string>>({});
  const [gradingSubId, setGradingSubId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    due_date: '',
    description: '',
    file: null as File | null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesData, assignmentsResponse] = await Promise.all([
        getTeacherCourses(),
        api.get('/assignments/teacher'),
      ]);

      setCourses(coursesData || []);

      const assignmentsData = assignmentsResponse.data || [];
      const enhancedAssignments = assignmentsData.map((a: any) => ({
        ...a,
        courseCode: coursesData?.find((c: any) => c.id === a.course_id)?.code || 'CODE',
        dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' }) : 'غير محدد',
        status: a.status || 'pending',
      }));

      setAssignments(enhancedAssignments);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل قائمة الواجبات الدراسية',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course_id || !formData.title || !formData.due_date) return;

    try {
      setCreating(true);
      const data = new FormData();
      data.append('course_id', formData.course_id);
      data.append('title', formData.title);
      data.append('due_date', formData.due_date);
      if (formData.description) data.append('description', formData.description);
      if (formData.file) data.append('file', formData.file);

      await api.upload('/assignments/teacher', data);
      setShowCreateDialog(false);
      setFormData({ course_id: '', title: '', due_date: '', description: '', file: null });
      toast({
        title: 'تم إنشاء الواجب بنجاح 🎉',
        description: 'أصبح الواجب متاحاً لجميع الطلاب المسجلين في هذا المقرر.',
      });
      loadData();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast({
        title: 'فشل إنشاء الواجب',
        description: error.message || 'حدث خطأ أثناء حفظ الواجب',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الواجب؟')) return;

    try {
      await api.delete(`/assignments/teacher/${id}`);
      setAssignments(assignments.filter((a) => a.id !== id));
      toast({
        title: 'تم الحذف',
        description: 'تم حذف الواجب بنجاح.',
      });
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      toast({
        title: 'خطأ أثناء الحذف',
        description: error.message || 'تعذر حذف الواجب',
        variant: 'destructive',
      });
    }
  };

  const handleViewSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowSubmissionsDialog(true);
    setLoadingSubmissions(true);
    try {
      const response = await api.get(`/assignments/teacher/${assignment.id}/submissions`);
      const subs = response.data || [];
      setSubmissions(subs);

      // Pre-fill grading state with existing grades & feedbacks
      const initialScores: Record<number, string> = {};
      const initialFeedbacks: Record<number, string> = {};
      subs.forEach((sub: Submission) => {
        if (sub.grade !== null && sub.grade !== undefined) {
          initialScores[sub.id] = String(sub.grade);
        }
        if (sub.feedback) {
          initialFeedbacks[sub.id] = sub.feedback;
        }
      });
      setGradingScores(initialScores);
      setGradingFeedbacks(initialFeedbacks);
    } catch (error: any) {
      console.error('Error loading submissions:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل تسليمات الطلاب',
        variant: 'destructive',
      });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveGrade = async (submissionId: number) => {
    const sub = submissions.find((s) => s.id === submissionId);
    const scoreVal = gradingScores[submissionId] !== undefined ? gradingScores[submissionId] : sub?.grade;
    const feedbackVal = gradingFeedbacks[submissionId] !== undefined ? gradingFeedbacks[submissionId] : (sub?.feedback || '');

    if (scoreVal === undefined || scoreVal === '' || scoreVal === null) {
      toast({
        title: 'تنبيه',
        description: 'يرجى إدخال درجة التقييم أولاً (من 100)',
        variant: 'destructive',
      });
      return;
    }

    const numScore = parseFloat(String(scoreVal));
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      toast({
        title: 'قيمة غير صالحة',
        description: 'يجب أن تكون الدرجة بين 0 و 100',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGradingSubId(submissionId);
      const res = await api.post(`/assignments/teacher/submissions/${submissionId}/grade`, {
        grade: String(numScore),
        percentage: numScore,
        feedback: String(feedbackVal),
      });

      if (res.success) {
        toast({
          title: 'تم رصد التقييم والملاحظات بنجاح 🎉',
          description: 'تم إرسال الدرجة والملاحظات وستظهر للطالب مباشرة.',
        });
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId
              ? { ...s, grade: numScore, feedback: feedbackVal, status: 'graded' }
              : s
          )
        );
        loadData();
      }
    } catch (err: any) {
      toast({
        title: 'خطأ أثناء التقييم',
        description: err.message || 'فشل في حفظ التقييم',
        variant: 'destructive',
      });
    } finally {
      setGradingSubId(null);
    }
  };

  const handleDownloadSubmission = async (submissionId: number, originalFileName?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assignments/teacher/submissions/${submissionId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('فشل تحميل الملف من الخادم');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalFileName || `submission-${submissionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err: any) {
      toast({
        title: 'خطأ أثناء التحميل',
        description: err.message || 'تعذر تحميل ملف الطالب',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader title="الواجبات والتكليفات الدراسية" onBack={onBack} />

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-bold shadow-sm">
              <Plus className="w-4 h-4 ml-2" />
              واجب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">إضافة واجب جديد للمقرر</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">المقرر الدراسي</label>
                <select
                  className="w-full p-2.5 rounded-xl border border-input bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  required
                >
                  <option value="">اختر المقرر...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">عنوان الواجب</label>
                <Input
                  type="text"
                  className="h-10 text-xs font-semibold"
                  placeholder="مثال: واجب الأسبوع الثالث - خوارزميات التشفير"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">الموعد النهائي للتسليم</label>
                <Input
                  type="date"
                  className="h-10 text-xs font-semibold"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">الوصف والتعليمات (اختياري)</label>
                <textarea
                  className="w-full p-2.5 rounded-xl border border-input bg-background text-xs font-medium resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="اكتب تعليمات وشروط حل الواجب..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">ملف الواجب المرفق (اختياري)</label>
                <Input
                  type="file"
                  className="text-xs file:text-xs file:font-bold"
                  accept=".pdf,.doc,.docx,.zip,.py,.java,.cpp"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateDialog(false)}>
                  إلغاء
                </Button>
                <Button type="submit" size="sm" disabled={creating} className="gradient-primary text-primary-foreground font-bold">
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-1.5 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    'إنشاء الواجب'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Submissions & Grading Dialog */}
        <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <span>تسليمات وتقييم الطلاب: {selectedAssignment?.title}</span>
                </div>
                <span className="text-xs font-normal text-muted-foreground">
                  إجمالي التسليمات: {submissions.length}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
              {loadingSubmissions ? (
                <div className="text-center py-12 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">جاري تحميل تسليمات الطلاب...</p>
                </div>
              ) : submissions.length > 0 ? (
                <div className="space-y-4">
                  {submissions.map((sub) => {
                    const isGraded = sub.status === 'graded' || (sub.grade !== null && sub.grade !== undefined);
                    const currentScore = gradingScores[sub.id] !== undefined ? gradingScores[sub.id] : (sub.grade ?? '');
                    const currentFeedback = gradingFeedbacks[sub.id] !== undefined ? gradingFeedbacks[sub.id] : (sub.feedback ?? '');

                    return (
                      <div
                        key={sub.id}
                        className="bg-card p-4 rounded-2xl border border-border/70 hover:border-primary/30 transition-all space-y-3.5 shadow-sm"
                      >
                        {/* Student Info & Status Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/50">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-foreground">{sub.student_name}</h4>
                              <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                                {sub.student_id}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3 text-muted-foreground/80" />
                              <span>تاريخ التسليم: {new Date(sub.submitted_at).toLocaleString('ar-LY')}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            {isGraded ? (
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                تم التقييم ({sub.grade}/100)
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                بانتظار التقييم
                              </span>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadSubmission(sub.id, sub.file_name)}
                              className="h-8 text-xs font-semibold text-primary border-primary/20 hover:bg-primary/10"
                            >
                              <Download className="w-3.5 h-3.5 ml-1.5" />
                              تحميل الحل
                            </Button>
                          </div>
                        </div>

                        {/* Grading & Feedback Inputs */}
                        <div className="bg-muted/30 p-3.5 rounded-xl border border-border/50 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2 shrink-0">
                              <label className="text-xs font-bold text-foreground">الدرجة (من 100):</label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="مثال: 95"
                                value={currentScore}
                                onChange={(e) =>
                                  setGradingScores((prev) => ({ ...prev, [sub.id]: e.target.value }))
                                }
                                className="w-24 h-8 text-center text-xs font-bold bg-background"
                              />
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {isGraded ? 'يمكنك تعديل الدرجة أو الملاحظات في أي وقت.' : 'ضع الدرجة وأرسل الملاحظات لتظهر للطالب فوراً.'}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-primary" />
                              <span>ملاحظات الأستاذ وتوجيهاته للطالب:</span>
                            </label>
                            <textarea
                              rows={2}
                              value={currentFeedback}
                              onChange={(e) =>
                                setGradingFeedbacks((prev) => ({ ...prev, [sub.id]: e.target.value }))
                              }
                              placeholder="اكتب ملاحظاتك للطالب (مثل: عمل متميز، تم حل جميع المسائل بشكل صحيح...)"
                              className="w-full p-2.5 rounded-xl border border-input bg-background text-xs font-medium resize-none focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleSaveGrade(sub.id)}
                              disabled={gradingSubId === sub.id}
                              className="gradient-primary text-primary-foreground font-bold text-xs h-8 px-4 shadow-sm"
                            >
                              {gradingSubId === sub.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                                  جاري الحفظ...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 ml-1.5" />
                                  {isGraded ? 'تحديث التقييم والملاحظات' : 'رصد التقييم وإرسال الملاحظات'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={File}
                  title="لا توجد تسليمات بعد"
                  description="لم يقم أي طالب بتسليم حل هذا الواجب حتى الآن."
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Assignments List */}
      {loading ? (
        <div className="text-center py-12 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground">جاري تحميل قائمة الواجبات...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.length > 0 ? (
            assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onDelete={handleDelete}
                onViewSubmissions={() => handleViewSubmissions(assignment)}
              />
            ))
          ) : (
            <EmptyState
              icon={File}
              title="لا توجد واجبات دراسية"
              description="لم تقم بإضافة أي واجبات بعد. انقر على زر 'واجب جديد' لإنشاء تكليف."
            />
          )}
        </div>
      )}
    </div>
  );
}

interface AssignmentCardProps {
  assignment: Assignment & { courseCode?: string };
  onDelete: (id: string) => void;
  onViewSubmissions: () => void;
}

function AssignmentCard({ assignment, onDelete, onViewSubmissions }: AssignmentCardProps) {
  return (
    <div className="bg-card p-4 sm:p-5 rounded-2xl shadow-sm border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/30 transition-all">
      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
          <File className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
              {assignment.courseCode || assignment.course_code || 'CODE'}
            </span>
            <h4 className="font-extrabold text-sm text-foreground">{assignment.title}</h4>
          </div>

          {assignment.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{assignment.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-[11px]">
              <Calendar className="w-3 h-3 text-rose-500" />
              الموعد: {assignment.dueDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-[11px] text-primary font-semibold">
              <Users className="w-3 h-3" />
              تم التسليم: {assignment.submitted_count ?? 0} طالب
            </span>
            {assignment.graded_count !== undefined && assignment.graded_count > 0 && (
              <>
                <span>•</span>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  مُقيّم: {assignment.graded_count}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <Button
          size="sm"
          onClick={onViewSubmissions}
          className="gradient-primary text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl shadow-sm"
        >
          <Eye className="w-3.5 h-3.5 ml-1.5" />
          عرض وتقييم التسليمات ({assignment.submitted_count ?? 0})
        </Button>

        {assignment.file_url && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(assignment.file_url!, '_blank')}
            title="تحميل ملف الواجب"
            className="h-9 px-3 rounded-xl border-border/60 hover:text-primary"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(assignment.id)}
          className="h-9 px-3 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl"
          title="حذف الواجب"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
