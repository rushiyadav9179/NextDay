import React, { useState, useEffect } from 'react';
import { Network, Sparkles, Users, Building, ShieldCheck, ChevronDown, User } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';

export function OrgChartPage() {
  const [chartData, setChartData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/employees/org-chart')
      .then((res) => setChartData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Find root leadership nodes (nodes without a manager or top manager)
  const rootNodes = chartData.nodes.filter((n) => !n.managerId || n.managerId === n.id).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Organizational Knowledge Graph
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hierarchical reporting structure and cross-functional graph edges synchronized by the OrgGraph Maintenance Agent.
          </p>
        </div>

        <Badge variant="purple" className="py-1 px-3">
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          Graph Health: 99.4%
        </Badge>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Executive Leadership Layer */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">
              Executive Leadership
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {rootNodes.map((exec) => (
                <div
                  key={exec.id}
                  className="w-64 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-500/80 shadow-lg text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base mx-auto mb-2 shadow-sm">
                    {exec.name[0]}
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{exec.name}</h4>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">{exec.title}</p>
                  <Badge variant="purple" className="mt-2 text-[10px]">
                    {exec.department}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Departmental Teams Grid */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">
              Departmental Hierarchy Nodes ({chartData.nodes.length} Nodes • {chartData.edges.length} Relationships)
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {chartData.nodes.slice(3, 19).map((emp) => (
                <div
                  key={emp.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 transition-all flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {emp.name[0]}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {emp.name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{emp.title}</p>
                    <span className="text-[9px] text-indigo-500 font-mono block mt-0.5">
                      {emp.department}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
