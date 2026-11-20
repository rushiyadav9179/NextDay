import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Briefcase, ArrowRight, CheckCircle2, ChevronRight, Upload } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Button } from '../components/ui/Button.js';
import { Card, CardContent } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';

export function PublicCareersPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentCompany: '',
    currentTitle: '',
    experienceYears: 4,
    resumeText: '',
  });

  useEffect(() => {
    apiRequest('/careers')
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setSubmitting(true);
    try {
      await apiRequest(`/careers/${selectedJob.id}/apply`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSuccessMsg(true);
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setSuccessMsg(false);
        setForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          currentCompany: '',
          currentTitle: '',
          experienceYears: 4,
          resumeText: '',
        });
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Application failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Careers at {data?.companyName || 'Acme Corporation'}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Build the Future of Enterprise Systems
        </h1>
        <p className="mt-3 text-sm text-slate-400 max-w-xl mx-auto">
          Explore open opportunities and join a team pushing the boundaries of autonomous software and distributed architectures.
        </p>
      </header>

      {/* Jobs List */}
      <div className="max-w-4xl mx-auto px-6 pb-20 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto" />
          </div>
        ) : (data?.jobs || []).length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            No open requisitions at the moment. Please check back soon!
          </div>
        ) : (
          data.jobs.map((job: any) => (
            <div
              key={job.id}
              className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800/80 hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">{job.title}</h3>
                  <Badge variant="purple" className="text-[10px]">
                    {job.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    {job.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {job.location}
                  </span>
                  {job.salaryMin && (
                    <span className="text-indigo-400 font-mono">
                      ${(job.salaryMin / 1000).toFixed(0)}k - ${(job.salaryMax / 1000).toFixed(0)}k
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>
              </div>

              <Button
                onClick={() => {
                  setSelectedJob(job);
                  setIsApplyModalOpen(true);
                }}
                className="shrink-0"
              >
                Apply Now <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title={`Apply for ${selectedJob?.title}`}
        description="Submit your application to the Acme Talent Acquisition team"
      >
        {successMsg ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Application Received!</h4>
            <p className="text-xs text-slate-500">
              Our Inbound Talent AI agent has screened your profile and notified the hiring manager.
            </p>
          </div>
        ) : (
          <form onSubmit={handleApply} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Current Title"
                placeholder="Senior Engineer"
                value={form.currentTitle}
                onChange={(e) => setForm({ ...form, currentTitle: e.target.value })}
              />
              <Input
                label="Years of Experience"
                type="number"
                value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Resume / Summary
              </label>
              <textarea
                rows={4}
                placeholder="Paste your resume or brief bio..."
                value={form.resumeText}
                onChange={(e) => setForm({ ...form, resumeText: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" type="button" onClick={() => setIsApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                Submit Application
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
