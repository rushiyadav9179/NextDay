import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Clock, CalendarDays, UserPlus, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils.js';

interface MobileNavProps {
  onOpenCommand: () => void;
}

export function MobileNav({ onOpenCommand }: MobileNavProps) {
  const tabs = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Punch In/Out', to: '/attendance', icon: Clock },
    { label: 'Leave', to: '/leave', icon: CalendarDays },
    { label: 'Pipeline', to: '/recruiting', icon: UserPlus },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 md:hidden flex items-center justify-around px-2 py-2 safe-area-bottom">
      {tabs.slice(0, 2).map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              )
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}

      {/* Floating Center AI Command Action */}
      <button
        onClick={onOpenCommand}
        className="flex flex-col items-center justify-center -mt-5"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/40 active:scale-95 transition-transform">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">Zero-UI</span>
      </button>

      {tabs.slice(2).map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              )
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
