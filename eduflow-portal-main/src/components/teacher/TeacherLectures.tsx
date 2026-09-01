import { useState, useEffect } from 'react';
import { FileText, Plus, Upload, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api, getTeacherCourses } from '@/lib/api';
import { Lecture, Course } from '@/types';

interface TeacherLecturesProps {
  onBack?: () => void;
}

export function TeacherLectures({ onBack }: TeacherLecturesProps) {
  const [lectures, setLectures] = useState<(Lecture & { courseName?: string })[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [lectureTitle, setLectureTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

      // Enhance lectures with course names
      const lecturesData = lecturesResponse.data || [];
      const enhancedLectures = lecturesData.map((lecture: any) => ({
        ...lecture,
        courseName: coursesData?.find((c: any) => c.id === lecture.course_id)?.name || 'Unknown Course',
        // Map backend fields to frontend expected fields if necessary (though we should update types ideally)
        fileSize: lecture.file_size || 'Unknown',
        date: new Date(lecture.created_at).toLocaleDateString('ar-SA')
      }));

      setLectures(enhancedLectures);
    } catch (error) {
      console.error('Error loading data:', error);
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
      formData.append('date', new Date().toISOString().split('T')[0]); // Add current date
      formData.append('file', selectedFile);

      await api.upload('/lectures/teacher', formData);

      setShowUploadDialog(false);
      resetForm();
      loadData(); // Reload list
    } catch (error) {
      console.error('Error uploading lecture:', error);
      alert('فشل في رفع المحاضرة');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) return;

    try {
      await api.delete(`/lectures/teacher/${id}`);
      setLectures(lectures.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting lecture:', error);
    }
  };

  const resetForm = () => {
    setSelectedCourseId('');
    setLectureTitle('');
    setSelectedFile(null);
  };

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="flex justify-between items-center">
        <PageHeader
          title="المحاضرات"
          onBack={onBack}
        />

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 ml-2" />
              رفع محاضرة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>رفع محاضرة جديدة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">المادة</label>
                <select
                  className="w-full p-2 rounded-md border bg-background"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                >
                  <option value="">اختر المادة...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">عنوان المحاضرة</label>
                <input
                  type="text"
                  className="w-full p-2 rounded-md border bg-background"
                  placeholder="مثال: مقدمة في قواعد البيانات"
                  value={lectureTitle}
                  onChange={(e) => setLectureTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الملف</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors relative">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileSelect}
                    accept=".pdf,.pptx,.docx"
                    required
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : 'اختر ملف المحاضرة'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري الرفع...
                    </>
                  ) : (
                    'رفع المحاضرة'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">جاري تحميل المحاضرات...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lectures.length > 0 ? (
            lectures.map((lecture) => (
              <div
                key={lecture.id}
                className="bg-card p-4 rounded-xl shadow-card border border-border/50 flex justify-between items-center hover:shadow-card-hover transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center text-destructive">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{lecture.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{lecture.courseName}</span>
                      <span>•</span>
                      <span>{lecture.date}</span>
                      <span>•</span>
                      <span>{lecture.fileSize || 'Unknown size'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(lecture.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          ) : (
            <EmptyState
              icon={FileText}
              title="لا توجد محاضرات"
              description="ابدأ برفع محاضراتك للطلاب"
            />
          )}
        </div>
      )}
    </div>
  );
}
