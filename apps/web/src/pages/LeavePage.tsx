import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Check,
  X,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { LeaveRequest } from '../types/index.js';
import { formatDate } from '../lib/utils.js';

export function LeavePage() {
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    daysCount: 1,
    reason: '',
  });

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/leave');
      setLeaves(res.leaves || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/leave', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          employeeId: user?.employeeId || 'EMP-2000',
        }),
      });
      setIsRequestModalOpen(false);
      setForm({
        leaveType: 'ANNUAL',
        startDate: '',
        endDate: '',
        daysCount: 1,
        reason: '',
      });
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || 'Leave request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewLeave = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await apiRequest(`/leave/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          reviewComment: `Reviewed and ${status.toLowerCase()} by manager`,
        }),
      });
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || 'Review failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Time Off & Leave Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Request PTO, track team coverage overlaps, and verify balances with the Leave Policy Agent.
          </p>
        </div>

        <Button onClick={() => setIsRequestModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Request Time Off
        </Button>
      </div>

      {/* PTO Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase">Annual Vacation</span>
            <CalendarDays className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">18.5 Days</p>
          <span className="text-[10px] text-slate-400">Accrues 1.75 days / month</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase">Sick & Medical</span>
            <CalendarDays className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">10.0 Days</p>
          <span className="text-[10px] text-slate-400">Available fully from Jan 1</span>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase">Floating Holidays</span>
            <CalendarDays className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">3.0 Days</p>
          <span className="text-[10px] text-slate-400">Personal & cultural observances</span>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Leave Applications & Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Leave Type</th>
                  <th className="px-4 py-2.5">Dates</th>
                  <th className="px-4 py-2.5">Days</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Manager Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Priya Sharma'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="purple" className="text-[10px]">
                          {l.leaveType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {formatDate(l.startDate)} - {formatDate(l.endDate)}
                      </td>
                      <td className="px-4 py-3 font-bold font-mono">{l.daysCount}d</td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{l.reason}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            l.status === 'APPROVED'
                              ? 'success'
                              : l.status === 'REJECTED'
                              ? 'danger'
                              : 'warning'
                          }
                          className="text-[10px]"
                        >
                          {l.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {l.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReviewLeave(l.id, 'APPROVED')}
                              className="px-2 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewLeave(l.id, 'REJECTED')}
                              className="px-2 py-1 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Request Leave */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Submit Time Off Request"
        description="Leave Policy Agent will verify your PTO balance and team concurrency limits"
      >
        <form onSubmit={handleRequestLeave} className="space-y-4">
          <Select
            label="Leave Type"
            value={form.leaveType}
            onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            required
          >
            <option value="ANNUAL">Annual Vacation</option>
            <option value="SICK">Sick & Medical Leave</option>
            <option value="CASUAL">Personal / Floating Holiday</option>
            <option value="PARENTAL">Parental Leave</option>
            <option value="UNPAID">Unpaid Leave of Absence</option>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </div>

          <Input
            label="Total Days Count"
            type="number"
            step="0.5"
            value={form.daysCount}
            onChange={(e) => setForm({ ...form, daysCount: Number(e.target.value) })}
            required
          />

          <Input
            label="Reason / Notes"
            placeholder="Family travel, personal wellness, etc."
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
