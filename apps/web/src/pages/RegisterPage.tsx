import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Building, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [tenantName, setTenantName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ tenantName, firstName, lastName, email, password }),
      });

      login(res.accessToken, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">NextDay</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-200">Create an Enterprise Organization</h2>
          <p className="text-xs text-slate-400 mt-1">Multi-tenant isolated workspace with automatic Postgres RLS</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Company / Organization Name"
              type="text"
              placeholder="e.g. Apex Technologies"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
              className="bg-slate-950/80 border-slate-800 text-white"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                type="text"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-800 text-white"
              />
              <Input
                label="Last Name"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="bg-slate-950/80 border-slate-800 text-white"
              />
            </div>

            <Input
              label="Work Email"
              type="email"
              placeholder="jane.doe@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-950/80 border-slate-800 text-white"
            />

            <Input
              label="Password (min 8 characters)"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="bg-slate-950/80 border-slate-800 text-white"
            />

            <Button type="submit" isLoading={loading} className="w-full h-10 text-xs font-semibold">
              Create Enterprise Tenant & Account
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          <span>Already have an account? </span>
          <Link to="/login" className="text-indigo-400 font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
