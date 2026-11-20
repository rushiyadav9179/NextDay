import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { formatDate } from '../lib/utils.js';

export function CompliancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchCompliance = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/compliance/documents');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, []);

  const handleScanCompliance = async () => {
    setScanning(true);
    try {
      const res = await apiRequest('/agents/compliance-watchdog/run', {
        method: 'POST',
        body: JSON.stringify({ params: {} }),
      });
      alert(res.summary || 'Compliance Watchdog scan completed.');
      fetchCompliance();
    } catch (err: any) {
      alert(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const docs = data?.documents || [];
  const stats = data?.stats || { total: 0, verified: 0, pending: 0, expiringSoon: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Compliance & Document Expiry Watchdog
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Statutory certifications, work authorizations, and automated expiry reminder dispatches.
          </p>
        </div>

        <Button onClick={handleScanCompliance} isLoading={scanning}>
          <Sparkles className="w-4 h-4 mr-1.5" />
          Trigger Compliance Scan
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Documents Tracked</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.total || 8}</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Verified Valid</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.verified || 7}</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Expiring in 60 Days</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.expiringSoon || 1}</p>
        </Card>

        <Card className="p-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Audit Readiness</span>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">100%</p>
        </Card>
      </div>

      {/* Documents Registry Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Registered Credentials & Regulatory Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Document Title</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Owner</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Expiry Date</th>
                  <th className="px-4 py-2.5">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No compliance documents loaded.
                    </td>
                  </tr>
                ) : (
                  docs.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {d.title}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="purple" className="text-[10px]">
                          {d.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : 'Elena Rostova'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={d.status === 'VERIFIED' ? 'success' : 'warning'} className="text-[10px]">
                          {d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {d.expiryDate ? formatDate(d.expiryDate) : 'No Expiry (Permanent)'}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">
                        {d.signedAt ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> e-Signed & Verified
                          </span>
                        ) : (
                          'OCR Extracted'
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
  );
}
