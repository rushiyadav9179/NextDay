import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Boxes,
  Plus,
  Trash2,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { apiRequest } from '../../lib/api.js';
import { Button } from '../ui/Button.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.js';
import { Badge } from '../ui/Badge.js';
import { Modal } from '../ui/Modal.js';
import { Input } from '../ui/Input.js';
import { Select } from '../ui/Select.js';
import { CustomModule } from '../../types/index.js';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

export function DynamicModuleRenderer() {
  const { slug } = useParams<{ slug: string }>();
  const [module, setModule] = useState<CustomModule | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const fetchModule = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/custom-modules/${slug}`);
      if (res.module) {
        setModule(res.module);
        setRecords(res.module.records || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModule();
  }, [slug]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!module) return;
    setSaving(true);
    try {
      await apiRequest(`/custom-modules/${module.id}/records`, {
        method: 'POST',
        body: JSON.stringify({ data: formData }),
      });
      setIsModalOpen(false);
      setFormData({});
      fetchModule();
    } catch (err: any) {
      alert(err.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await apiRequest(`/custom-modules/records/${id}`, { method: 'DELETE' });
      fetchModule();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-16">
        <Boxes className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold">Custom Module Not Found</h3>
        <p className="text-sm text-slate-500 mt-1">This module may not have been published yet.</p>
      </div>
    );
  }

  const spec = module.schemaSpec;
  const fields = spec.fields || [];
  const tableColumns = spec.tableColumns || fields.map((f) => f.name);
  const charts = spec.charts || [];

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {module.name}
            </h1>
            <Badge variant="purple">AI Generated Module</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {module.description || 'Dynamic module generated autonomously by NextDay Dev Agent.'}
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Record
        </Button>
      </div>

      {/* Render Dynamic Charts if configured */}
      {charts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {charts.map((chart, idx) => {
            // Compute aggregated count by field
            const counts: Record<string, number> = {};
            records.forEach((r) => {
              const val = String(r.data?.[chart.field] || 'Unknown');
              counts[val] = (counts[val] || 0) + 1;
            });
            const chartData = Object.entries(counts).map(([name, value]) => ({ name, value }));

            return (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">{chart.title}</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {chart.type === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {chartData.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    ) : (
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis allowDecimals={false} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dynamic Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Records ({records.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-800">
              <tr>
                {tableColumns.map((col) => {
                  const field = fields.find((f) => f.name === col);
                  return (
                    <th key={col} className="px-5 py-3">
                      {field?.label || col}
                    </th>
                  );
                })}
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length + 1} className="text-center py-12 text-slate-400">
                    No records added yet. Click &quot;Add Record&quot; to insert the first record.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {tableColumns.map((col) => {
                      const val = r.data?.[col];
                      const field = fields.find((f) => f.name === col);

                      if (field?.type === 'badge') {
                        return (
                          <td key={col} className="px-5 py-3 font-medium">
                            <Badge
                              variant={
                                val === 'VERIFIED' || val === 'GOOD'
                                  ? 'success'
                                  : val === 'PENDING_REVIEW'
                                  ? 'warning'
                                  : 'default'
                              }
                            >
                              {String(val || 'N/A')}
                            </Badge>
                          </td>
                        );
                      }

                      return (
                        <td key={col} className="px-5 py-3 text-slate-700 dark:text-slate-300 font-medium">
                          {String(val ?? '—')}
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dynamic Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Add Record to ${module.name}`}
      >
        <form onSubmit={handleCreateRecord} className="space-y-4">
          {fields.map((field) => {
            if (field.type === 'boolean') {
              return (
                <label key={field.name} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(formData[field.name])}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                    required={field.required}
                  />
                  {field.label}
                </label>
              );
            }
            if (field.type === 'select' || field.type === 'badge') {
              return (
                <Select
                  key={field.name}
                  label={field.label}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  required={field.required}
                >
                  <option value="">Select {field.label}...</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              );
            }

            return (
              <Input
                key={field.name}
                label={field.label}
                type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                value={formData[field.name] || ''}
                onChange={(e) => setFormData({ ...formData, [field.name]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })}
                required={field.required}
              />
            );
          })}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Save Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
