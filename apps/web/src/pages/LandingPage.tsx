import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Bot, Zap, Shield, ChevronRight, Users, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button.js';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">NextDay</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400 font-medium">
            AI-Native HR Suite
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/careers" className="text-xs text-slate-400 hover:text-white transition-colors">
            Public Careers Portal
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-white hover:bg-slate-900">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-xs font-medium mb-8">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          <span>The Zero-UI Workday Alternative Driven by Autonomous AI Agents</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400">
          The Enterprise People Suite <br />
          Where AI Does The Work.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          NextDay replaces complex HR forms with conversational commands and 19 autonomous agents
          that screen resumes, resolve attendance anomalies, audit payroll, draft offers, and generate custom modules on demand.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/login">
            <Button size="lg" className="w-full sm:w-auto h-12 px-7 text-sm font-semibold shadow-lg shadow-indigo-600/30">
              Open Live Enterprise Demo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link to="/careers">
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-6 text-sm border-slate-800 text-slate-300 hover:bg-slate-900">
              Explore Candidate Portal
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400 mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Conversational Zero-UI</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Press Ctrl+K and ask: &quot;Show top backend candidates&quot; or &quot;Approve Priya&apos;s leave&quot;. The Intent Router executes the real action in seconds.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400 mb-4">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">19 Autonomous Agents</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Specialized LLM agents running on Gemini 2.0 Flash handle inbound talent, attendance anomalies, expense auditing, and cashflow projections.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Autocoding Custom Modules</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Need a Vaccination Tracker or Asset Registry? Type a one-line prompt. The Dev Agent generates schemas, forms, and charts hot-added with zero redeploys.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        <p>© 2026 NextDay HR Technologies Inc. Multi-tenant Enterprise Architecture with Postgres RLS & Google Gemini.</p>
      </footer>
    </div>
  );
}
