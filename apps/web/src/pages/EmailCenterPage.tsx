import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Sparkles,
  FileText,
  Users,
  Eye,
  CheckCircle2,
  Clock,
  Edit3,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { EmailTemplate } from '../types/index.js';

export function EmailCenterPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose State
  const [recipientEmail, setRecipientEmail] = useState('candidate.alex@example.com');
  const [recipientName, setRecipientName] = useState('Alex Rivera');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState('');
  const [sending, setSending] = useState(false);

  // AI Draft Modal State
  const [isAiDraftModalOpen, setIsAiDraftModalOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('Draft an enthusiastic offer letter for a Senior Software Engineer');
  const [aiTone, setAiTone] = useState('professional_warm');
  const [drafting, setDrafting] = useState(false);

  // Live Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchEmailData = async () => {
    setLoading(true);
    try {
      const [tplRes, logsRes] = await Promise.all([
        apiRequest('/emails/templates'),
        apiRequest('/emails/logs').catch(() => ({ logs: [] })),
      ]);
      setTemplates(tplRes.templates || []);
      setLogs(logsRes.logs || []);

      if (tplRes.templates?.length > 0 && !subject) {
        applyTemplate(tplRes.templates[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailData();
  }, []);

  const applyTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplateSlug(tpl.slug);
    // Replace variables with sample recipient context
    let s = tpl.subject
      .replace(/{{firstName}}/g, 'Alex')
      .replace(/{{jobTitle}}/g, 'Senior Distributed Systems Engineer')
      .replace(/{{companyName}}/g, 'Acme Corporation')
      .replace(/{{monthYear}}/g, 'November 2026');

    let b = tpl.bodyHtml
      .replace(/{{firstName}}/g, 'Alex')
      .replace(/{{jobTitle}}/g, 'Senior Distributed Systems Engineer')
      .replace(/{{managerName}}/g, 'Marcus Sterling')
      .replace(/{{startDate}}/g, 'December 1st, 2026')
      .replace(/{{salary}}/g, '175,000')
      .replace(/{{schedulingLink}}/g, 'Meeting details to be provided separately (video integration unavailable)')
      .replace(/{{dueDate}}/g, 'November 30, 2026');

    setSubject(s);
    setBodyHtml(b);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await apiRequest('/emails/send', {
        method: 'POST',
        body: JSON.stringify({
          to: recipientEmail,
          recipientName,
          subject,
          bodyHtml,
        }),
      });
      alert(res.message || 'Email dispatched!');
      fetchEmailData();
    } catch (err: any) {
      alert(err.message || 'Email dispatch failed');
    } finally {
      setSending(false);
    }
  };

  const handleAiDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrafting(true);
    try {
      const res = await apiRequest('/emails/ai-draft', {
        method: 'POST',
        body: JSON.stringify({
          instruction: aiInstruction,
          tone: aiTone,
        }),
      });

      if (res.subject) setSubject(res.subject);
      if (res.bodyHtml) setBodyHtml(res.bodyHtml);

      setIsAiDraftModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'AI Drafting failed');
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Enterprise Communications & Templates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dynamic Handlebars template library, AI email generation, and queued delivery logs.
          </p>
        </div>

        <Button variant="outline" onClick={() => setIsAiDraftModalOpen(true)}>
          <Sparkles className="w-4 h-4 text-indigo-500 mr-1.5" />
          AI Draft Email
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Template Selector */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Template Library ({templates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-[580px] overflow-y-auto p-3">
              {templates.map((tpl) => (
                <button
                  key={tpl.slug}
                  onClick={() => applyTemplate(tpl)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                    selectedTemplateSlug === tpl.slug
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="truncate mr-2">
                    <span className="block truncate font-semibold">{tpl.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">{tpl.category}</span>
                  </div>
                  <Badge variant="purple" className="text-[9px] py-0 px-1 shrink-0">
                    Use
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Columns: Compose & Live Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-500" />
                <span>Compose Message</span>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Preview
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSendEmail} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Recipient Email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                  />
                  <Input
                    label="Recipient Full Name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="Subject Line"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    HTML Email Body (Handlebars context variables supported)
                  </label>
                  <textarea
                    rows={8}
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-400">
                    Simulated mode active in dev (Nodemailer console delivery).
                  </span>
                  <Button type="submit" isLoading={sending}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Send Communication
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Email Delivery Audit Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Email Delivery Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2">Recipient</th>
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {logs.slice(0, 5).map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-medium">{log.recipientEmail}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300 truncate max-w-xs">{log.subject}</td>
                        <td className="px-3 py-2">
                          <Badge variant="success" className="text-[10px]">
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Live Preview */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Email Render Preview"
        maxWidth="lg"
      >
        <div className="space-y-3 font-sans">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs space-y-1">
            <p><strong className="text-slate-400">To:</strong> {recipientName} &lt;{recipientEmail}&gt;</p>
            <p><strong className="text-slate-400">Subject:</strong> {subject}</p>
          </div>
          <div
            className="p-5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-xs leading-relaxed space-y-2 prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>
      </Modal>

      {/* Modal: AI Draft Email */}
      <Modal
        isOpen={isAiDraftModalOpen}
        onClose={() => setIsAiDraftModalOpen(false)}
        title="AI Email Drafting Assistant"
        description="Gemini 2.0 Flash creates tailored enterprise correspondence"
      >
        <form onSubmit={handleAiDraft} className="space-y-4">
          <Input
            label="What would you like to email?"
            placeholder="e.g. Reject candidate politely, invite to technical interview, announce quarterly all-hands..."
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            required
          />

          <Select
            label="Tone of Voice"
            value={aiTone}
            onChange={(e) => setAiTone(e.target.value)}
          >
            <option value="professional_warm">Professional & Warm (Recommended)</option>
            <option value="formal_executive">Formal & Executive</option>
            <option value="encouraging_friendly">Encouraging & Startup Casual</option>
            <option value="direct_concise">Direct & Concise</option>
          </Select>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsAiDraftModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={drafting}>
              Generate Draft
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
