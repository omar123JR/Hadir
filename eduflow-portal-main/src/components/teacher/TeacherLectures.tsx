import { useState, useEffect } from 'react';
import { FileText, Plus, Upload, Trash2, Loader2, Download, BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api, getTeacherCourses } from '@/lib/api';
import { Lecture, Course } from '@/types';

interface TeacherLecturesProps {
  onBack?: () => void;
}

export function TeacherLectures({ onBack }: TeacherLecturesProps) {
  const [lectures, setLectures] = useState<(Lecture & { courseName?: string; courseCode?: string })[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  // Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesData, lecturesResponse] = await Promise.all([
        getTeacherCourses(),
        api.get('/lectures/teacher')
      ]);

      setCourses(coursesData || []);

      const lecturesData = lecturesResponse.data || [];
      const enhancedLectures = lecturesData.map((lecture: any) => {
        const c = coursesData?.find((course: any) => course.id === lecture.course_id);
        return {
          ...lecture,
          courseName: c?.name || 'مقرر دراسي',
          courseCode: c?.code || 'CODE',
          fileSize: lecture.file_size ? `${(lecture.file_size / (1024 * 1024)).toFixed(1)} MB` : 'PDF',
          date: new Date(lecture.created_at).toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' })
        };
      });

      setLectures(enhancedLectures);
    } catch (error) {
      console.error('Error loading lectures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !lectureTitle || !selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('course_id', selectedCourseId);
      formData.append('title', lectureTitle);
      formData.append('date', new Date().toISOString().split('T')[0]);
      formData.append('file', selectedFile);

      await api.upload('/lectures/teacher', formData);

      setShowUploadDialog(false);
      setSelectedCourseId('');
      setLectureTitle('');
      setSelectedFile(null);
      loadData();
      toast({
        title: 'تم رفع المحاضرة بنجاح',
        description: 'أصبحت المادة العلمية متاحة للطلاب المسجلين الآن.',
      });
    } catch (error: any) {
      console.error('Error uploading lecture:', error);
      toast({
        title: 'خطأ في رفع المحاضرة',
        description: error.message || 'يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) return;

    try {
      await api.delete(`/lectures/teacher/${id}`);
      setLectures(lectures.filter(l => l.id !== id));
      toast({
        title: 'تم حذف المحاضرة',
        description: 'تمت إزالة ملف المحاضرة بنجاح.',
      });
    } catch (error: any) {
      console.error('Error deleting lecture:', error);
      toast({
        title: 'خطأ في الحذف',
        description: error.message || 'فشلت عملية الحذف',
        variant: 'destructive',
      });
    }
  };

  const filteredLectures = selectedCourseFilter === 'all'
    ? lectures
    : lectures.filter(l => l.course_id === selectedCourseFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="p-2 -mr-2">
              <ArrowRight className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-black text-foreground">المحاضرات والملفات الدراسية</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              رفع وتوزيع المذكرات والشرائح التعليمية للطلاب
            </p>
          </div>
        </div>

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-bold shadow-glow self-start sm:self-auto">
              <Plus className="w-4 h-4 ml-1.5" />
              رفع محاضرة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-foreground">إضافة محاضرة جديدة</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleUpload} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">المقرر الدراسي</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm"
                  required
                >
                  <option value="">اختر المقرر...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">عنوان المحاضرة</label>
                <input
                  type="text"
                  placeholder="مثال: المحاضرة 4 - هياكل البيانات المتقدمة"
                  value={lectureTitle}
                  onChange={(e) => setLectureTitle(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">ملف المحاضرة (PDF, PPTX, DOCX)</label>
                <div className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl p-6 text-center cursor-pointer transition-colors relative bg-muted/20 hover:bg-muted/40">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileSelect}
                    accept=".pdf,.ppt,.pptx,.doc,.docx"
                    required
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {selectedFile ? selectedFile.name : 'اختر ملف المحاضرة'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      الحد الأقصى لحجم الملف: 50 ميجابايت
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowUploadDialog(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={uploading || !selectedFile} className="flex-1 gradient-primary text-primary-foreground font-bold shadow-glow">
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 ml-1.5 animate-spin" />جاري الرفع...</>
                  ) : (
                    'تأكيد ورفع'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter by course */}
      {courses.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCourseFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCourseFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            جميع المقررات ({lectures.length})
          </button>
          {courses.map(course => (
            <button
              key={course.id}
              onClick={() => setSelectedCourseFilter(course.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCourseFilter === course.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {course.code}
            </button>
          ))}
        </div>
      )}

      {/* Lectures Grid */}
      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p>جاري تحميل المحاضرات والملفات...</p>
        </div>
      ) : filteredLectures.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-3xl border border-dashed border-border space-y-2">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <h4 className="font-bold text-foreground">لا توجد محاضرات مرفوعة حالياً</h4>
          <p className="text-xs text-muted-foreground">اضغط على زر "رفع محاضرة جديدة" لمشاركة المادة العلمية</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLectures.map((lecture) => (
            <div
              key={lecture.id}
              className="bg-card p-5 rounded-3xl border border-border/60 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                    {lecture.courseCode}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{lecture.date}</span>
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground line-clamp-2">
                      {lecture.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{lecture.courseName}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground">{lecture.fileSize}</span>

                <div className="flex items-center gap-1.5">
                  {lecture.file_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(lecture.file_url, '_blank')}
                      className="text-xs font-bold h-8 px-2.5 rounded-xl"
                    >
                      <Download className="w-3.5 h-3.5 ml-1" />
                      تنزيل
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(lecture.id)}
                    className="text-xs text-destructive hover:bg-destructive/10 h-8 px-2 rounded-xl"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
