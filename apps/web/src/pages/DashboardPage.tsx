import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Clock,
  TrendingDown,
  CheckCircle2,
  Compass,
  Sparkles,
  Bot,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { apiRequest } from '../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { formatCurrency } from '../lib/utils.js';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

export function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest('/dashboard')
      .then((res) => setData(res))
      .catch((err) => setLoadError(err?.message || 'Dashboard data could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (loadError || !data) {
    return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{loadError || 'Dashboard data is unavailable.'}</div>;
  }

  const kpis = data.kpis;

  const charts = data?.charts || {};

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            People Operations Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Current workforce records, hiring pipeline, and recent agent activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1.5 py-1 px-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            19 Agents Registered
          </Badge>
        </div>
      </div>

      {/* 6 Core KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Headcount</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.totalEmployees}</p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">Active: {kpis.activeEmployees}</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Open Roles</span>
              <Briefcase className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.openRoles}</p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">Open requisitions</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Time-to-Hire</span>
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.timeToHireDays == null ? '—' : `${kpis.timeToHireDays}d`}</p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">No hiring duration metric configured</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Attrition</span>
              <TrendingDown className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpis.attritionRate ?? '—'}</p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">No verified attrition metric configured</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Approvals</span>
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{kpis.pendingApprovals}</p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">Leave & anomalies</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Onboarding</span>
              <Compass className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{kpis.onboardingProgress == null ? '—' : `${kpis.onboardingProgress}%`}</p>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">Average plan progress</span>
          </CardContent>
        </Card>
      </div>

      {/* Recharts Analytics Grid (2x2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Candidate Hiring Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span>Hiring Pipeline Velocity</span>
              <span className="text-xs font-normal text-slate-400">Candidate Stage Conversion</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.hiringFunnel || []}>
                <XAxis dataKey="stage" fontSize={10} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={10} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. Headcount by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span>Workforce Distribution</span>
              <span className="text-xs font-normal text-slate-400">Headcount by Department</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.headcountByDept || []}
                  dataKey="count"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ department, count }) => `${department} (${count})`}
                >
                  {(charts.headcountByDept || []).map((_: any, idx: number) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. Attendance Trend (Last 7 Days) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span>Attendance & Presence Trend</span>
              <span className="text-xs font-normal text-slate-400">Weekly Shift Regularity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.attendanceTrend || []}>
                <XAxis dataKey="day" fontSize={11} tickLine={false} />
                <YAxis fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="present" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="late" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 4. Payroll Cost Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span>Payroll Cost Evolution</span>
              <span className="text-xs font-normal text-slate-400">Monthly Workforce Investment</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.payrollTrend || []}>
                <XAxis dataKey="month" fontSize={11} tickLine={false} />
                <YAxis
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Payroll Total']} />
                <Line type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights & Real-time Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* AI Strategic Insights Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>AI Strategic Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.aiInsights.length === 0 && <p className="text-center py-6 text-slate-400 text-xs">No upcoming document expirations.</p>}
            {(data?.aiInsights || []).map((insight: any) => (
              <div
                key={insight.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{insight.title}</span>
                  <Badge variant={insight.type === 'SUCCESS' ? 'success' : insight.type === 'WARNING' ? 'warning' : 'info'}>
                    {insight.type}
                  </Badge>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{insight.message}</p>
                <span className="text-[10px] text-slate-400 mt-2 block font-mono">{insight.timestamp}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live Organization Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-500" />
                <span>Live Autonomous Agent Log</span>
              </div>
              <span className="text-xs font-normal text-slate-400">Recent AI audit activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {(data?.activityFeed || []).length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">No recent agent actions logged yet.</p>
              ) : (
                data.activityFeed.map((item: any) => (
                  <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{item.agentName}</span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 truncate max-w-md">
                        {item.summary}
                      </p>
                    </div>
                    <Badge variant={item.status === 'SUCCESS' ? 'success' : 'warning'}>
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
