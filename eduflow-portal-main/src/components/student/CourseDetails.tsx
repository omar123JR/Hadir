import { useState, useEffect } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Course, Lecture } from '@/types';
import { api } from '@/lib/api';

interface CourseDetailsProps {
  course: Course;
  onBack: () => void;
}

export function CourseDetails({ course, onBack }: CourseDetailsProps) {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLectures = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/lectures/student/course/${course.id}`);
        const lecturesData = response.data || [];
        // Map fields if needed
        const mappedLectures = lecturesData.map((l: any) => ({
          ...l,
          date: new Date(l.date).toLocaleDateString('ar-SA'),
          fileSize: l.file_size || 'Unknown',
          fileUrl: l.file_url || null
        }));
        setLectures(mappedLectures);
      } catch (error) {
        console.error('Error loading lectures:', error);
      } finally {
        setLoading(false);
      }
    };

    if (course.id) {
      loadLectures();
    }
  }, [course.id]);

  const handleDownload = (lecture: Lecture & { fileUrl?: string }) => {
    if (lecture.fileUrl) {
      window.open(lecture.fileUrl, '_blank');
    } else {
      alert('الرابط غير متوفر');
    }
  };

  return (
    <div className="space-y-5 animate-slideUp">
      <PageHeader
        title={course.name}
        subtitle={course.code}
        onBack={onBack}
      />

      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">جاري تحميل المحاضرات...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lectures.length > 0 ? (
            lectures.map((lecture) => (
              <LectureCard
                key={lecture.id}
                lecture={lecture}
                onDownload={() => handleDownload(lecture as any)}
              />
            ))
          ) : (
            <EmptyState
              icon={FileText}
              title="لا توجد محاضرات"
              description="لم يتم رفع أي محاضرات لهذه المادة بعد"
            />
          )}
        </div>
      )}
    </div>
  );
}

interface LectureCardProps {
  lecture: Lecture;
  onDownload: () => void;
}

function LectureCard({ lecture, onDownload }: LectureCardProps) {
  return (
    <div className="bg-card p-4 rounded-xl shadow-card border border-border/50 flex justify-between items-center group hover:border-primary/20 hover:shadow-card-hover transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center text-destructive">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
            {lecture.title}
          </h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{lecture.date}</span>
            <span>•</span>
            <span>{lecture.fileSize}</span>
          </div>
        </div>
      </div>
      <button
        onClick={onDownload}
        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
      >
        <Download className="w-5 h-5" />
      </button>
    </div>
  );
}
