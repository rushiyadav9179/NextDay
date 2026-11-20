import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Key,
  Webhook,
  Shield,
  FileCode,
  CheckCircle,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { formatDate } from '../lib/utils.js';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'keys' | 'webhooks' | 'audit'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Key Modal
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [newPlainKey, setNewPlainKey] = useState<string | null>(null);

  // New Webhook Modal
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uRes, kRes, wRes, aRes] = await Promise.all([
        apiRequest('/admin/users').catch(() => ({ users: [] })),
        apiRequest('/admin/api-keys').catch(() => ({ keys: [] })),
        apiRequest('/admin/webhooks').catch(() => ({ webhooks: [] })),
        apiRequest('/agents/audit-trail').catch(() => ({ trails: [] })),
      ]);
      setUsers(uRes.users || []);
      setKeys(kRes.keys || []);
      setWebhooks(wRes.webhooks || []);
      setAuditLogs(aRes.trails || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/admin/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: keyName, scopes: ['*'] }),
      });
      setNewPlainKey(res.secretKey);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to create API key');
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm('Revoke this API Key? Any integrations using it will immediately lose access.')) return;
    try {
      await apiRequest(`/admin/api-keys/${keyId}`, { method: 'DELETE' });
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Revoke failed');
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/webhooks', {
        method: 'POST',
        body: JSON.stringify({ url: webhookUrl, events: ['*'] }),
      });
      setIsWebhookModalOpen(false);
      setWebhookUrl('');
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to register webhook');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tenant Administration & Security Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            RBAC role governance, developer API credentials, signed webhook destinations, and immutable audit logs.
          </p>
        </div>

        <a href="/api/docs" target="_blank" rel="noopener noreferrer">
          <Button variant="outline">
            <FileCode className="w-4 h-4 mr-1.5 text-indigo-500" />
            Swagger API Docs
            <ExternalLink className="w-3.5 h-3.5 ml-1 text-slate-400" />
          </Button>
        </a>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-semibold transition-all ${
            activeTab === 'users'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Users & RBAC ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('keys')}
          className={`pb-3 text-sm font-semibold transition-all ${
            activeTab === 'keys'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Developer API Keys ({keys.length})
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 text-sm font-semibold transition-all ${
            activeTab === 'webhooks'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          HMAC Webhooks ({webhooks.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-semibold transition-all ${
            activeTab === 'audit'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Immutable Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Users */}
      {activeTab === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">User Directory & Role Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">User</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">2FA</th>
                    <th className="px-4 py-2.5">Account Status</th>
                    <th className="px-4 py-2.5 text-right">Assign Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : 'System User'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="purple" className="text-[10px]">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.twoFactorEnabled ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5" /> Enabled
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Disabled</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success" className="text-[10px]">
                          ACTIVE
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200"
                        >
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="HR_ADMIN">HR_ADMIN</option>
                          <option value="RECRUITER">RECRUITER</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="EMPLOYEE">EMPLOYEE</option>
                          <option value="CANDIDATE">CANDIDATE</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: API Keys */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsKeyModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create API Key
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Active Developer Integration API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Key Prefix</th>
                      <th className="px-4 py-2.5">Scopes</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Expires</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {keys.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400">
                          No API keys generated yet. Click &quot;Create API Key&quot; to integrate.
                        </td>
                      </tr>
                    ) : (
                      keys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{k.name}</td>
                          <td className="px-4 py-3 font-mono text-indigo-500">{k.prefix}••••••••</td>
                          <td className="px-4 py-3">
                            <Badge variant="purple" className="text-[10px]">
                              {k.scopes?.join(', ') || '*'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={k.revoked ? 'danger' : 'success'} className="text-[10px]">
                              {k.revoked ? 'REVOKED' : 'ACTIVE'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400">{formatDate(k.expiresAt)}</td>
                          <td className="px-4 py-3 text-right">
                            {!k.revoked && (
                              <button
                                onClick={() => handleRevokeApiKey(k.id)}
                                className="text-xs text-rose-600 hover:underline"
                              >
                                Revoke
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

      {/* Tab 3: Webhooks */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsWebhookModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Register Webhook
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Configured HMAC-SHA256 Webhook Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">Destination URL</th>
                      <th className="px-4 py-2.5">Events</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {webhooks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">
                          No webhook subscriptions found.
                        </td>
                      </tr>
                    ) : (
                      webhooks.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono text-slate-900 dark:text-slate-100">{w.url}</td>
                          <td className="px-4 py-3">
                            <Badge variant="purple" className="text-[10px]">
                              {w.events?.join(', ') || '*'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="success" className="text-[10px]">
                              ACTIVE
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{formatDate(w.createdAt)}</td>
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

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Security & AI Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Origin / Agent</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Action / Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.slice(0, 15).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {log.agentName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="purple" className="text-[9px]">
                          {log.triggerType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={log.status === 'SUCCESS' ? 'success' : 'warning'} className="text-[9px]">
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px] truncate max-w-sm">
                        {log.promptInput}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal: Create API Key */}
      <Modal
        isOpen={isKeyModalOpen}
        onClose={() => {
          setIsKeyModalOpen(false);
          setNewPlainKey(null);
        }}
        title="Generate Scoped API Key"
        description="Keys are hashed using SHA-256 before database storage."
      >
        {newPlainKey ? (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs">
              <span className="font-bold block mb-1">API Key Generated Successfully:</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                Copy this key now. You will not be able to retrieve it again.
              </p>
              <pre className="p-2.5 bg-slate-950 text-emerald-400 font-mono text-xs rounded select-all break-all">
                {newPlainKey}
              </pre>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => {
                  setIsKeyModalOpen(false);
                  setNewPlainKey(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateApiKey} className="space-y-4">
            <Input
              label="Key Description / Identifier"
              placeholder="e.g. Workday Sync Pipeline, Greenhouse Ingest"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" type="button" onClick={() => setIsKeyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Generate Secret Key</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Register Webhook */}
      <Modal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        title="Register Webhook Endpoint"
        description="Payloads are delivered via BullMQ with HMAC-SHA256 signature headers."
      >
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <Input
            label="HTTPS Target URL"
            type="url"
            placeholder="https://api.yourcompany.com/webhooks/nextday"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsWebhookModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Register Webhook</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
