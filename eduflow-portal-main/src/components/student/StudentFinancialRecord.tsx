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

                <div className="text-right sm:text-left self-end sm:self-auto">
                  <span className="text-base font-black text-emerald-500 block">
                    +{Number(tx.amount).toLocaleString()} د.ل
                  </span>
                  {tx.notes && (
                    <span className="text-[10px] text-muted-foreground">{tx.notes}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
