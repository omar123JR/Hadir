import { useState, useEffect } from 'react';
import { FileText, Calendar, UploadCloud, Info, Loader2, CheckCircle2, Clock, Download, ArrowRight, Award, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Assignment } from '@/types';

interface StudentAssignmentsProps {
  onBack?: () => void;
}

export function StudentAssignments({ onBack }: StudentAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'submitted'>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/assignments/student');
      const assignmentsData = response.data || [];
      const mappedAssignments = assignmentsData.map((a: any) => ({
        ...a,
        dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' }) : 'غير محدد',
        status: a.status || 'pending',
      }));
      setAssignments(mappedAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !selectedFile) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      await api.upload(`/assignments/student/${selectedAssignment.id}/submit`, formData);

      setSelectedAssignment(null);
      setSelectedFile(null);
      loadAssignments();
      toast({
        title: 'تم تسليم الواجب بنجاح! 🎉',
        description: `تم إرسال الملف إلى أستاذ المقرر بنجاح.`,
      });
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      toast({
        title: 'فشل تسليم الواجب',
        description: error.message || 'حدث خطأ أثناء رفع ملف الحل',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingList = assignments.filter(a => a.status === 'pending');
  const submittedList = assignments.filter(a => a.status === 'submitted' || a.status === 'graded');

  const filteredAssignments = activeFilter === 'pending'
    ? pendingList
    : activeFilter === 'submitted'
    ? submittedList
    : assignments;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="p-2 -mr-2">
                <ArrowRight className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-2xl font-black text-foreground">الواجبات والتكليفات</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            متابعة المهام المطلوبة وتسليم الملفات للمحاضرين
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border/50 self-start sm:self-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            الكل ({assignments.length})
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'pending'
                ? 'bg-amber-500/15 text-amber-600 shadow-sm border border-amber-500/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            المطلوبة ({pendingList.length})
          </button>
          <button
            onClick={() => setActiveFilter('submitted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'submitted'
                ? 'bg-emerald-500/15 text-emerald-600 shadow-sm border border-emerald-500/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            المُسلّمة ({submittedList.length})
          </button>
        </div>
      </div>

      {/* Pending Warning Banner */}
      {pendingList.length > 0 && activeFilter !== 'submitted' && (
        <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/25 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2.5 font-bold">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
            <span>لديك {pendingList.length} تكليفات بانتظار تسليم الحل قبل انتهاء الموعد النهائي.</span>
          </div>
        </div>
      )}

      {/* Assignment List */}
      {loading ? (
        <div className="text-center py-12 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground">جاري تحميل قائمة الواجبات...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-3xl border border-dashed border-border space-y-2">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <h4 className="font-bold text-foreground">لا توجد واجبات في هذا التصنيف</h4>
          <p className="text-xs text-muted-foreground">أنت على اطلاع دائم بجميع المهام الأكاديمية</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((assignment: any) => {
            const isSubmitted = assignment.status === 'submitted' || assignment.status === 'graded';
            return (
              <div
                key={assignment.id}
                className="bg-card p-5 rounded-3xl border border-border/60 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                      {assignment.course_code || 'TEST-101'}
                    </span>

                    {isSubmitted ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        تم التسليم
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        مطلوب التسليم
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-base text-foreground leading-snug">
                    {assignment.title}
                  </h3>
                  
                  {assignment.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}

                  {/* Teacher Feedback & Evaluation Notes */}
                  {isSubmitted && assignment.feedback && (
                    <div className="mt-3 p-3 rounded-2xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>ملاحظات وتقييم أستاذ المقرر:</span>
                      </div>
                      <p className="text-foreground/90 font-medium whitespace-pre-wrap leading-relaxed pr-5 text-[11px]">
                        {assignment.feedback}
                      </p>
                    </div>
                  )}

                  {/* Teacher Attachment Download */}
                  {assignment.file_url && (
                    <div className="mt-2.5">
                      <a
                        href={assignment.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-lg"
                      >
                        <Download className="w-3 h-3" />
                        <span>تحميل ورقة الأسئلة / مرفق الواجب</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-rose-500" />
                    الموعد: {assignment.dueDate}
                  </div>

                  {isSubmitted ? (
                    <div className="flex items-center gap-2">
                      {assignment.grade !== undefined && assignment.grade !== null ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                          <Award className="w-4 h-4 text-emerald-500" />
                          الدرجة: {assignment.grade} / {assignment.max_score || 100}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          بانتظار تصحيح الأستاذ
                        </span>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setSelectedAssignment(assignment)}
                      className="gradient-primary text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl shadow-sm"
                    >
                      <UploadCloud className="w-3.5 h-3.5 ml-1.5" />
                      تسليم الحل
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={(open) => { if (!open) { setSelectedAssignment(null); setSelectedFile(null); } }}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              تسليم واجب: {selectedAssignment?.title}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
              <p><b>المقرر:</b> {selectedAssignment?.course_code} - {selectedAssignment?.course_name}</p>
              <p><b>الموعد النهائي:</b> {selectedAssignment?.dueDate}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">ملف الحل (PDF, DOCX, ZIP):</label>
              <div className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-muted/20 hover:bg-muted/40">
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileSelect}
                  required
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {selectedFile ? selectedFile.name : 'انقر هنا أو اسحب الملف لرفعه'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    الحد الأقصى لحجم الملف: 15 ميجابايت
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setSelectedAssignment(null); setSelectedFile(null); }}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={submitting || !selectedFile}
                className="flex-1 gradient-primary text-primary-foreground font-bold shadow-glow"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" />جاري الرفع...</>
                ) : (
                  'تأكيد وتسليم الحل'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
