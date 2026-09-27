import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  RefreshCw,
  Plus,
  Clock,
  MapPin,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { incidentService } from '../services/incidentService';
import { Incident, IncidentStatus, IncidentType, IncidentSeverity } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const IncidentsPage: React.FC = () => {
  const { events } = useAuth();
  const [incidents, setIncidents] = useState<(Incident & { eventName?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // New incident modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id || '');
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentType>('MEDICAL');
  const [severity, setSeverity] = useState<IncidentSeverity>('HIGH');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      let combined: (Incident & { eventName?: string })[] = [];
      for (const evt of events) {
        try {
          const list = await incidentService.getEventIncidents(evt.id);
          combined.push(...list.map(i => ({ ...i, eventName: evt.name })));
        } catch (_) {}
      }
      setIncidents(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (events.length > 0) {
      fetchIncidents();
    }
  }, [events]);

  const handleUpdateStatus = async (inc: Incident, newStatus: IncidentStatus) => {
    try {
      await incidentService.updateIncidentStatus(inc.eventId, inc.id, newStatus);
      fetchIncidents();
    } catch (err: any) {
      alert(err?.message || 'Failed to update incident');
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await incidentService.createIncident(selectedEventId, {
        title,
        incidentType,
        severity,
        location,
        description
      });
      setIsModalOpen(false);
      setTitle('');
      setLocation('');
      setDescription('');
      fetchIncidents();
    } catch (err: any) {
      alert(err?.message || 'Failed to create incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = incidents.filter(i => {
    const matchesStatus = statusFilter === 'ALL' || i.status === statusFilter;
    const matchesSearch =
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div id="incidents-page" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Active Incident Response & Dispatch</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Operational triage workflow (REPORTED → INVESTIGATING → DISPATCHED → RESOLVED)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Field Incident</span>
          </button>
          <button
            onClick={fetchIncidents}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search title, location, description..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'REPORTED', 'INVESTIGATING', 'DISPATCHED', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-bold">Event</th>
                <th className="py-3.5 px-4 font-bold">Incident Details</th>
                <th className="py-3.5 px-4 font-bold">Type</th>
                <th className="py-3.5 px-4 font-bold">Severity</th>
                <th className="py-3.5 px-4 font-bold">Location</th>
                <th className="py-3.5 px-4 font-bold">Status Lifecycle</th>
                <th className="py-3.5 px-4 font-bold">Logged At</th>
                <th className="py-3.5 px-4 font-bold text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No incidents match current filter.
                  </td>
                </tr>
              ) : (
                filtered.map(inc => (
                  <tr key={inc.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-blue-600 font-semibold text-[11px]">
                      {inc.eventName || inc.eventId}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-bold text-slate-900 text-sm">{inc.title}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{inc.description}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      {inc.incidentType}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inc.severity} type="alert" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {inc.location}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={inc.status} type="incident" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(inc.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={inc.status}
                        onChange={e => handleUpdateStatus(inc, e.target.value as IncidentStatus)}
                        className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
                      >
                        <option value="REPORTED">REPORTED</option>
                        <option value="INVESTIGATING">INVESTIGATING</option>
                        <option value="DISPATCHED">DISPATCHED</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Field Incident */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-rose-700 flex items-center justify-between bg-rose-600 text-white">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold">Log Field Incident</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Target Event *</label>
                <select
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                >
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Incident Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Medical Fainting at North Plaza"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Incident Type</label>
                  <select
                    value={incidentType}
                    onChange={e => setIncidentType(e.target.value as IncidentType)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                  >
                    <option value="MEDICAL">MEDICAL</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="CROWD">CROWD</option>
                    <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                    <option value="LOST_PERSON">LOST_PERSON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Severity</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as IncidentSeverity)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Location Details *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Gate 1 turnstiles, section C"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detail attendee status, required medical/security response units..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Dispatching...' : 'Dispatch Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
