import React, { useState, useEffect } from 'react';
import {
  Compass,
  CheckCircle,
  Clock,
  FileCheck,
  Send,
  Bot,
  Sparkles,
  Shield,
  FileText,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';
import { OnboardingPlan } from '../types/index.js';

export function OnboardingPage() {
  const [plans, setPlans] = useState<OnboardingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<OnboardingPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // E-Sign Modal
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signDocTitle, setSignDocTitle] = useState('Employee Confidentiality & IP Agreement');

  // Concierge Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([
    {
      sender: 'agent',
      text: "Hello! I am your NextDay Onboarding Concierge. I can answer questions about corporate benefits, hardware setup, and company policies, or auto-complete eligible checklist tasks for you. How can I help today?",
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/onboarding/plans');
      setPlans(res.plans || []);
      if (res.plans?.length > 0) {
        setSelectedPlan(res.plans[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await apiRequest(`/onboarding/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleSignDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/onboarding/sign-document', {
        method: 'POST',
        body: JSON.stringify({
          documentTitle: signDocTitle,
          type: 'NDA',
          employeeId: selectedPlan?.employee?.id,
        }),
      });
      alert('Internal acknowledgement recorded. This is not a legally binding e-signature.');
      setIsSignModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Signature failed');
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const query = chatInput;
    setChatMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await apiRequest('/onboarding/concierge-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: query,
          employeeId: selectedPlan?.employee?.id,
        }),
      });

      setChatMessages((prev) => [
        ...prev,
        { sender: 'agent', text: res.reply || 'Request noted and processed.' },
      ]);
      fetchPlans();
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'agent', text: 'Sorry, I encountered an error processing your query.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Onboarding Hub & Concierge
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track employee checklists, complete electronic acknowledgments, and chat with the AI Onboarding Concierge.
          </p>
        </div>

        <Button variant="outline" onClick={() => setIsSignModalOpen(true)}>
          <FileCheck className="w-4 h-4 text-emerald-500 mr-1.5" />
          E-Sign Compliance Document
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Onboarding Plan & Task Checklist */}
        <div className="lg:col-span-2 space-y-5">
          {selectedPlan ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="text-base font-bold">
                    {selectedPlan.title}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Assigned to {selectedPlan.employee?.firstName} {selectedPlan.employee?.lastName} ({selectedPlan.employee?.jobTitle})
                  </p>
                </div>
                <Badge variant={selectedPlan.progress === 100 ? 'success' : 'purple'}>
                  {selectedPlan.progress}% Complete
                </Badge>
              </CardHeader>

              {/* Progress Bar */}
              <div className="px-5 pb-4">
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${selectedPlan.progress}%` }}
                  />
                </div>
              </div>

              {/* Checklist items */}
              <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {selectedPlan.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id, task.status)}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {task.status === 'COMPLETED' && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            task.status === 'COMPLETED'
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {task.title}
                        </p>
                        <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                          {task.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {task.autoCompletable && (
                        <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded font-medium">
                          Auto-completable
                        </span>
                      )}
                      <Badge variant={task.status === 'COMPLETED' ? 'success' : 'default'} className="text-[10px]">
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-slate-400 text-xs">
              No active onboarding plans found.
            </Card>
          )}
        </div>

        {/* Right: Onboarding Concierge Agent Chat Widget */}
        <div className="lg:col-span-1">
          <Card className="flex flex-col h-[520px]">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-xs font-bold">Onboarding Concierge</CardTitle>
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Autonomous Assistant
                  </span>
                </div>
              </div>
            </CardHeader>

            {/* Chat Body */}
            <CardContent className="flex-1 p-3 overflow-y-auto space-y-2.5">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 animate-pulse flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                    <span>Agent is thinking...</span>
                  </div>
                </div>
              )}
            </CardContent>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-2.5 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Ask onboarding question or 'I finished IT setup'..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Button size="sm" type="submit" disabled={chatLoading}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Modal: E-Sign Compliance Document */}
      <Modal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        title="Electronic Document Acknowledgment"
        description="Record an internal acknowledgement. This is not a legally binding e-signature."
      >
        <form onSubmit={handleSignDoc} className="space-y-4">
          <Input
            label="Document Title"
            value={signDocTitle}
            onChange={(e) => setSignDocTitle(e.target.value)}
            required
          />

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-40 overflow-y-auto">
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              STANDARD PROPRIETARY INFORMATION AND INVENTIONS AGREEMENT:
            </p>
            <p>
              By submitting this form, you record that you received this document. This creates an internal audit reference only; it does not capture legal consent, verify a document, or provide a third-party e-signature.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsSignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Record Acknowledgement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
