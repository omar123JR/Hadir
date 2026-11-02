import { useState, useEffect, useMemo } from 'react';
import { BookOpen, MapPin, User, Clock, ArrowRight, Calendar, Award, CheckCircle2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStudentCourses } from '@/lib/api';
import { Course } from '@/types';

interface StudentScheduleProps {
  onBack: () => void;
}

export function StudentSchedule({ onBack }: StudentScheduleProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('all');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await getStudentCourses();
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCredits = courses.reduce((sum, c) => sum + (c.credit_hours || 3), 0);

  const daysList = [
    { id: 'all', label: 'كافة الأيام' },
    { id: 'الأحد', label: 'الأحد' },
    { id: 'الاثنين', label: 'الاثنين' },
    { id: 'الثلاثاء', label: 'الثلاثاء' },
    { id: 'الأربعاء', label: 'الأربعاء' },
    { id: 'الخميس', label: 'الخميس' },
  ];

  const filteredCourses = useMemo(() => {
    if (selectedDay === 'all') return courses;
    return courses.filter(c => (c.schedule_day || '').includes(selectedDay));
  }, [courses, selectedDay]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-3xl border border-border/60">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2 -mr-2">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-foreground">الجدول الدراسي ومواقع القاعات</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                خريف 2026
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              مواعيد المحاضرات الأسبوعية، القاعات الدراسية، وأسماء أساتذة المواد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600">
            {totalCredits} ساعة معتمدة
          </div>
          <div className="px-3.5 py-1.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            {courses.length} مواد مسجلة
          </div>
        </div>
      </div>

      {/* Filter by Day */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground ml-2 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>تصفية باليوم:</span>
        </div>
        {daysList.map((day) => (
          <button
            key={day.id}
            onClick={() => setSelectedDay(day.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedDay === day.id
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                : 'bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Schedule Grid */}
      {loading ? (
        <div className="text-center py-16 text-sm text-muted-foreground">جاري تحميل الجدول الأكاديمي...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-16 text-center bg-card rounded-3xl border border-dashed border-border text-muted-foreground space-y-2">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
          <h4 className="font-bold text-foreground">لا توجد محاضرات في هذا اليوم</h4>
          <p className="text-xs text-muted-foreground">يمكنك اختيار "كافة الأيام" للاطلاع على الجدول الكامل</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-card p-5 rounded-3xl border border-border/70 hover:border-primary/40 hover:shadow-lg transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Top Row: Code & Name */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
                      {course.code.split('-')[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-foreground leading-snug">{course.name}</h3>
                      <span className="text-xs text-muted-foreground font-mono">{course.code}</span>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                    {course.credit_hours || 3} س.م
                  </span>
                </div>

                {/* Prominent Classroom & Hall Location Card */}
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-muted-foreground">مكان القاعة:</span>
                    <strong className="text-foreground font-black text-sm">
                      {course.room || 'قاعة الخوارزمي (204)'}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2 text-xs pt-1.5 border-t border-border/40">
                    <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-muted-foreground">الموعد الأسبوعي:</span>
                    <span className="text-foreground font-bold">
                      {course.schedule_day || 'الأحد - الثلاثاء'}
                    </span>
                    <span className="font-mono text-muted-foreground text-[11px]">
                      ({course.schedule_time || '09:00 ص - 10:30 ص'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Instructor */}
              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>المحاضر: <strong className="text-foreground font-semibold">د. {course.teacher_name || 'أستاذ المادة'}</strong></span>
                </div>
                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  مقرر مسجل
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
