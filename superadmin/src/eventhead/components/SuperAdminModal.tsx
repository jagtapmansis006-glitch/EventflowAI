import React, { useState } from 'react';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import { 
  X, 
  ShieldCheck, 
  Plus, 
  Building2, 
  Users, 
  Calendar, 
  MapPin, 
  Sparkles,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({ isOpen, onClose }) => {
  const { allEvents, createEventBySuperAdmin, switchUserRole } = useEventAdmin();
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [formData, setFormData] = useState({
    name: 'Bangalore Tech Summit 2026',
    venue: 'Bangalore Palace Grounds, Hall 1-3',
    city: 'Bengaluru',
    capacity: 12000,
    adminEmail: 'rajesh.admin@eventflow.ai',
    adminName: 'Rajesh Verma',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreatedSuccess(null);

    const result = await createEventBySuperAdmin(formData);
    setIsSubmitting(false);

    if (result) {
      setCreatedSuccess(`Event "${result.name}" successfully created with ID: ${result.id}. Assigned to ${formData.adminName}.`);
      setActiveTab('LIST');
    }
  };

  return (
    <div 
      id="super-admin-modal-backdrop"
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div 
        id="super-admin-modal-card"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-700 to-indigo-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-200">
                Platform Multi-Tenant Controller
              </div>
              <h3 className="text-base font-extrabold text-white">
                Super Admin: Event & Admin Director
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'LIST'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All Events & Assignments ({allEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'CREATE'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Event</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {createdSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{createdSuccess}</span>
            </div>
          )}

          {activeTab === 'LIST' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium">
                Select an event to view or simulate Event Admin assignment switch:
              </div>

              {allEvents.map(evt => (
                <div
                  key={evt.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {evt.id}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{evt.name}</h4>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{evt.venue}</span>
                      <span>•</span>
                      <span>Cap: {evt.capacity.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                      Assigned Admin: <span className="font-semibold text-slate-900">{evt.assignedAdminEmail || evt.assignedAdminName || 'eventadmin@eventflow.io'}</span>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      await switchUserRole('EVENT_ADMIN', evt.id);
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all whitespace-nowrap self-start sm:self-center"
                  >
                    Launch as This Admin
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'CREATE' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Event Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    City / Region
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Venue Location & Halls
                </label>
                <input
                  type="text"
                  required
                  value={formData.venue}
                  onChange={e => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Max Safe Capacity
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Event Admin Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.adminName}
                    onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Event Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.adminEmail}
                    onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-purple-600 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating Event...' : 'Generate Event & Assign Admin'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100"
          >
            Close Director
          </button>
        </div>
      </div>
    </div>
  );
};
