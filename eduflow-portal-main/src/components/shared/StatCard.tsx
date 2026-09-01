import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export function StatCard({ value, label, icon: Icon, variant = 'default', className }: StatCardProps) {
  const variantClasses = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  const iconBgClasses = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className={cn(
      'bg-card p-4 rounded-xl shadow-card border border-border/50 transition-all hover:shadow-card-hover',
      className
    )}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBgClasses[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1">
          <div className={cn('text-2xl font-bold', variantClasses[variant])}>{value}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}
