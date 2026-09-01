import { useState, useEffect } from 'react';
import { BookOpen, MapPin, User } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { getStudentCourses } from '@/lib/api';
import { Course } from '@/types';

interface StudentScheduleProps {
  onBack: () => void;
}

export function StudentSchedule({ onBack }: StudentScheduleProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await getStudentCourses();
      setCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-slideUp">
      <PageHeader
        title="المواد الدراسية (الجدول)"
        onBack={onBack}
      />

      <div className="space-y-4">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">جاري التحميل...</div>
        ) : courses.length > 0 ? (
          <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
            <div className="bg-primary/5 px-4 py-2 border-b border-border/50">
              <h3 className="font-bold text-primary">المواد المسجلة</h3>
            </div>
            
            <div className="space-y-3 px-3 py-3">
              {courses.map((course) => (
                <div key={course.id} className="p-3">
                  <div className="bg-muted/30 p-4 rounded-xl shadow-sm border border-border/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">{course.name}</h4>
                          <span className="text-xs text-muted-foreground font-mono">{course.code}</span>
                        </div>
                      </div>
                    </div>
                    
                    {course.teacher_name && (
                      <div className="mt-3 pt-3 border-t border-border/30 flex items-center text-xs text-muted-foreground gap-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>أستاذ المادة: {course.teacher_name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl shadow-card border border-border/50 p-8 text-center text-muted-foreground">
            لا توجد مواد مسجلة حالياً
          </div>
        )}
      </div>
    </div>
  );
}
