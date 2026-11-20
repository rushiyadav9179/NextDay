import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';
import { getSocket } from '../../lib/socket.js';

interface AgentEvent {
  id: string;
  agentName: string;
  message: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  timestamp: string;
}

export function LiveAgentFeed() {
  const [events, setEvents] = useState<AgentEvent[]>([
    {
      id: 'init-1',
      agentName: 'Resume Screening Agent',
      message: 'Scored 10 candidate submissions for Distributed Systems Engineer',
      status: 'SUCCESS',
      timestamp: 'Just now',
    },
    {
      id: 'init-2',
      agentName: 'Payroll Audit Agent',
      message: 'Verified gross-to-net calculations across 40 employees. 0 variances.',
      status: 'SUCCESS',
      timestamp: '2m ago',
    },
  ]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const handleActivity = (payload: any) => {
      const newEv: AgentEvent = {
        id: Math.random().toString(36).substring(2, 9),
        agentName: payload.agentName || 'NextDay AI Agent',
        message: payload.message || payload.summary || 'Executed agent workflow',
        status: payload.status || 'SUCCESS',
        timestamp: 'Just now',
      };
      setEvents((prev) => [newEv, ...prev.slice(0, 15)]);
    };

    socket.on('agent:activity', handleActivity);
    socket.on('agent:run:started', (p) =>
      handleActivity({ agentName: p.agentName, message: 'Autonomous task started', status: 'RUNNING' })
    );
    socket.on('agent:run:completed', (p) =>
      handleActivity({ agentName: p.agentName, message: p.summary || 'Task completed successfully', status: 'SUCCESS' })
    );

    return () => {
      socket.off('agent:activity', handleActivity);
      socket.off('agent:run:started');
      socket.off('agent:run:completed');
    };
  }, []);

  return (
    <>
      {/* Floating Widget Trigger */}
      <div className="fixed bottom-16 md:bottom-6 right-6 z-30">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl hover:scale-105 active:scale-95 transition-all text-xs font-semibold"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Bot className="w-4 h-4 text-indigo-400" />
          <span>Agent Activity</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-mono">
            {events.length}
          </span>
        </button>
      </div>

      {/* Slide-out Activity Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 md:bottom-20 right-6 z-40 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="p-3.5 px-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Live Autonomous Agent Activity
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
            {events.map((ev) => (
              <div key={ev.id} className="p-2.5 flex items-start gap-2.5 text-xs">
                {ev.status === 'RUNNING' ? (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0 mt-0.5" />
                ) : ev.status === 'SUCCESS' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {ev.agentName}
                    </span>
                    <span className="text-[10px] text-slate-400">{ev.timestamp}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    {ev.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
