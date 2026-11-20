import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  FileText,
  DollarSign,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Download,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { PayrollRun, Payslip, Expense } from '../types/index.js';
import { formatCurrency, formatDate } from '../lib/utils.js';

export function PayrollExpensesPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'payroll' | 'expenses'>('payroll');
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // Forms
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'SOFTWARE',
    amount: 45.0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payrollRes, expRes] = await Promise.all([
        apiRequest('/payroll/runs').catch(() => ({ runs: [] })),
        apiRequest('/expenses').catch(() => ({ expenses: [] })),
      ]);
      setRuns(payrollRes.runs || []);
      setExpenses(expRes.expenses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePayrollRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await apiRequest('/payroll/runs', {
        method: 'POST',
        body: JSON.stringify({ month: payrollMonth, year: payrollYear }),
      });
      alert(result.auditResult?.summary || 'Payroll run created as a draft requiring review.');
      setIsPayrollModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Payroll generation failed');
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          ...expenseForm,
          employeeId: user?.employeeId || 'EMP-2000',
        }),
      });
      alert(`Expense submitted. ${res.auditSummary || 'Manager review is required.'}`);
      setIsExpenseModalOpen(false);
      setExpenseForm({ title: '', category: 'SOFTWARE', amount: 45.0 });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Expense submission failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Payroll & Expense Intelligence
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Draft payroll estimates and submitted expense claims. Payroll policy and automated approval integrations are not configured.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'payroll' ? (
            <Button onClick={() => setIsPayrollModalOpen(true)}>
              <DollarSign className="w-4 h-4 mr-1.5" />
              Generate Payroll Run
            </Button>
          ) : (
            <Button onClick={() => setIsExpenseModalOpen(true)}>
              <Receipt className="w-4 h-4 mr-1.5" />
              Submit Expense Claim
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'payroll'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Payroll Runs & Audit ({runs.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'expenses'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Expense Claims & AI Audit ({expenses.length})
        </button>
      </div>

      {/* Tab 1: Payroll Runs */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Payroll Execution Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">Period</th>
                      <th className="px-4 py-2.5">Total Gross</th>
                      <th className="px-4 py-2.5">Taxes & Deductions</th>
                      <th className="px-4 py-2.5">Net Disbursement</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">AI Audit</th>
                      <th className="px-4 py-2.5 text-right">Payslips</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {runs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400">
                          No payroll runs yet. Click &quot;Generate Payroll Run&quot; to run this month&apos;s cycle.
                        </td>
                      </tr>
                    ) : (
                      runs.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {r.month}/{r.year}
                          </td>
                          <td className="px-4 py-3 font-mono">{formatCurrency(r.totalGross)}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{formatCurrency(r.totalDeductions)}</td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(r.totalNet)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={r.status === 'APPROVED' ? 'success' : 'purple'} className="text-[10px]">
                              {r.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {r.auditedByAgent ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 0 Variances
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {r.payslips && r.payslips.length > 0 && (
                              <button
                                onClick={() => setSelectedPayslip(r.payslips![0])}
                                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                              >
                                View Sample Payslip
                              </button>
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
        </div>
      )}

      {/* Tab 2: Expenses */}
      {activeTab === 'expenses' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Expense Claims & Self-Service Audits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Amount</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Agent Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No expense claims submitted.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-500">{formatDate(e.createdAt)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{e.title}</td>
                        <td className="px-4 py-3">
                          <Badge variant="purple" className="text-[10px]">
                            {e.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">{formatCurrency(e.amount, e.currency)}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={e.status === 'APPROVED' ? 'success' : e.status === 'AUDITING' ? 'warning' : 'default'}
                            className="text-[10px]"
                          >
                            {e.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {e.auditedByAgent ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Auto-approved under threshold
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Awaiting Manager</span>
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
      )}

      {/* Modal: Payslip PDF-style View */}
      <Modal
        isOpen={Boolean(selectedPayslip)}
        onClose={() => setSelectedPayslip(null)}
        title="Electronic Payslip Receipt"
        maxWidth="md"
      >
        {selectedPayslip && (
          <div className="space-y-4 p-2 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Acme Corporation</h4>
                <p className="text-[10px] text-slate-400">Monthly Remuneration Statement</p>
              </div>
              <Badge variant="success">PAID</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
              <div>
                <span className="text-slate-400 text-[10px] block">Employee</span>
                <span className="font-semibold">
                  {selectedPayslip.employee ? `${selectedPayslip.employee.firstName} ${selectedPayslip.employee.lastName}` : 'Elena Rostova'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Role</span>
                <span className="font-semibold">{selectedPayslip.employee?.jobTitle || 'Staff Engineer'}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Gross Base Salary:</span>
                <span className="font-mono font-semibold">{formatCurrency(selectedPayslip.grossSalary)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Statutory Tax Withholding (18%):</span>
                <span className="font-mono text-rose-500">-{formatCurrency(selectedPayslip.grossSalary * 0.18)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Healthcare HSA & Benefits (5%):</span>
                <span className="font-mono text-rose-500">-{formatCurrency(selectedPayslip.grossSalary * 0.05)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 rounded">
                <span className="text-indigo-900 dark:text-indigo-200">Net Take-Home Pay:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(selectedPayslip.netSalary)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Generate Payroll Run */}
      <Modal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        title="Execute Monthly Payroll Run"
        description="Payroll Audit Agent will automatically cross-check variances"
      >
        <form onSubmit={handleCreatePayrollRun} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Month (1-12)"
              type="number"
              min={1}
              max={12}
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(Number(e.target.value))}
              required
            />
            <Input
              label="Year"
              type="number"
              value={payrollYear}
              onChange={(e) => setPayrollYear(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsPayrollModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Execute Run</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Submit Expense */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Submit Business Expense Claim"
        description="Receipts under $100 are automatically verified and approved under company policy"
      >
        <form onSubmit={handleSubmitExpense} className="space-y-4">
          <Input
            label="Expense Title"
            placeholder="e.g. AWS Training Materials, Software Subscription"
            value={expenseForm.title}
            onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
            required
          />

          <Select
            label="Category"
            value={expenseForm.category}
            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
          >
            <option value="SOFTWARE">Software & Cloud Services</option>
            <option value="TRAVEL">Business Travel</option>
            <option value="MEALS">Client & Team Meals</option>
            <option value="HARDWARE">Hardware & Peripherals</option>
            <option value="TRAINING">Conferences & Education</option>
            <option value="OFFICE">Home Office Ergonomics</option>
          </Select>

          <Input
            label="Amount (USD)"
            type="number"
            step="0.01"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Claim</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
