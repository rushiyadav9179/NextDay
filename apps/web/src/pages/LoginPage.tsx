import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('admin@nextday.work');
  const [password, setPassword] = useState('AdminPass123!');
  const [totpCode, setTotpCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, totpCode: totpCode || undefined }),
      });

      if (res.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      login(res.accessToken, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setRequires2FA(false);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">NextDay</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-200">Welcome to NextDay HR</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in with enterprise credentials or pick a demo role below</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Corporate Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-800 text-white"
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-800 text-white"
              />
            </div>

            {requires2FA && (
              <div className="animate-in fade-in">
                <Input
                  label="TOTP 2FA Security Code"
                  type="text"
                  placeholder="6-digit authenticator code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                  className="bg-slate-950/80 border-slate-800 text-white font-mono tracking-widest text-center text-lg"
                />
              </div>
            )}

            <Button type="submit" isLoading={loading} className="w-full h-10 text-xs font-semibold">
              {requires2FA ? 'Verify 2FA & Sign In' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Quick-Fill Demo Role Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Quick-Fill Demo Roles (One-Tap Test)
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => fillCredentials('admin@nextday.work', 'AdminPass123!')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors"
              >
                <span className="font-bold text-indigo-400 block">Super Admin</span>
                <span className="text-[10px] text-slate-400">admin@nextday.work</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('hr@nextday.work', 'Password123!')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors"
              >
                <span className="font-bold text-purple-400 block">HR Admin</span>
                <span className="text-[10px] text-slate-400">hr@nextday.work</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('recruiter@nextday.work', 'Password123!')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors"
              >
                <span className="font-bold text-sky-400 block">Recruiter</span>
                <span className="text-[10px] text-slate-400">recruiter@nextday.work</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('manager@nextday.work', 'Password123!')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors"
              >
                <span className="font-bold text-emerald-400 block">Manager</span>
                <span className="text-[10px] text-slate-400">manager@nextday.work</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('employee@nextday.work', 'Password123!')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors"
              >
                <span className="font-bold text-amber-400 block">Employee</span>
                <span className="text-[10px] text-slate-400">employee@nextday.work</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('candidate@nextday.work', 'Password123!')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors"
              >
                <span className="font-bold text-rose-400 block">Candidate</span>
                <span className="text-[10px] text-slate-400">candidate@nextday.work</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="text-center mt-6 text-xs text-slate-400">
          <span>Need a new organization? </span>
          <Link to="/register" className="text-indigo-400 font-semibold hover:underline">
            Register Tenant
          </Link>
        </div>
      </div>
    </div>
  );
}
