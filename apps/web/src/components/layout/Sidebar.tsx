import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  Compass,
  Users,
  Network,
  Clock,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  Mail,
  Bot,
  Boxes,
  Code2,
  Settings,
  Sparkles,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { apiRequest } from '../../lib/api.js';
import { cn } from '../../lib/utils.js';

interface SidebarProps {
  className?: string;
  onItemClick?: () => void;
}

export function Sidebar({ className, onItemClick }: SidebarProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const [customModules, setCustomModules] = useState<any[]>([]);

  useEffect(() => {
    apiRequest('/custom-modules')
      .then((res) => {
        if (res.modules) setCustomModules(res.modules);
      })
      .catch(() => {});
  }, [location.pathname]);

  const navItems = [
    { label: 'HR Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Recruiting & ATS', to: '/recruiting', icon: UserPlus },
    { label: 'Onboarding Portal', to: '/onboarding', icon: Compass },
    { label: 'Employee Directory', to: '/employees', icon: Users },
    { label: 'Org Knowledge Graph', to: '/org-chart', icon: Network },
    { label: 'Time & Attendance', to: '/attendance', icon: Clock },
    { label: 'Leave Management', to: '/leave', icon: CalendarDays },
    { label: 'Payroll & Expenses', to: '/payroll-expenses', icon: CreditCard },
    { label: 'Compliance Registry', to: '/compliance', icon: ShieldCheck },
    { label: 'Email Communications', to: '/emails', icon: Mail },
    { label: 'AI Agent Center', to: '/agents', icon: Bot, badge: '19 Agents' },
    { label: 'Autocoding Engine', to: '/autocoding', icon: Boxes, badge: 'AI Gen' },
  ];

  return (
    <aside
      className={cn(
        'w-64 flex flex-col shrink-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all select-none',
        className
      )}
    >
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
            NextDay
          </span>
          <span className="block text-[10px] uppercase font-semibold tracking-wider text-indigo-500">
            Enterprise Suite
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Workspace
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* AI-Generated Dynamic Custom Modules */}
        {customModules.length > 0 && (
          <div>
            <div className="px-3 flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                AI Custom Modules
              </p>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1 rounded">
                Live
              </span>
            </div>
            <div className="space-y-0.5">
              {customModules.map((mod) => (
                <NavLink
                  key={mod.slug}
                  to={`/modules/${mod.slug}`}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    )
                  }
                >
                  <div className="flex items-center gap-3 truncate">
                    <Boxes className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="truncate">{mod.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Developer & Admin */}
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Platform & API
          </p>
          <div className="space-y-0.5">
            <NavLink
              to="/developer-guide"
              onClick={onItemClick}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                )
              }
            >
              <Code2 className="w-4 h-4 shrink-0" />
              <span>Developer API & Keys</span>
            </NavLink>

            {(user?.role === 'SUPER_ADMIN' || user?.role === 'HR_ADMIN') && (
              <NavLink
                to="/admin"
                onClick={onItemClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                  )
                }
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Admin & Security</span>
              </NavLink>
            )}
          </div>
        </div>
      </div>

      {/* Tenant / Organization info */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <div className="truncate flex-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {user?.tenantName || 'Acme Corporation'}
            </p>
            <p className="text-[10px] text-slate-400">Enterprise Tenant</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
