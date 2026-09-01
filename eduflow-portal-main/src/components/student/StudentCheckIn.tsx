import { useState, useEffect } from 'react';
import { CheckCircle, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface AttendanceRecord {
  id: number;
  session_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_number: string | null;
  attendance_time: string;
  method: 'qr' | 'manual';
  course_name: string;
  course_code: string;
  date: string;
  time: string;
}

export function StudentCheckIn() {
  const [isScanning, setIsScanning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (!isSuccess) {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scanner.render(
        async (decodedText) => {
          if (isScanning) return; // Prevent multiple submissions
          
          setIsScanning(true);
          try {
            // Stop scanning after successful read
            scanner?.clear();
            
            const response = await api.post('/attendance/student/scan', { qr_code: decodedText.trim() });
            
            if (response.success) {
              setAttendanceRecord(response.data);
              setIsSuccess(true);
              toast({
                title: 'تم تسجيل الحضور بنجاح! ✓',
                description: `${response.data.course_name} - ${response.data.date} ${response.data.time}`,
              });
            } else {
              throw new Error(response.message || 'فشل في تسجيل الحضور');
            }
          } catch (error: any) {
            console.error('Scan error:', error);
            toast({
              title: 'خطأ في تسجيل الحضور',
              description: error.message || 'يرجى المحاولة مرة أخرى',
              variant: 'destructive',
            });
            // Re-render scanner if it failed
            setIsScanning(false);
          }
        },
        (error) => {
          // Ignore frequent scan errors
        }
      );
    }

    return () => {
      scanner?.clear().catch(console.error);
    };
  }, [isSuccess]);

  const handleManualEntry = async () => {
    const qrCode = prompt('أدخل رمز QR يدوياً:');
    if (!qrCode || qrCode.trim() === '') return;

    setIsScanning(true);

    try {
      const response = await api.post('/attendance/student/scan', { qr_code: qrCode.trim() });

      if (response.success) {
        setAttendanceRecord(response.data);
        setIsSuccess(true);
        toast({
          title: 'تم تسجيل الحضور بنجاح! ✓',
          description: `${response.data.course_name} - ${response.data.date} ${response.data.time}`,
        });
      } else {
        throw new Error(response.message || 'فشل في تسجيل الحضور');
      }
    } catch (error: any) {
      console.error('Manual entry error:', error);
      toast({
        title: 'خطأ في تسجيل الحضور',
        description: error.message || 'يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  if (isSuccess && attendanceRecord) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-slideUp">
        <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center animate-pulse-glow">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">تم تسجيل حضورك</h2>
          <p className="text-muted-foreground">{attendanceRecord.course_name}</p>
          <p className="text-sm text-muted-foreground">{attendanceRecord.date} • {attendanceRecord.time}</p>
          <p className="text-xs text-muted-foreground">الرمز: {attendanceRecord.method === 'qr' ? 'مسح QR' : 'يدوي'}</p>
        </div>
        <Button variant="outline" onClick={() => { setIsSuccess(false); setAttendanceRecord(null); setIsScanning(false); }}>
          العودة للماسح
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col items-center justify-center min-h-[60vh] animate-slideUp">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">امسح الكود للحضور</h2>
        <p className="text-muted-foreground text-sm">
          وجه الكاميرا نحو رمز QR الذي يعرضه أستاذ المادة
        </p>
      </div>

      <div className="w-full max-w-sm overflow-hidden rounded-3xl shadow-lg border-4 border-primary">
        <div id="qr-reader" className="w-full bg-black/5" />
      </div>
      
      {isScanning && (
        <div className="text-primary font-bold animate-pulse">
          جاري التحقق من الرمز...
        </div>
      )}

      <Button variant="outline" onClick={handleManualEntry} disabled={isScanning} className="w-full max-w-sm mt-4">
        <Keyboard className="w-4 h-4 ml-2" />
        إدخال الرمز يدوياً
      </Button>

      <div className="text-center space-y-2 max-w-sm">
        <p className="text-xs text-muted-foreground">
          خطوات الاستخدام:
        </p>
        <ol className="text-xs text-muted-foreground text-right space-y-1">
          <li>1. اسمح للمتصفح باستخدام الكاميرا</li>
          <li>2. وجه الكاميرا لرمز QR الخاص بالمحاضرة</li>
          <li>3. سيتم تسجيل الحضور تلقائياً</li>
        </ol>
      </div>
    </div>
  );
}
