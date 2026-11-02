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
      className="flex flex-col items-center justify-center py-1 px-2 min-w-[56px] flex-shrink-0 transition-all group"
    >
      <div className={cn(
        'p-1.5 rounded-xl transition-all',
        active
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
          : 'text-muted-foreground group-hover:bg-muted group-hover:text-foreground'
      )}>
        <Icon className="w-4 h-4 transition-transform group-hover:scale-105" />
      </div>
      <span className={cn(
        'text-[10px] mt-0.5 font-bold truncate max-w-[68px] text-center',
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/80 shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1 overflow-x-auto scrollbar-none">
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
