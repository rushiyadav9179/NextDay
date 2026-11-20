import React, { useState, useEffect } from 'react';
import { Search, Sun, Moon, Bell, LogOut, Menu, Sparkles, User, Users } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useThemeStore } from '../../store/useThemeStore.js';
import { getSocket } from '../../lib/socket.js';
import { Badge } from '../ui/Badge.js';

interface TopbarProps {
  onOpenCommand: () => void;
  onToggleMobileMenu: () => void;
}

export function Topbar({ onOpenCommand, onToggleMobileMenu }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    const socket = getSocket();
    const handlePresence = (data: { onlineCount: number }) => {
      if (data?.onlineCount) setOnlineCount(data.onlineCount);
    };

    socket.on('presence:update', handlePresence);
    return () => {
      socket.off('presence:update', handlePresence);
    };
  }, []);

  return (
    <header className="h-16 px-4 md:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 transition-all">
      {/* Left: Mobile hamburger + Command Palette shortcut button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-xs transition-all shadow-xs group"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 transition-transform group-hover:rotate-12" />
          <span className="hidden sm:inline">Zero-UI Command Bar (Ctrl+K)</span>
          <span className="sm:hidden">AI Command</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Presence, Theme Toggle, User Profile */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Real-time Presence Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{onlineCount} live</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Info & Avatar */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge variant="purple" className="text-[10px] py-0 px-1.5">
                {user?.role || 'EMPLOYEE'}
              </Badge>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
