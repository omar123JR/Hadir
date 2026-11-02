import { useState, useEffect } from 'react';
import { Award, Save, Settings2, Sliders, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api, getTeacherCourses } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import * as XLSX from 'xlsx';

interface Course {
  id: string;
  code: string;
  name: string;
  credit_hours?: number;
}

interface GradeItem {
  id: number;
  course_id: string;
  name: string;
  category: 'attendance' | 'assignments' | 'midterm' | 'final' | 'other';
  weight: number;
  max_score: number;
}

interface StudentRow {
  studentId: string;
  studentName: string;
  studentNumber: string;
  attendancePercentage: number;
  scores: Record<number, number | null>;
  totalScore: number | null;
  letterGrade: string | null;
  gradePoints: number | null;
}

interface GradebookData {
  course: {
    id: string;
    name: string;
    code: string;
    credit_hours: number;
  };
  gradeItems: GradeItem[];
  totalSessions: number;
  students: StudentRow[];
}

export function TeacherGradebook() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<string, Record<number, number>>>({});
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [weightsForm, setWeightsForm] = useState<Array<{ id?: number; name: string; category: any; weight: number; max_score: number }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadGradebook(selectedCourseId);
    }
  }, [selectedCourseId]);

  const loadCourses = async () => {
    try {
      const data = await getTeacherCourses();
      setCourses(data);
      if (data.length > 0 && !selectedCourseId) {
        setSelectedCourseId(data[0].id);
      }
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل قائمة المقررات الدراسية',
        variant: 'destructive',
      });
    }
  };

  const loadGradebook = async (courseId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/grades/course/${courseId}/gradebook`);
      if (res.success) {
        setGradebook(res.data);
        // Init weights form
        setWeightsForm(
          res.data.gradeItems.map((item: GradeItem) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            weight: item.weight,
            max_score: item.max_score,
          }))
        );
      }
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message || 'فشل في تحميل دفتر الدرجات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (studentId: string, gradeItemId: number, value: string) => {
    const num = parseFloat(value);
    setEditingScores((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [gradeItemId]: isNaN(num) ? 0 : num,
      },
    }));
  };

  const saveStudentScore = async (studentId: string, gradeItemId: number) => {
    const studentEdits = editingScores[studentId];
    if (!studentEdits || studentEdits[gradeItemId] === undefined) return;

    const score = studentEdits[gradeItemId];
    setSavingStudentId(`${studentId}_${gradeItemId}`);

    try {
      const res = await api.post(`/grades/course/${selectedCourseId}/student-grade`, {
        studentId,
        gradeItemId,
        score,
      });

      if (res.success) {
        toast({
          title: 'تم الحفظ بنجاح',
          description: 'تم تحديث الدرجة وإعادة حساب المجموع والتقدير تلقائياً.',
        });
        await loadGradebook(selectedCourseId);
      }
    } catch (err: any) {
      toast({
        title: 'خطأ أثناء الحفظ',
        description: err.message || 'فشل رصد الدرجة',
        variant: 'destructive',
      });
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleSaveWeights = async () => {
    const total = weightsForm.reduce((sum, item) => sum + Number(item.weight), 0);
    if (Math.abs(total - 100) > 0.01) {
      toast({
        title: 'تنبيه',
        description: `مجموع الأوزان يجب أن يساوي 100% تماماً. المجموع الحالي: ${total}%`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await api.put(`/grades/course/${selectedCourseId}/items`, {
        items: weightsForm,
      });

      if (res.success) {
        toast({
          title: 'تم التحديث بنجاح',
          description: 'تم تعديل أوزان الدرجات وتحديث تقييمات الطلاب.',
        });
        setShowWeightsModal(false);
        await loadGradebook(selectedCourseId);
      }
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message || 'فشل تحديث أوزان الدرجات',
        variant: 'destructive',
      });
    }
  };

  const exportToExcel = () => {
    if (!gradebook || gradebook.students.length === 0) return;

    const exportRows = gradebook.students.map((s) => {
      const row: Record<string, any> = {
        'رقم القيد': s.studentNumber,
        'اسم الطالب': s.studentName,
        'نسبة الحضور (%)': `${s.attendancePercentage}%`,
      };

      gradebook.gradeItems.forEach((item) => {
        row[item.name + ` (${item.weight}%)`] = s.scores[item.id] !== null ? s.scores[item.id] : 'غير مرصود';
      });

      row['المجموع النهائي (100%)'] = s.totalScore !== null ? `${s.totalScore}%` : '-';
      row['التقدير'] = s.letterGrade || '-';
      row['نقاط المعدل (4.0)'] = s.gradePoints !== null ? s.gradePoints : '-';

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'دفتر الدرجات');
    XLSX.writeFile(workbook, `كشف_درجات_${gradebook.course.code}_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'تم التصدير',
      description: 'تم تنزيل كشف الدرجات كملف Excel بنجاح.',
    });
  };

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Header & Course Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-foreground">دفتر الدرجات الأكاديمي (Gradebook)</h2>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            إدارة أوزان الدرجات ورصد تقييمات الطلاب واحتساب التقديرات التلقائية بنظام Moodle
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWeightsModal(true)}
            className="flex items-center gap-1.5"
          >
            <Sliders className="w-4 h-4 text-primary" />
            تعديل أوزان المادة
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={exportToExcel}
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* Grade Items Summary Pills */}
      {gradebook && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {gradebook.gradeItems.map((item) => (
            <div
              key={item.id}
              className="bg-card/70 border border-border/70 p-3 rounded-xl flex items-center justify-between"
            >
              <div>
                <div className="text-xs text-muted-foreground">{item.name}</div>
                <div className="text-lg font-bold text-foreground">{item.weight}%</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                أقصى: {item.max_score}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Gradebook Matrix Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            جاري تحميل دفتر الدرجات وحساب المعدلات...
          </div>
        ) : !gradebook || gradebook.students.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            لا يوجد طلاب مسجلون في هذا المقرر حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-muted/60 text-muted-foreground border-b border-border text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">الطالب</th>
                  <th className="py-3.5 px-3">حضور المحاضرات</th>
                  {gradebook.gradeItems.map((item) => (
                    <th key={item.id} className="py-3.5 px-3 min-w-[130px]">
                      {item.name}
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        وزن: {item.weight}% • أقصى: {item.max_score}
                      </span>
                    </th>
                  ))}
                  <th className="py-3.5 px-3">المجموع النهائي</th>
                  <th className="py-3.5 px-3">التقدير</th>
                  <th className="py-3.5 px-3">النقاط (4.0)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gradebook.students.map((student) => {
                  const isHighAchiever = (student.totalScore || 0) >= 85;
                  const isLow = student.totalScore !== null && student.totalScore < 60;

                  return (
                    <tr key={student.studentId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">{student.studentName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{student.studentNumber}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              student.attendancePercentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-semibold text-foreground">{student.attendancePercentage}%</span>
                        </div>
                      </td>

                      {gradebook.gradeItems.map((item) => {
                        const currentScore =
                          editingScores[student.studentId]?.[item.id] !== undefined
                            ? editingScores[student.studentId][item.id]
                            : student.scores[item.id];

                        const isAttendance = item.category === 'attendance';
                        const isSaving = savingStudentId === `${student.studentId}_${item.id}`;

                        return (
                          <td key={item.id} className="py-3 px-3">
                            {isAttendance ? (
                              <div className="text-xs font-semibold bg-muted/50 px-2 py-1.5 rounded-lg inline-block text-muted-foreground">
                                {currentScore !== null ? `${currentScore} / ${item.max_score}` : '-'}
                                <span className="text-[10px] block text-primary font-normal">محسوب تلقائياً</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.max_score}
                                  value={currentScore ?? ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleScoreChange(student.studentId, item.id, e.target.value)
                                  }
                                  className="h-8 w-16 text-center text-xs font-semibold border-border bg-background"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isSaving}
                                  onClick={() => saveStudentScore(student.studentId, item.id)}
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                  title="حفظ الدرجة"
                                >
                                  {isSaving ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-3">
                        <span
                          className={`font-bold ${
                            isHighAchiever
                              ? 'text-emerald-500'
                              : isLow
                              ? 'text-rose-500'
                              : 'text-foreground'
                          }`}
                        >
                          {student.totalScore !== null ? `${student.totalScore}%` : '-'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            student.letterGrade === 'A' || student.letterGrade === 'B+'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : student.letterGrade === 'F'
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {student.letterGrade || '-'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-foreground">
                        {student.gradePoints !== null ? student.gradePoints.toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Weights Customization Dialog */}
      <Dialog open={showWeightsModal} onOpenChange={setShowWeightsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              تخصيص أوزان درجات المقرر (Moodle Style)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              يمكنك كأستاذ المادة تحديد توزيع النسب المئوية للتقييم بحرية، بشرط أن يكون المجموع الإجمالي = 100%.
            </p>

            <div className="space-y-3">
              {weightsForm.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-foreground">{item.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{item.category}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.weight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setWeightsForm((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, weight: val } : it))
                        );
                      }}
                      className="w-16 h-8 text-center text-xs font-bold"
                    />
                    <span className="text-xs font-bold">%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Indicator */}
            {(() => {
              const total = weightsForm.reduce((sum, item) => sum + Number(item.weight), 0);
              const isValid = Math.abs(total - 100) < 0.01;

              return (
                <div
                  className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                    isValid ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    إجمالي الأوزان: {total}%
                  </span>
                  <span>{isValid ? 'متطابق (100%)' : `المتبقي: ${100 - total}%`}</span>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowWeightsModal(false)}>
                إلغاء
              </Button>
              <Button size="sm" onClick={handleSaveWeights} className="gradient-primary">
                حفظ وتطبيق التوزيع
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
