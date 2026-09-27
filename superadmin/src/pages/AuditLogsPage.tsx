import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Shield,
  Clock,
  Filter
} from 'lucide-react';
import { auditService } from '../services/auditService';
import { AuditLog } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await auditService.getAuditLogs({ limit: 60 });
      setLogs(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(l => {
    const matchesAction = actionFilter === 'ALL' || l.action.includes(actionFilter);
    const matchesSearch =
      (l.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.resourceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.eventId || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div id="audit-logs-page" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Immutable Governance & Audit Trails</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Cryptographic ledger tracking all operator logins, gate toggles, alert broadcasts, and incident escalations
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-4 py-2 text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Audit Stream</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search user, action, resource..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'LOGIN', 'CREATE', 'UPDATE', 'STATUS', 'TOGGLE'].map(act => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                actionFilter === act
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-bold">Timestamp</th>
                <th className="py-3.5 px-4 font-bold">User</th>
                <th className="py-3.5 px-4 font-bold">Action Executed</th>
                <th className="py-3.5 px-4 font-bold">Resource Type</th>
                <th className="py-3.5 px-4 font-bold">Resource ID</th>
                <th className="py-3.5 px-4 font-bold">Target Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    No audit records match criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(l.createdAt).toLocaleTimeString()} • {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800">
                      <div className="font-bold text-slate-900">{l.userName || l.userEmail || l.userId}</div>
                      <div className="text-[10px] text-slate-500">{l.userEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 text-blue-600 font-bold">
                      {l.action}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {l.resourceType}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {l.resourceId}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {l.eventId || 'GLOBAL'}
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
