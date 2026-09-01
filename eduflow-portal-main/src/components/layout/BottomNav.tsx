import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-2 flex-1 transition-all group"
    >
      <div className={cn(
        'p-2 rounded-xl transition-all',
        active
          ? 'bg-primary/10'
          : 'group-hover:bg-muted'
      )}>
        <Icon className={cn(
          'w-5 h-5 transition-colors',
          active
            ? 'text-primary'
            : 'text-muted-foreground group-hover:text-foreground'
        )} />
      </div>
      <span className={cn(
        'text-[10px] mt-1 font-medium transition-colors',
        active
          ? 'text-primary'
          : 'text-muted-foreground'
      )}>
        {label}
      </span>
    </button>
  );
}

interface BottomNavProps {
  items: { id: string; icon: LucideIcon; label: string }[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ items, activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass glass-border shadow-lg">
      <div className="max-w-xl mx-auto flex justify-around h-20">
        {items.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
