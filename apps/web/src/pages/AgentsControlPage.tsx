import React, { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  History,
  Shield,
  Layers,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { Agent } from '../types/index.js';

export function AgentsControlPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentParamsJson, setAgentParamsJson] = useState('{\n  "brief": "Senior backend distributed systems engineer"\n}');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentRes, runsRes] = await Promise.all([
        apiRequest('/agents'),
        apiRequest('/agents/runs').catch(() => ({ runs: [] })),
      ]);
      setAgents(agentRes.agents || []);
      setRuns(runsRes.runs || []);
      setLoadError(null);
    } catch (err) {
      setLoadError((err as Error)?.message || 'Agent data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setRunning(true);
    setRunResult(null);

    let parsedParams = {};
    try {
      parsedParams = JSON.parse(agentParamsJson);
    } catch {
      parsedParams = {};
    }

    try {
      const res = await apiRequest(`/agents/${selectedAgent.id}/run`, {
        method: 'POST',
        body: JSON.stringify({ params: parsedParams }),
      });
      setRunResult(res);
      fetchData();
    } catch (err: any) {
      setRunResult({ success: false, summary: err?.message || 'Agent failed' });
    } finally {
      setRunning(false);
    }
  };

  const categories = ['ALL', 'RECRUITING', 'ONBOARDING', 'WORKFORCE', 'FINANCE', 'COMPLIANCE', 'SYSTEM'];
  const [activeCat, setActiveCat] = useState('ALL');

  const filteredAgents = activeCat === 'ALL'
    ? agents
    : agents.filter((a) => a.category === activeCat);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Autonomous Agent Fleet Control Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registered HR agents. Execution mode reflects whether an AI provider is configured or deterministic mock mode is in use.
          </p>
        </div>

        <Badge variant="purple" className="py-1 px-3 text-xs">
          <Bot className="w-3.5 h-3.5 mr-1" />
          Fleet Status: {agents.length} Registered · {agents[0]?.executionMode || 'UNKNOWN'} Mode
        </Badge>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              activeCat === cat
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Agents Grid */}
      {loadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{loadError}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((ag) => (
          <Card key={ag.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
            <CardContent className="p-4 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{ag.name}</h4>
                  <Badge variant="purple" className="mt-1 text-[9px] py-0 px-1.5 font-mono">
                    {ag.category}
                  </Badge>
                </div>
                <Badge variant="info" className="text-[10px] py-0 px-1.5">
                  {ag.status}
                </Badge>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed line-clamp-3">
                {ag.description}
              </p>
            </CardContent>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">{ag.executionMode || 'UNKNOWN'} mode</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedAgent(ag);
                  setRunResult(null);
                }}
                className="text-xs py-1 px-2.5"
              >
                <Play className="w-3 h-3 mr-1 text-emerald-500" />
                Run Agent
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Execution Runs History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <span>Agent Execution Log & Audit Records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Agent Name</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Duration</th>
                  <th className="px-4 py-2.5">Executed At</th>
                  <th className="px-4 py-2.5">Log / Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No recent runs recorded. Click &quot;Run Agent&quot; above or run a zero-UI command.
                    </td>
                  </tr>
                ) : (
                  runs.slice(0, 10).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {r.agentName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={r.status === 'COMPLETED' ? 'success' : 'warning'} className="text-[10px]">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{r.durationMs == null ? '—' : `${r.durationMs}ms`}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(r.startedAt).toLocaleTimeString()}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 truncate max-w-sm">
                        {r.logs?.[1] || r.logs?.[0] || 'Executed successfully'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Manual Agent Execution */}
      <Modal
        isOpen={Boolean(selectedAgent)}
        onClose={() => setSelectedAgent(null)}
        title={`Trigger ${selectedAgent?.name}`}
        description="Provide custom JSON input parameters to run this agent against the organization database."
        maxWidth="lg"
      >
        <form onSubmit={handleRunAgent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Input Parameters (JSON)
            </label>
            <textarea
              rows={4}
              value={agentParamsJson}
              onChange={(e) => setAgentParamsJson(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          {runResult && (
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">Execution Output</span>
                <Badge variant={runResult.success ? 'success' : 'danger'}>
                  {runResult.success ? 'SUCCESS' : 'FAILED'}
                </Badge>
              </div>
              <p className="text-slate-700 dark:text-slate-300">{runResult.summary}</p>
              {runResult.data && (
                <pre className="p-2 bg-slate-100 dark:bg-slate-900 rounded text-[11px] font-mono overflow-x-auto max-h-40">
                  {JSON.stringify(runResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setSelectedAgent(null)}>
              Close
            </Button>
            <Button type="submit" isLoading={running}>
              <Play className="w-3.5 h-3.5 mr-1" />
              Execute Workflow
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
