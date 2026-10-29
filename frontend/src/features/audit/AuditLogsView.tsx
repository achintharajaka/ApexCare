import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AuditLog } from '../../types';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axios.get('/api/audit-logs');
      setLogs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Constant background refresh interval (every 6 seconds)
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 6000);

    // Instant update on realtime data change from backend
    const handleSync = () => {
      fetchLogs(true);
    };
    window.addEventListener('apexcare:sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('apexcare:sync', handleSync);
    };
  }, []);

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-bg-surface p-space-md rounded-xl border border-border-subtle shadow-xs">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Security & Audit Trail Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable trace of electronic records, consultation modifications, and financial settlements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg border border-border-subtle bg-bg-surface hover:bg-bg-surface-subtle text-slate-700 font-title-sm text-xs shadow-xs transition-colors"
            title="Refresh Audit Trail"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary-teal ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Audit Governance Active
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-bg-surface rounded-xl border border-border-subtle shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[700px]">
            <thead>
              <tr className="bg-bg-surface-subtle text-caption font-caption text-slate-500 uppercase border-b border-border-subtle">
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">Authenticated User</th>
                <th className="py-2.5 px-4 font-semibold">Security Action</th>
                <th className="py-2.5 px-4 font-semibold">Target Resource</th>
                <th className="py-2.5 px-4 font-semibold">Record ID</th>
                <th className="py-2.5 px-4 font-semibold text-right">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary-teal border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading audit trail...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <p className="mb-2">No audit events recorded yet.</p>
                    <button
                      onClick={() => fetchLogs()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium"
                    >
                      <span className="material-symbols-outlined text-[15px]">refresh</span>
                      Reload Logs
                    </button>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-label-tabular text-slate-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{log.userName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 font-label-tabular">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{log.resource}</td>
                    <td className="py-3 px-4 font-label-tabular text-primary-teal font-semibold">
                      {log.recordId}
                    </td>
                    <td className="py-3 px-4 text-right font-label-tabular text-slate-500">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
