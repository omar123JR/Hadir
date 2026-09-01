import { useState, useMemo, useEffect } from 'react';
import { GraduationCap, BookOpen, Users, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Course, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EnrollmentManagementProps {
  onBack: () => void;
}

export function EnrollmentManagement({ onBack }: EnrollmentManagementProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchEnrollments();
    }
  }, [selectedCourse]);

  const fetchData = async () => {
    try {
      const [coursesRes, usersRes] = await Promise.all([
        api.get('/admin/courses'),
        api.get('/admin/users')
      ]);
      setCourses(coursesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل البيانات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    if (!selectedCourse) return;
    try {
      const response = await api.get(`/admin/courses/${selectedCourse.id}/enrollments`);
      setEnrollments(response.data);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    }
  };

  const teachers = useMemo(() => 
    users.filter(u => u.role === 'teacher'),
    [users]
  );

  const students = useMemo(() => 
    users.filter(u => u.role === 'student'),
    [users]
  );

  const handleAssignTeacher = async (teacherId: string) => {
    if (!selectedCourse) return;
    
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    try {
      await api.post(`/admin/courses/${selectedCourse.id}/assign-teacher`, { teacher_id: teacherId });
      
      setCourses(courses.map(c => 
        c.id === selectedCourse.id 
          ? { ...c, teacherId, teacherName: teacher.name }
          : c
      ));
      setSelectedCourse({ ...selectedCourse, teacherId, teacherName: teacher.name });
      
      toast({
        title: 'تم التعيين',
        description: `تم تعيين ${teacher.name} كمعلم للمقرر`,
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تعيين المعلم',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStudent = async (studentId: string) => {
    if (!selectedCourse) return;
    
    const isEnrolled = enrollments.some(e => e.student_id === studentId);
    const student = students.find(s => s.id === studentId);

    try {
      if (isEnrolled) {
        await api.delete(`/admin/courses/${selectedCourse.id}/enroll/${studentId}`);
        toast({
          title: 'تم إلغاء التسجيل',
          description: `${student?.name} تم إلغاء تسجيله من المقرر`,
        });
      } else {
        await api.post(`/admin/courses/${selectedCourse.id}/enroll`, { student_id: studentId });
        toast({
          title: 'تم التسجيل',
          description: `${student?.name} تم تسجيله في المقرر`,
        });
      }
      fetchEnrollments(); // Refresh enrollments
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث التسجيل',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-slideUp">
      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : (
        <div>
          <PageHeader
            title="إدارة التسجيل"
            subtitle="تعيين المعلمين وتسجيل الطلاب"
            onBack={onBack}
          />

          {/* Course Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">اختر المقرر</label>
            <Select
              value={selectedCourse?.id || ''}
              onValueChange={(value) => setSelectedCourse(courses.find(c => c.id === value) || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر مقرراً..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

      {selectedCourse && (
        <div className="space-y-6">
          {/* Selected Course Info */}
          <div className="bg-card p-4 rounded-xl border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                {selectedCourse.code.split('-')[0]}
              </div>
              <div>
                <h3 className="font-bold text-foreground">{selectedCourse.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedCourse.code}</p>
              </div>
            </div>
          </div>

          {/* Assign Teacher */}
          <div className="bg-card p-4 rounded-xl border border-border/50 space-y-3">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              تعيين المعلم
            </h4>
            <Select
              value={selectedCourse.teacherId || ''}
              onValueChange={handleAssignTeacher}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر معلماً..." />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCourse.teacherName && selectedCourse.teacherName !== 'غير معين' && (
              <p className="text-xs text-success flex items-center gap-1">
                <Check className="w-3 h-3" />
                المعلم الحالي: {selectedCourse.teacherName}
              </p>
            )}
          </div>

          {/* Enroll Students */}
          <div className="bg-card p-4 rounded-xl border border-border/50 space-y-3">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-success" />
              تسجيل الطلاب
              <span className="text-xs text-muted-foreground mr-auto">
                {enrollments.length} طالب مسجل
              </span>
            </h4>
            <div className="space-y-2">
              {students.map((student) => {
                const isEnrolled = enrollments.some(e => e.student_id === student.id);
                return (
                  <div
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
                      isEnrolled
                        ? 'bg-success/10 border-success/30'
                        : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isEnrolled ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isEnrolled ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.studentId}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${isEnrolled ? 'text-success' : 'text-muted-foreground'}`}>
                      {isEnrolled ? 'مسجل' : 'غير مسجل'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
  </div>
  );
}
