import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  ShieldAlert,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Attendance } from '../types/index.js';
import { formatDate, formatDateTime } from '../lib/utils.js';

export function AttendancePage() {
  const { user } = useAuthStore();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punching, setPunching] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Request browser geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // Fallback location for demo
          setCoords({ lat: 37.7749, lng: -122.4194 });
        }
      );
    }
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/attendance');
      setAttendances(res.attendances || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handlePunch = async (type: 'IN' | 'OUT') => {
    setPunching(true);
    try {
      await apiRequest('/attendance/punch', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: user?.employeeId || 'EMP-2000',
          type,
          latitude: coords?.lat,
          longitude: coords?.lng,
          deviceMeta: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
        }),
      });
      fetchAttendance();
    } catch (err: any) {
      alert(err.message || 'Punch failed');
    } finally {
      setPunching(false);
    }
  };

  const handleResolveAnomaly = async (attendanceId: string) => {
    try {
      await apiRequest(`/attendance/anomalies/${attendanceId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          resolutionNotes: 'Manager confirmed standard 8-hour shift resolution.',
          standardShiftHours: 8.0,
        }),
      });
      alert('Anomaly resolved and standard hours applied!');
      fetchAttendance();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve anomaly');
    }
  };

  const anomalies = attendances.filter((a) => a.anomalyFlags.length > 0 && !a.agentReviewed);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Time & Attendance Gateway
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time live punch with GPS telemetry and autonomous attendance anomaly detection.
          </p>
        </div>

        {coords && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            <span>GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
          </div>
        )}
      </div>

      {/* Anomaly Alert Banner (if pending) */}
      {anomalies.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  {anomalies.length} Attendance Anomaly Flagged by AI Agent
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                  The Anomaly Resolution Agent flagged missing punch-outs or late arrivals. Standard 8.0h shift can be verified with one-tap.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handleResolveAnomaly(anomalies[0].id)}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              One-Tap Approve Resolution
            </Button>
          </div>
        </div>
      )}

      {/* Live Punch Clock Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-indigo-200 dark:border-indigo-900/60 shadow-lg shadow-indigo-500/5">
          <CardHeader>
            <CardTitle className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Live Punch Terminal
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-4">
            <div className="font-mono text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-wider">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <p className="text-xs text-slate-400 mt-1">{formatDate(currentTime)}</p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button
                onClick={() => handlePunch('IN')}
                isLoading={punching}
                className="bg-emerald-600 hover:bg-emerald-700 h-11 text-xs font-bold"
              >
                <Play className="w-4 h-4 mr-1.5" />
                Punch IN
              </Button>

              <Button
                onClick={() => handlePunch('OUT')}
                isLoading={punching}
                variant="outline"
                className="border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-11 text-xs font-bold"
              >
                <Square className="w-4 h-4 mr-1.5" />
                Punch OUT
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timesheet Summary Table */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Recent Shifts & Punches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Employee</th>
                    <th className="px-4 py-2.5">Punch In</th>
                    <th className="px-4 py-2.5">Punch Out</th>
                    <th className="px-4 py-2.5">Hours</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendances.slice(0, 8).map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium">{formatDate(att.date)}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {att.employee ? `${att.employee.firstName} ${att.employee.lastName}` : 'Elena Rostova'}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                        {att.punchIn ? new Date(att.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {att.punchOut ? new Date(att.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        {att.totalHours ? `${att.totalHours}h` : 'In Progress'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            att.status === 'PRESENT'
                              ? 'success'
                              : att.status === 'LATE'
                              ? 'warning'
                              : 'default'
                          }
                          className="text-[10px]"
                        >
                          {att.status}
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
  );
}
