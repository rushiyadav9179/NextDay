import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Sparkles,
  Key,
  Webhook,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';

export function DeveloperGuidePage() {
  const [apiKey, setApiKey] = useState('ndk_a89f72b941029cde882194a0');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const curlExamples = [
    {
      title: 'List All Employees (with pagination)',
      endpoint: 'GET /api/v1/employees',
      curl: `curl -X GET "https://api.nextday.work/api/v1/employees?limit=25" \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Accept: application/json"`,
    },
    {
      title: 'Trigger Autonomous Agent via REST',
      endpoint: 'POST /api/v1/agents/inbound-talent/run',
      curl: `curl -X POST "https://api.nextday.work/api/v1/agents/inbound-talent/run" \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "params": {
      "resumeText": "Experienced engineer with 6+ years React, Node.js, and Postgres.",
      "jobTitle": "Senior Full Stack Architect"
    }
  }'`,
    },
    {
      title: 'Submit Candidate Application',
      endpoint: 'POST /api/v1/candidates',
      curl: `curl -X POST "https://api.nextday.work/api/v1/candidates" \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "Liam",
    "lastName": "Vanderbilt",
    "email": "liam.v@example.com",
    "currentTitle": "Staff Distributed Systems Engineer",
    "experienceYears": 6
  }'`,
    },
    {
      title: 'Query Custom Module Records (JSONB Storage)',
      endpoint: 'GET /api/v1/custom-modules/:moduleId/records',
      curl: `curl -X GET "https://api.nextday.work/api/v1/custom-modules/vaccination-tracker/records" \\
  -H "X-API-Key: ${apiKey}"`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Public Developer Platform & API Playground
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build enterprise extensions, integrate ATS workflows, and trigger autonomous agents programmatically.
          </p>
        </div>

        <a href="/api/docs" target="_blank" rel="noopener noreferrer">
          <Button variant="outline">
            Interactive Swagger Explorer <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </a>
      </div>

      {/* Key Simulator Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-indigo-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Active Playground API Key</p>
              <p className="text-[11px] text-slate-500">Test live requests against your organization tenant sandbox</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs w-full sm:w-64"
            />
          </div>
        </CardContent>
      </Card>

      {/* cURL Snippets Grid */}
      <div className="space-y-4">
        {curlExamples.map((ex, idx) => (
          <Card key={idx} className="overflow-hidden">
            <div className="p-3.5 px-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{ex.title}</h4>
                <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">{ex.endpoint}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(ex.curl, idx)}
                className="h-8 text-xs"
              >
                {copiedIndex === idx ? (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="w-3.5 h-3.5" /> Copy cURL
                  </span>
                )}
              </Button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed select-all">
              {ex.curl}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
