import { cn } from '@/lib/utils';
import { CheckCircle, Clock, XCircle, Info, LucideIcon } from 'lucide-react';

interface StatusPillProps {
  label: string;
  variant?: 'success' | 'warning' | 'destructive' | 'default';
  icon?: LucideIcon;
  className?: string;
}

const variantConfig = {
  success: {
    classes: 'bg-success/10 text-success border-success/20',
    defaultIcon: CheckCircle,
  },
  warning: {
    classes: 'bg-warning/10 text-warning border-warning/20',
    defaultIcon: Clock,
  },
  destructive: {
    classes: 'bg-destructive/10 text-destructive border-destructive/20',
    defaultIcon: XCircle,
  },
  default: {
    classes: 'bg-muted text-muted-foreground border-border',
    defaultIcon: Info,
  },
};

export function StatusPill({ label, variant = 'default', icon, className }: StatusPillProps) {
  const config = variantConfig[variant] || variantConfig.default;
  const IconComponent = icon || config.defaultIcon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border',
      config.classes,
      className
    )}>
      <IconComponent className="w-3 h-3" />
      {label}
    </span>
  );
}
