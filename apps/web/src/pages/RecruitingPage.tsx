import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Upload,
  Calendar,
  Sparkles,
  ArrowRight,
  Briefcase,
  Star,
  CheckCircle,
  FileText,
  Clock,
  Filter,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Candidate, JobOpening } from '../types/index.js';

const STAGES = ['SOURCED', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];

export function RecruitingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSemanticModalOpen, setIsSemanticModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Forms state
  const [candidateForm, setCandidateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentCompany: '',
    currentTitle: '',
    experienceYears: 4,
    resumeText: '',
    jobOpeningId: '',
  });

  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);

  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTitle, setInterviewTitle] = useState('Technical Systems Interview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [candRes, jobRes] = await Promise.all([
        apiRequest('/candidates'),
        apiRequest('/jobs'),
      ]);
      setCandidates(candRes.candidates || []);
      setJobs(jobRes.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStageChange = async (candidateId: string, newStage: string) => {
    try {
      const result = await apiRequest(`/candidates/${candidateId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: newStage }),
      });
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, stage: newStage as any } : c))
      );
      if (newStage === 'HIRED') {
        alert(result.employeeCreated
          ? 'Candidate hired and added to the employee directory with onboarding status.'
          : 'Candidate marked as hired. An employee profile already exists.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update stage');
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/candidates', {
        method: 'POST',
        body: JSON.stringify({ ...candidateForm, jobOpeningId: candidateForm.jobOpeningId || undefined }),
      });
      setIsAddModalOpen(false);
      setCandidateForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        currentCompany: '',
        currentTitle: '',
        experienceYears: 4,
        resumeText: '',
        jobOpeningId: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create candidate');
    }
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semanticQuery.trim()) return;
    setSemanticLoading(true);
    try {
      const res = await apiRequest('/candidates/semantic-search', {
        method: 'POST',
        body: JSON.stringify({ query: semanticQuery }),
      });
      setSemanticResults(res.results || []);
    } catch (err: any) {
      alert(err.message || 'Semantic search failed');
    } finally {
      setSemanticLoading(false);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !interviewDate) return;
    if (!jobs[0]?.id) {
      alert('Create an open job before scheduling an interview.');
      return;
    }
    try {
      await apiRequest('/candidates/interviews', {
        method: 'POST',
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          jobOpeningId: jobs[0].id,
          scheduledAt: interviewDate,
          title: interviewTitle,
        }),
      });
      alert('Interview scheduled. Video meeting and calendar invitations are not configured.');
      setIsInterviewModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule interview');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Talent Acquisition & ATS Pipeline
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kanban workflow with automatic AI resume ranking, semantic matching, and interview coordination.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={() => setIsSemanticModalOpen(true)}>
            <Sparkles className="w-4 h-4 text-indigo-500 mr-1.5" />
            Semantic Search
          </Button>

          <Button onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Kanban Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageCandidates = candidates.filter((c) => c.stage === stage);

          return (
            <div
              key={stage}
              className="w-72 shrink-0 bg-slate-100/70 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {stage}
                </span>
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {stageCandidates.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                {stageCandidates.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-lg text-slate-400 text-xs">
                    No candidates
                  </div>
                ) : (
                  stageCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="p-3.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {cand.firstName} {cand.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[150px]">
                            {cand.currentTitle || 'Applicant'}
                          </p>
                        </div>
                        {cand.aiScore && (
                          <Badge
                            variant={cand.aiScore >= 85 ? 'success' : 'purple'}
                            className="text-[10px] py-0 px-1.5 font-mono"
                          >
                            AI {cand.aiScore}%
                          </Badge>
                        )}
                      </div>

                      {cand.currentCompany && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span>{cand.currentCompany}</span>
                          <span>• {cand.experienceYears}y exp</span>
                        </p>
                      )}

                      {/* Skills Tags */}
                      {cand.skills && cand.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {cand.skills.slice(0, 3).map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Card Actions */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        <button
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setIsInterviewModalOpen(true);
                          }}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline"
                        >
                          <Calendar className="w-3 h-3" /> Schedule
                        </button>

                        {/* Move stage selector */}
                        <select
                          value={cand.stage}
                          onChange={(e) => handleStageChange(cand.id, e.target.value)}
                          className="text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-slate-700 dark:text-slate-300"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              → {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Semantic Candidate Search (pgvector) */}
      <Modal
        isOpen={isSemanticModalOpen}
        onClose={() => setIsSemanticModalOpen(false)}
        title="Semantic Candidate Matcher (pgvector)"
        description="Search talent pool using conversational natural language descriptions of ideal candidates"
        maxWidth="xl"
      >
        <form onSubmit={handleSemanticSearch} className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Distributed backend engineer with strong Redis, Kafka, and high concurrency experience..."
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
              required
            />
            <Button type="submit" isLoading={semanticLoading}>
              Match
            </Button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {semanticResults.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {item.candidate.firstName} {item.candidate.lastName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {item.candidate.currentTitle} at {item.candidate.currentCompany || 'Software Company'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-sm">
                    Skills: {item.candidate.skills?.join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="success" className="text-xs">
                    {item.similarityScore}% Match
                  </Badge>
                  <span className="block text-[10px] text-slate-400 mt-1 uppercase font-mono">
                    {item.candidate.stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      {/* Modal: Add Candidate & AI Resume Parsing */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Candidate & AI Parsing"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCandidate} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={candidateForm.firstName}
              onChange={(e) => setCandidateForm({ ...candidateForm, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={candidateForm.lastName}
              onChange={(e) => setCandidateForm({ ...candidateForm, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              value={candidateForm.email}
              onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={candidateForm.phone}
              onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Current Title"
              placeholder="Senior Backend Engineer"
              value={candidateForm.currentTitle}
              onChange={(e) => setCandidateForm({ ...candidateForm, currentTitle: e.target.value })}
            />
            <Input
              label="Current Company"
              placeholder="e.g. Stripe, AWS"
              value={candidateForm.currentCompany}
              onChange={(e) => setCandidateForm({ ...candidateForm, currentCompany: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Resume Text (Inbound Talent Agent will parse skills & calculate AI fit score)
            </label>
            <textarea
              rows={4}
              placeholder="Paste plain text resume or work history summary..."
              value={candidateForm.resumeText}
              onChange={(e) => setCandidateForm({ ...candidateForm, resumeText: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Candidate & Score</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Schedule Interview */}
      <Modal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        title={`Schedule Interview: ${selectedCandidate?.firstName} ${selectedCandidate?.lastName}`}
      >
        <form onSubmit={handleScheduleInterview} className="space-y-4">
          <Input
            label="Interview Title"
            value={interviewTitle}
            onChange={(e) => setInterviewTitle(e.target.value)}
            required
          />

          <Input
            label="Date & Time"
            type="datetime-local"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
            required
          />

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            The interview will be recorded in the pipeline. Video meeting and calendar invitation integrations are not configured.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsInterviewModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Schedule & Generate Link</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
