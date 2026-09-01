import { useState, useEffect } from 'react';
import { File, Calendar, Plus, Trash2, Edit2, Users, Loader2, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  grade: number | null;
  status: 'submitted' | 'graded';
}

export function TeacherAssignments({ onBack }: TeacherAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Submissions State
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showSubmissionsDialog, setShowSubmissionsDialog] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    due_date: '',
    description: '',
    file: null as File | null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesData, assignmentsResponse] = await Promise.all([
        getTeacherCourses(),
        api.get('/assignments/teacher')
      ]);

      setCourses(coursesData || []);

      const assignmentsData = assignmentsResponse.data || [];
      // Enhance assignments with course code if missing
      const enhancedAssignments = assignmentsData.map((a: any) => ({
        ...a,
        courseCode: coursesData?.find((c: any) => c.id === a.course_id)?.code || 'CODE',
        dueDate: new Date(a.due_date).toLocaleDateString('ar-SA'),
        // default status if not present (though backend should provide it)
        status: a.status || 'pending'
      }));

      setAssignments(enhancedAssignments);
    } catch (error) {
      console.error('Error loading data:', error);
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
      loadData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('فشل في إنشاء الواجب');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الواجب؟')) return;

    try {
      await api.delete(`/assignments/teacher/${id}`);
      setAssignments(assignments.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const handleViewSubmissions = async (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setShowSubmissionsDialog(true);
    setLoadingSubmissions(true);
    try {
      const response = await api.get(`/assignments/teacher/${assignmentId}/submissions`);
      setSubmissions(response.data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
      alert('فشل في تحميل التسليمات');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="flex justify-between items-center">
        <PageHeader
          title="الواجبات والمهام"
          onBack={onBack}
        />

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 ml-2" />
              واجب جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة واجب جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">المادة</label>
                <select
                  className="w-full p-2 rounded-md border bg-background"
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  required
                >
                  <option value="">اختر المادة...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">عنوان الواجب</label>
                <input
                  type="text"
                  className="w-full p-2 rounded-md border bg-background"
                  placeholder="مثال: حل مسائل الفصل الخامس"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ التسليم</label>
                <input
                  type="date"
                  className="w-full p-2 rounded-md border bg-background"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الوصف (اختياري)</label>
                <textarea
                  className="w-full p-2 rounded-md border bg-background h-24"
                  placeholder="تفاصيل إضافية حول الواجب..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ملف مرفق (اختياري)</label>
                <input
                  type="file"
                  className="w-full p-2 rounded-md border bg-background"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    'إنشاء الواجب'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Submissions Dialog */}
        <Dialog open={showSubmissionsDialog} onOpenChange={setShowSubmissionsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تسليمات الطلاب</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {loadingSubmissions ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-muted-foreground">جاري تحميل التسليمات...</p>
                </div>
              ) : submissions.length > 0 ? (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {submissions.map((sub) => (
                    <div key={sub.id} className="bg-card p-4 rounded-lg border flex justify-between items-center">
                      <div>
                        <h4 className="font-bold">{sub.student_name}</h4>
                        <div className="text-sm text-muted-foreground flex gap-2">
                          <span>{sub.student_id}</span>
                          <span>•</span>
                          <span>{new Date(sub.submitted_at).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(sub.file_url, '_blank')}
                        >
                          <Download className="w-4 h-4 ml-2" />
                          تحميل الحل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={File}
                  title="لا توجد تسليمات"
                  description="لم يقم أي طالب بتسليم هذا الواجب بعد"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">جاري تحميل الواجبات...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.length > 0 ? (
            assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onDelete={handleDelete}
                onViewSubmissions={() => handleViewSubmissions(assignment.id)}
              />
            ))
          ) : (
            <EmptyState
              icon={File}
              title="لا توجد واجبات"
              description="لم تقم بإضافة أي واجبات بعد"
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
  const statusConfig: any = {
    pending: { label: 'بانتظار التسليم', variant: 'warning' },
    submitted: { label: 'بانتظار التقييم', variant: 'success' },
    graded: { label: 'تم التقييم', variant: 'success' },
    missed: { label: 'فائت', variant: 'destructive' },
  };

  const config = statusConfig[assignment.status] || statusConfig.pending;

  return (
    <div className="bg-card p-4 rounded-xl shadow-card border border-border/50 flex justify-between items-center hover:shadow-card-hover hover:border-primary/20 transition-all">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <File className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-foreground">
            {assignment.title}
          </h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{assignment.courseCode}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-destructive" />
              {assignment.dueDate}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill label={config.label} variant={config.variant} />
            {assignment.submittedCount !== undefined && (
              <StatusPill
                label={`مسلّم: ${assignment.submittedCount}/${assignment.totalStudents || '-'}`}
                icon={Users}
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewSubmissions}
          title="عرض التسليمات"
          className="text-primary hover:text-primary hover:bg-primary/10"
        >
          <Eye className="w-4 h-4" />
        </Button>
        {assignment.file_url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(assignment.file_url!, '_blank')}
            title="تحميل المرفق"
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
        <button
          onClick={() => onDelete(assignment.id)}
          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          title="حذف الواجب"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
