import { useState } from 'react';
import { Moon, Sun, Type, Lock, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';

export function SettingsView() {
  const { logout } = useAuth();
  const { darkMode, toggleDarkMode, fontSize, setFontSize } = useTheme();
  const [openChangePwd, setOpenChangePwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  return (
    <div className="space-y-6 animate-slideUp">
      <h2 className="text-xl font-bold text-foreground">الإعدادات</h2>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        {/* Dark Mode */}
        <SettingItem
          icon={darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          iconBg="bg-primary/10 text-primary"
          label="الوضع الليلي"
        >
          <ToggleSwitch checked={darkMode} onChange={toggleDarkMode} />
        </SettingItem>

        {/* Font Size */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-success/10 rounded-lg text-success">
              <Type className="w-5 h-5" />
            </div>
            <span className="font-medium text-foreground">حجم الخط</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        {/* Change Password */}
        <SettingItem
          icon={<Lock className="w-5 h-5" />}
          iconBg="bg-destructive/10 text-destructive"
          label="تغيير كلمة المرور"
          clickable
          onClick={() => setOpenChangePwd(true)}
        />

        <Dialog open={openChangePwd} onOpenChange={setOpenChangePwd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تغيير كلمة المرور</DialogTitle>
              <DialogDescription>أدخل كلمة المرور الحالية والجديدة ثم أكدها.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <Input placeholder="كلمة المرور الحالية" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
              <Input placeholder="كلمة المرور الجديدة" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              <Input placeholder="تأكيد كلمة المرور" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenChangePwd(false)}>إلغاء</Button>
              <Button
                disabled={isLoading}
                onClick={async () => {
                  if (!currentPwd || !newPwd || !confirmPwd) {
                    toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول', variant: 'destructive' });
                    return;
                  }
                  if (newPwd !== confirmPwd) {
                    toast({ title: 'خطأ', description: 'تأكيد كلمة المرور غير مطابق', variant: 'destructive' });
                    return;
                  }

                  try {
                    setIsLoading(true);
                    await api.put('/auth/password', { currentPassword: currentPwd, newPassword: newPwd });

                    toast({ title: 'نجاح', description: 'تم تغيير كلمة المرور بنجاح' });
                    setOpenChangePwd(false);
                    setCurrentPwd('');
                    setNewPwd('');
                    setConfirmPwd('');
                  } catch (error: any) {
                    toast({
                      title: 'خطأ',
                      description: error.response?.data?.message || 'فشل تغيير كلمة المرور',
                      variant: 'destructive'
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Button
        onClick={logout}
        variant="destructive"
        className="w-full"
      >
        <LogOut className="w-5 h-5 ml-2" />
        تسجيل الخروج
      </Button>
    </div>
  );
}

interface SettingItemProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  children?: React.ReactNode;
  border?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

function SettingItem({ icon, iconBg, label, children, border, clickable, onClick }: SettingItemProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`p-4 flex justify-between items-center ${border ? 'border-b border-border/50' : ''} ${clickable ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''}`}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${checked ? 'bg-primary' : 'bg-muted'
        }`}
    >
      <span
        className={`block w-5 h-5 bg-card rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${checked ? 'right-1' : 'left-1'
          }`}
      />
    </button>
  );
}
