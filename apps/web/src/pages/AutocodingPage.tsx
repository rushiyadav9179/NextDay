import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Sparkles,
  Play,
  CheckCircle2,
  Code2,
  Eye,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';

export function AutocodingPage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('Add a vaccination tracking dashboard');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [specPreview, setSpecPreview] = useState<any>(null);
  const [publishedModules, setPublishedModules] = useState<any[]>([]);

  const fetchModules = async () => {
    try {
      const res = await apiRequest('/custom-modules');
      setPublishedModules(res.modules || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setSpecPreview(null);

    try {
      const res = await apiRequest('/custom-modules/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      setSpecPreview(res.spec);
    } catch (err: any) {
      alert(err.message || 'Dev Agent generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!specPreview) return;
    setPublishing(true);
    try {
      const res = await apiRequest('/custom-modules/publish', {
        method: 'POST',
        body: JSON.stringify(specPreview),
      });
      alert(`Module "${res.name}" successfully published! Added to sidebar navigation immediately.`);
      fetchModules();
      navigate(`/modules/${res.slug}`);
    } catch (err: any) {
      alert(err.message || 'Publishing failed');
    } finally {
      setPublishing(false);
    }
  };

  const sampleIdeas = [
    'Add a vaccination tracking dashboard',
    'Add equipment & asset registry',
    'Add professional certifications & license tracker',
    'Add employee wellness gym subsidy tracker',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Autocoding Dynamic Module Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Prompt Google Gemini to autonomously generate validated enterprise JSON ModuleSpecs and dynamic storage with zero redeployments.
          </p>
        </div>

        <Badge variant="purple" className="py-1 px-3">
          <Sparkles className="w-3.5 h-3.5 mr-1" />
          Zero Arbitrary Code Execution (Safe Spec Renderer)
        </Badge>
      </div>

      {/* Generation Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Boxes className="w-4 h-4 text-indigo-500" />
            <span>Generate New Custom Module via Dev Agent</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-3">
            <div className="flex gap-2.5">
              <input
                type="text"
                placeholder="e.g. Add a vaccination tracking dashboard..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button type="submit" isLoading={generating} className="h-10 text-xs px-5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Generate Spec
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 pt-1">
              <span className="text-[11px] font-semibold text-slate-500">Quick Prompts:</span>
              {sampleIdeas.map((idea, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(idea)}
                  className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 transition-colors"
                >
                  {idea}
                </button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Spec Preview and Publish Flow */}
      {specPreview && (
        <Card className="border-indigo-400/80 shadow-lg animate-in fade-in">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Generated Spec: {specPreview.name}</span>
                  <Badge variant="purple" className="text-[10px]">
                    slug: /{specPreview.slug}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">{specPreview.description}</p>
              </div>

              <Button onClick={handlePublish} isLoading={publishing} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve & Hot-Publish
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Fields summary */}
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Entity Fields ({specPreview.fields?.length || 0})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {specPreview.fields?.map((f: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">{f.label}</span>
                    <span className="font-mono text-[10px] text-indigo-500">{f.name} ({f.type})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON Schema Spec */}
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Raw Validated JSON Specification
              </p>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono max-h-52 overflow-y-auto">
                {JSON.stringify(specPreview, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Currently Published Custom Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Active Published Custom Modules ({publishedModules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publishedModules.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start justify-between"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{m.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                  <span className="text-[10px] font-mono text-indigo-500 mt-2 block">
                    Version {m.version} • /{m.slug}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/modules/${m.slug}`)}
                  className="shrink-0 text-xs"
                >
                  Open Module <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
