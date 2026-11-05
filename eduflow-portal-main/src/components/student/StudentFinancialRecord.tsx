import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Printer, 
  AlertTriangle,
  ArrowDownLeft,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface FinancialStatus {
  total_tuition: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  is_frozen: boolean;
  freeze_reason: string | null;
  last_payment_date: string | null;
  transactions?: Array<{
    id: number;
    amount: number;
    receipt_number: string;
    payment_method: string;
    created_at: string;
    notes?: string;
  }>;
}

export function StudentFinancialRecord() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [financials, setFinancials] = useState<FinancialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    loadFinancials();
  }, []);

  const loadFinancials = async () => {
    try {
      setLoading(true);
      const res = await api.get('/financials/my-status');
      if (res.success && res.data) {
        setFinancials(res.data);
      }
    } catch (err: any) {
      toast({
        title: 'خطأ',
        description: err.message || 'فشل في تحميل السجل المالي',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalTuition = Number(financials?.total_tuition || 3500);
  const paidAmount = Number(financials?.paid_amount || 0);
  const remainingAmount = Number(financials?.remaining_amount ?? (totalTuition - paidAmount));
  const isPaidFull = remainingAmount <= 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 backdrop-blur-md p-6 rounded-3xl border border-border/60">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-foreground">السجل المالي والأكاديمي</h2>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                isPaidFull 
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
              }`}>
                {isPaidFull ? 'تم سداد الرسوم كاملة' : 'يوجد أقساط متبقية'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              متابعة الرسوم الدراسية المعتمدة، كشوفات سداد الأقساط، وإيصالات القبض الرسمية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الكشف</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadFinancials} 
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Account Freeze Alert Banner */}
      {financials?.is_frozen && (
        <div className="p-6 rounded-3xl bg-destructive/10 border-2 border-destructive/40 shadow-lg shadow-destructive/10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-destructive/20 border border-destructive/40 flex items-center justify-center text-destructive shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="font-black text-base text-destructive">حسابك الأكاديمي مجمد حالياً!</h4>
            <p className="text-sm text-foreground/90 font-medium leading-relaxed">
              {financials.freeze_reason || 'تم إيقاف صلاحيات الحضور وتسليم الواجبات مؤقتاً لمراجعة الشؤون المالية للكلية.'}
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              يرجى مراجعة الإدارة المالية لشؤون الطلاب وتسوية الأقساط المتأخرة ليقوم المشرف بفك التجميد فوراً.
            </p>
          </div>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Tuition */}
        <div className="bg-card p-5 rounded-3xl border border-border/70 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">إجمالي الرسوم المقررة</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {totalTuition.toLocaleString()} <span className="text-xs font-bold text-muted-foreground">د.ل</span>
          </div>
          <span className="text-[11px] text-muted-foreground block font-medium">الفصل الدراسي: خريف 2026</span>
        </div>

        {/* Paid Amount */}
        <div className="bg-card p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold">المبلغ المسدد حتى الآن</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-500">
            {paidAmount.toLocaleString()} <span className="text-xs font-bold text-emerald-600">د.ل</span>
          </div>
          <span className="text-[11px] text-emerald-600/80 block font-medium">
            نسبة السداد: {totalTuition > 0 ? Math.min(100, Math.round((paidAmount / totalTuition) * 100)) : 100}%
          </span>
        </div>

        {/* Remaining Amount */}
        <div className="bg-card p-5 rounded-3xl border border-amber-500/30 bg-amber-500/5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold">المبلغ المتبقي للسداد</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500">
            {remainingAmount.toLocaleString()} <span className="text-xs font-bold text-amber-600">د.ل</span>
          </div>
          <span className="text-[11px] text-amber-600/80 block font-medium">
            {isPaidFull ? 'لا توجد أي مبالغ مستحقة' : 'يرجى سداد المبلغ قبل فترة الامتحانات'}
          </span>
        </div>
      </div>

      {/* Receipts and Payment Transactions */}
      <div className="bg-card p-6 rounded-3xl border border-border/70 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-base text-foreground">سجل الدفعات وإيصالات السداد</h3>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">
            {financials?.transactions?.length || 0} إيصال مسجل
          </span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-xs text-muted-foreground">جاري تحميل سجل السداد...</div>
        ) : !financials?.transactions || financials.transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border text-xs">
            لم يتم تسجيل أي دفعات مالية بعد
          </div>
        ) : (
          <div className="space-y-3">
            {financials.transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      إيصال قبض رسمي: <span className="font-mono">{tx.receipt_number}</span>
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      طريقة الدفع: <span className="font-semibold text-foreground">{tx.payment_method}</span> • التاريخ: {new Date(tx.created_at).toLocaleDateString('ar-LY')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 self-end sm:self-auto">
                  <div className="text-right sm:text-left">
                    <span className="text-base font-black text-emerald-500 block">
                      +{Number(tx.amount).toLocaleString()} د.ل
                    </span>
                    {tx.notes && (
                      <span className="text-[10px] text-muted-foreground">{tx.notes}</span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedReceipt(tx)}
                    className="h-8 text-xs font-bold text-primary border-primary/25 hover:bg-primary/10"
                  >
                    <Printer className="w-3.5 h-3.5 ml-1.5" />
                    عرض الإيصال
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Official Payment Receipt Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={(open) => { if (!open) setSelectedReceipt(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base font-bold text-foreground border-b border-border/50 pb-3">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                إيصال قبض مالي رسمي معتمد
              </span>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="gradient-primary text-primary-foreground font-bold text-xs h-8 px-3"
              >
                <Printer className="w-3.5 h-3.5 ml-1.5" />
                طباعة الإيصال
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Printable Receipt Body */}
          <div className="p-6 bg-card text-foreground rounded-2xl border border-border/80 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0">
            {/* University & Ministry Header */}
            <div className="border-b-2 border-primary/30 pb-4 flex items-center justify-between">
              <div className="text-right space-y-0.5">
                <p className="text-[11px] font-bold text-primary">الجمهورية الليبية • وزارة التعليم العالي والبحث العلمي</p>
                <h4 className="text-base font-black text-foreground">جامعة طرابلس الأهلية • الخزينة والإدارة المالية</h4>
                <p className="text-[10px] text-muted-foreground">قسم الحسابات العامة وشؤون الخزينة</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <span className="text-[9px] font-bold text-emerald-600 tracking-wider block">OFFICIAL RECEIPT</span>
                <span className="font-mono font-bold text-xs text-foreground">{selectedReceipt?.receipt_number}</span>
              </div>
            </div>

            {/* Receipt Details Box */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-muted-foreground text-[10px] block">وصلنا من الطالب:</span>
                  <span className="font-extrabold text-sm text-foreground">{user?.name || 'مستخدم حاضر'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">الرقم الجامعي / القيد:</span>
                  <span className="font-mono font-bold text-foreground">{user?.student_id || user?.id || 'STU-001'}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                <span className="text-xs text-emerald-700 font-bold block">المبلغ المقبوض نقداً / مصرفياً:</span>
                <div className="text-3xl font-black text-emerald-600">
                  {Number(selectedReceipt?.amount || 0).toLocaleString()} <span className="text-sm font-bold">دينار ليبي</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-muted-foreground text-[10px] block">طريقة السداد:</span>
                  <span className="font-bold text-foreground">{selectedReceipt?.payment_method || 'نقدي (Cash)'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">تاريخ المعاملة:</span>
                  <span className="font-bold text-foreground">{selectedReceipt?.created_at ? new Date(selectedReceipt.created_at).toLocaleString('ar-LY') : '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground text-[10px] block">وذلك مقابل:</span>
                  <span className="font-medium text-foreground">سداد قسط من الرسوم الدراسية المعتمدة - الفصل الأكاديمي خريف 2026/2027</span>
                </div>
                <div className="col-span-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex justify-between items-center">
                  <span className="text-[11px] text-amber-700 font-semibold">المبلغ المتبقي على الطالب بعد هذا الإيصال:</span>
                  <span className="font-bold text-amber-600">{remainingAmount.toLocaleString()} د.ل</span>
                </div>
              </div>
            </div>

            {/* Stamp & Cashier Signatures */}
            <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-foreground/70" />
                </div>
                <div>
                  <span className="font-bold text-[10px] block text-foreground">رمز المطابقة والتدقيق المالي</span>
                  <span className="font-mono text-[9px] text-muted-foreground block">{selectedReceipt?.receipt_number}</span>
                  <span className="text-[9px] text-emerald-600 font-semibold">إيصال مسجل بالنظام المالي المركزي</span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <span className="font-bold text-muted-foreground text-[10px] block">توقيع وختم أمين الخزينة</span>
                <div className="w-24 h-7 border-b-2 border-dashed border-border mx-auto" />
                <span className="text-[9px] text-muted-foreground">صُرف وقُبض بموجب إذن رسمي</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
