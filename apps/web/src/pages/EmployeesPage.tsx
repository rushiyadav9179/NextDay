import React, { useState, useEffect } from 'react';
import { Users, Search, Mail, Phone, Briefcase, Building, ChevronRight, UserCheck } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { Employee } from '../types/index.js';
import { formatCurrency, formatDate } from '../lib/utils.js';

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/employees${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setEmployees(res.employees || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  const openProfile = async (id: string) => {
    try {
      const res = await apiRequest(`/employees/${id}`);
      setSelectedEmp(res.employee);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Workforce Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global employee directory, compensation profiles, and organizational structures.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by name, role, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <Card
              key={emp.id}
              onClick={() => openProfile(emp.id)}
              className="hover:shadow-md cursor-pointer transition-all hover:border-indigo-400/50"
            >
              <CardContent className="p-4 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                  {emp.firstName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <Badge
                      variant={
                        emp.status === 'ACTIVE'
                          ? 'success'
                          : emp.status === 'ONBOARDING'
                          ? 'purple'
                          : 'default'
                      }
                      className="text-[10px] py-0 px-1.5"
                    >
                      {emp.status}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{emp.jobTitle}</p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span className="truncate">{emp.department?.name || 'General Operations'}</span>
                    <span className="font-mono">{emp.employeeId}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Employee Profile Modal */}
      <Modal
        isOpen={Boolean(selectedEmp)}
        onClose={() => setSelectedEmp(null)}
        title="Employee Master Record"
        maxWidth="lg"
      >
        {selectedEmp && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                {selectedEmp.firstName[0]}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {selectedEmp.firstName} {selectedEmp.lastName}
                </h3>
                <p className="text-xs text-slate-500">{selectedEmp.jobTitle}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="purple">{selectedEmp.department?.name || 'Department'}</Badge>
                  <Badge variant="success">{selectedEmp.status}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Email</span>
                <span className="font-medium">{selectedEmp.email}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Employee ID</span>
                <span className="font-mono font-medium">{selectedEmp.employeeId}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Base Salary</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedEmp.salary)} / yr
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Hire Date</span>
                <span className="font-medium">{formatDate(selectedEmp.joinDate)}</span>
              </div>
            </div>

            {selectedEmp.skills && selectedEmp.skills.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">
                  Verified Technical Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmp.skills.map((s: string, idx: number) => (
                    <Badge key={idx} variant="default" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
