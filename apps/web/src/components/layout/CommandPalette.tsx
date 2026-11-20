import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Command, Search, ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { apiRequest } from '../../lib/api.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExecute = async (confirmed: boolean = false) => {
    if (!command.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/agents/command', {
        method: 'POST',
        body: JSON.stringify({ command, confirmed }),
      });
      setResult(res);

      if (!res.requiresConfirmation && res.redirectUrl) {
        setTimeout(() => {
          onClose();
          navigate(res.redirectUrl);
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to route command');
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'Show top 5 backend candidates',
    'Email all new joiners the welcome template',
    'Approve Priya\'s leave',
    'Who hasn\'t punched in today?',
    'Add a vaccination tracking dashboard',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Sparkles className="w-5 h-5 text-indigo-500 mr-3 animate-pulse" />
          <input
            autoFocus
            type="text"
            value={command}
            onChange={(e) => {
              setCommand(e.target.value);
              setResult(null);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExecute(false);
            }}
            placeholder="Type any HR action or ask an AI agent (e.g. 'Show top 5 candidates' or 'Approve leave')..."
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none"
          />
          {loading ? (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          ) : (
            <button
              onClick={() => handleExecute(false)}
              className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
            >
              Run ↵
            </button>
          )}
        </div>

        {/* Result & Confirmation Panel */}
        {result && (
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-3">
              {result.requiresConfirmation ? (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                    {result.module}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{result.action}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                  {result.summary}
                </p>

                {result.requiresConfirmation && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Action Confirmation Required:
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      {result.confirmationDetails?.impact || 'This action modifies live organization records.'}
                    </p>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => handleExecute(true)}
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                      >
                        Confirm & Execute
                      </button>
                      <button
                        onClick={() => setResult(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-medium border-b border-rose-100 dark:border-rose-900">
            {error}
          </div>
        )}

        {/* Suggested Prompts */}
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Suggested Autonomous Commands
          </p>
          <div className="space-y-1">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCommand(p);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between transition-colors group"
              >
                <span>{p}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono">ESC</kbd>
            <span>to close</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="font-semibold text-indigo-500">Google Gemini & NextDay Intent Router</span>
          </div>
        </div>
      </div>
    </div>
  );
}
