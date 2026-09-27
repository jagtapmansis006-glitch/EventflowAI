import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Shield,
  CheckCircle,
  XCircle,
  Calendar,
  AlertCircle,
  MoreVertical,
  X,
  UserCheck,
  UserX,
  RefreshCw
} from 'lucide-react';
import { adminService, AdminsResponse } from '../services/adminService';
import { eventService } from '../services/eventService';
import { User, Event } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const EventAdminsPage: React.FC = () => {
  const [data, setData] = useState<AdminsResponse | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [selectedEventIdToAssign, setSelectedEventIdToAssign] = useState('');

  // Create form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [initialEventId, setInitialEventId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const [adminsRes, eventsRes] = await Promise.all([
        adminService.getEventAdmins(),
        eventService.getAllEvents()
      ]);
      setData(adminsRes);
      setAllEvents(eventsRes);
      if (eventsRes.length > 0) {
        setInitialEventId(eventsRes[0].id);
        setSelectedEventIdToAssign(eventsRes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await adminService.createEventAdmin({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        assignedEventIds: initialEventId ? [initialEventId] : []
      });

      setIsCreateOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      fetchAdmins();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create Event Admin account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: User) => {
    try {
      await adminService.toggleEventAdminStatus(admin.id, !admin.isActive);
      fetchAdmins();
    } catch (err: any) {
      alert(err?.message || 'Failed to update admin status');
    }
  };

  const handleAssignEvent = async () => {
    if (!selectedAdmin || !selectedEventIdToAssign) return;
    try {
      await adminService.assignEventToAdmin(selectedAdmin.id, selectedEventIdToAssign);
      setIsAssignOpen(false);
      fetchAdmins();
    } catch (err: any) {
      alert(err?.message || 'Failed to assign event');
    }
  };

  const handleRemoveEvent = async (adminId: string, eventId: string) => {
    try {
      await adminService.removeEventFromAdmin(adminId, eventId);
      fetchAdmins();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove event assignment');
    }
  };

  const count = data?.count || 0;
  const maxLimit = data?.maxLimit || 40;
  const canCreateMore = data?.canCreateMore ?? (count < maxLimit);

  const filteredAdmins = (data?.admins || []).filter(a => {
    return (
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div id="event-admins-page" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header with capacity indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Event Administrators</h1>
            <span
              id="event-admin-capacity-badge"
              className={`px-3 py-0.5 rounded-full font-mono text-xs font-bold border ${
                count >= maxLimit
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : count >= 35
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              Capacity: {count} / {maxLimit} Admins
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage field operators, stage coordinators, and venue gate controllers (Strict limit: 40 accounts)
          </p>
        </div>

        <div>
          <button
            id="btn-add-event-admin"
            disabled={!canCreateMore}
            onClick={() => setIsCreateOpen(true)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${
              canCreateMore
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{canCreateMore ? 'New Event Admin' : 'Limit Reached (40/40)'}</span>
          </button>
        </div>
      </div>

      {/* Warning banner if limit reached */}
      {!canCreateMore && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>
            Maximum capacity of 40 Event Administrators reached. You must deactivate or remove an administrator before provisioning a new account.
          </span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-admins"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search admins by name, email, phone..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={fetchAdmins}
          className="p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Admins Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-bold">Administrator</th>
                <th className="py-3.5 px-4 font-bold">Contact</th>
                <th className="py-3.5 px-4 font-bold">Assigned Events</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">Last Login</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No administrators found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map(admin => (
                  <tr key={admin.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{admin.fullName}</div>
                      <div className="text-[11px] text-blue-600 font-mono mt-0.5">{admin.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {admin.phone || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {admin.assignedEvents?.map(evt => (
                          <span
                            key={evt.id}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                          >
                            <span className="truncate max-w-[140px]">{evt.name}</span>
                            <button
                              onClick={() => handleRemoveEvent(admin.id, evt.id)}
                              title="Unassign event"
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setIsAssignOpen(true);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
                        >
                          + Assign
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md font-mono font-medium ${
                          admin.isActive
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-rose-50 border border-rose-200 text-rose-700'
                        }`}
                      >
                        {admin.isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(admin)}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border transition-colors shadow-xs ${
                          admin.isActive
                            ? 'text-rose-700 border-rose-200 bg-rose-50/50 hover:bg-rose-100'
                            : 'text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100'
                        }`}
                      >
                        {admin.isActive ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Disable</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Enable</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Event Admin */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-blue-700 flex items-center justify-between bg-blue-600 text-white">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold">Provision Event Admin</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Rachel Adams"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. rachel@eventflow.ai"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1-555-0144"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Initial Event Assignment</label>
                <select
                  value={initialEventId}
                  onChange={e => setInitialEventId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="">No initial assignment</option>
                  {allEvents.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Provision Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Event */}
      {isAssignOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-blue-700 flex items-center justify-between bg-blue-600 text-white">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold">Assign Event</h3>
              </div>
              <button onClick={() => setIsAssignOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 font-medium">
                Assign event control to <span className="font-bold text-blue-600">{selectedAdmin.fullName}</span>:
              </p>

              <select
                value={selectedEventIdToAssign}
                onChange={e => setSelectedEventIdToAssign(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
              >
                {allEvents.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.status})
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsAssignOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignEvent}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

