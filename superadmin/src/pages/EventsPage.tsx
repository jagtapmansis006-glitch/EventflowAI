import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  MapPin,
  Clock,
  MoreVertical,
  Edit2,
  Archive,
  ArrowUpRight,
  RefreshCw,
  Users,
  Mic
} from 'lucide-react';
import { eventService } from '../services/eventService';
import { Event, EventStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CreateEventModal } from '../components/CreateEventModal';

interface EventsPageProps {
  onSelectEvent: (eventId: string) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ onSelectEvent }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await eventService.getAllEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleStatusChange = async (eventId: string, newStatus: EventStatus) => {
    try {
      await eventService.updateEventStatus(eventId, newStatus);
      fetchEvents();
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="events-page" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Event Portfolio Management</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Configure multi-venue parameters, zone thresholds, and operational schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-voice-create-event-page"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
            title="Create event using voice speech-to-text"
          >
            <Mic className="w-4 h-4 text-amber-400" />
            <span>Voice Assistant</span>
          </button>
          <button
            id="btn-create-event-page"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-events"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, venue, city..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'LIVE', 'UPCOMING', 'DRAFT', 'COMPLETED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
                statusFilter === status
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
          <button
            onClick={fetchEvents}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Events Table / Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-bold">Event / Category</th>
                <th className="py-3.5 px-4 font-bold">Venue & City</th>
                <th className="py-3.5 px-4 font-bold">Operational Schedule</th>
                <th className="py-3.5 px-4 font-bold">Lifecycle Status</th>
                <th className="py-3.5 px-4 font-bold">Assigned Admins</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No events match current filter parameters.
                  </td>
                </tr>
              ) : (
                filteredEvents.map(evt => (
                  <tr key={evt.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{evt.name}</div>
                      <div className="text-[11px] text-blue-700 font-mono font-medium mt-0.5">{evt.eventType}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-medium text-slate-900">{evt.venueName}</div>
                      <div className="text-[11px] text-slate-500">{evt.city}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                      <div className="font-medium text-slate-900">{new Date(evt.startDateTime).toLocaleDateString()}</div>
                      <div className="text-slate-500 text-[10px]">
                        {new Date(evt.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(evt.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={evt.status}
                        onChange={e => handleStatusChange(evt.id, e.target.value as EventStatus)}
                        className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-mono font-medium cursor-pointer shadow-2xs focus:border-blue-500 focus:outline-none"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="UPCOMING">UPCOMING</option>
                        <option value="LIVE">LIVE</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">{evt.assignedAdmins?.length || 0} Admins</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectEvent(evt.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchEvents}
      />
    </div>
  );
};
