import { useState, useEffect } from 'react';
import { File, Calendar, UploadCloud, FileText, Info, Loader2, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusPill } from '@/components/shared/StatusPill';
import { EmptyState } from '@/components/shared/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { Assignment } from '@/types';

interface StudentAssignmentsProps {
  onBack?: () => void;
}

export function StudentAssignments({ onBack }: StudentAssignmentsProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
        dueDate: new Date(a.due_date).toLocaleDateString('ar-SA'),
        // ensure status is set correctly from backend
        status: a.status
      }));
      setAssignments(mappedAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = assignments.filter(a => a.status === 'pending').length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId || !selectedFile) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      await api.upload(`/assignments/student/${selectedAssignmentId}/submit`, formData);

      setSelectedAssignmentId(null);
      setSelectedFile(null);
      loadAssignments(); // Reload to update status
      alert('تم تسليم الواجب بنجاح');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('فشل في تسليم الواجب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-slideUp">
      <PageHeader
        title="الواجبات والمهام"
        onBack={onBack}
      />

      {pendingCount > 0 && (
        <div className="bg-warning/10 p-3 rounded-xl border border-warning/20 text-sm text-foreground flex items-center gap-2">
          <Info className="w-5 h-5 text-warning flex-shrink-0" />
          <p>لديك {pendingCount} واجبات غير مسلّمة.</p>
        </div>
      )}

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
                onSubmitClick={() => setSelectedAssignmentId(assignment.id)}
              />
            ))
          ) : (
            <EmptyState
              icon={File}
              title="لا توجد واجبات"
              description="ليس لديك أي واجبات حالياً"
            />
          )}
        </div>
      )}

      {/* Submission Dialog */}
      <Dialog open={!!selectedAssignmentId} onOpenChange={(open) => !open && setSelectedAssignmentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسليم الواجب</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ملف الحل</label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors relative">
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileSelect}
                  required
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {selectedFile ? selectedFile.name : 'اختر ملف الحل'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setSelectedAssignmentId(null)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting || !selectedFile}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري التسليم...
                  </>
                ) : (
                  'تسليم الحل'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AssignmentCardProps {
  assignment: Assignment & { courseCode?: string };
  onSubmitClick: () => void;
}

function AssignmentCard({ assignment, onSubmitClick }: AssignmentCardProps) {
  const statusConfig: any = {
    pending: { label: 'واجب جديد', variant: 'warning' },
    submitted: { label: 'تم التسليم', variant: 'success' },
    graded: { label: 'تم التقييم', variant: 'success' },
    missed: { label: 'فائت', variant: 'destructive' },
  };

  const config = statusConfig[assignment.status] || statusConfig.pending;

  return (
    <div className="bg-card p-4 rounded-xl shadow-card border border-border/50 flex justify-between items-center hover:shadow-card-hover hover:border-primary/20 transition-all cursor-pointer">
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
              الموعد النهائي: {assignment.dueDate}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill label={config.label} variant={config.variant} />
            {assignment.status === 'graded' && (assignment as any).grade && (
              <StatusPill label={`الدرجة: ${(assignment as any).grade}`} variant="success" />
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {assignment.file_url && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(assignment.file_url!, '_blank');
            }}
            title="تحميل المرفق"
            className="flex gap-2"
          >
            <Download className="w-4 h-4" />
            تحميل المرفق
          </Button>
        )}
        {assignment.status === 'pending' || assignment.status === 'missed' ? (
          <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); onSubmitClick(); }} className="flex gap-2">
            <UploadCloud className="w-4 h-4" />
            تسليم الحل
          </Button>
        ) : (
          <div className="flex items-center gap-2 p-2 text-success text-sm font-medium justify-end">
            <FileText className="w-4 h-4" />
            تم التسليم
          </div>
        )}
      </div>
    </div>
  );
}
