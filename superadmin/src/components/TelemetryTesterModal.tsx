import React, { useState } from 'react';
import { X, Send, Radio, CheckCircle2, AlertCircle, Cpu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { telemetryService } from '../services/telemetryService';

interface TelemetryTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TelemetryTesterModal: React.FC<TelemetryTesterModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { selectedEvent } = useAuth();
  const [peopleCount, setPeopleCount] = useState<number>(940);
  const [inflow, setInflow] = useState<number>(52);
  const [outflow, setOutflow] = useState<number>(14);
  const [occupancyPercent, setOccupancyPercent] = useState<number>(85);
  const [densityLevel, setDensityLevel] = useState<string>('BUSY');
  const [queueLength, setQueueLength] = useState<number>(95);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen || !selectedEvent) return null;

  const netFlow = inflow - outflow;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const payload = {
        eventId: selectedEvent.id,
        cameraId: 'cam_n_plaza_01',
        zoneId: 'zone_north_plaza',
        peopleCount: Number(peopleCount),
        inflow: Number(inflow),
        outflow: Number(outflow),
        netFlow: Number(inflow) - Number(outflow),
        occupancyPercent: Number(occupancyPercent),
        densityLevel,
        queueLength: Number(queueLength),
        timestamp: new Date().toISOString()
      };

      const res = await telemetryService.submitCVTelemetry(payload);
      setResult({
        success: true,
        message: `Telemetry window accepted! ID: ${res.telemetryId}, netFlow: ${res.netFlow} people/30s.`
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.message || 'Failed to submit telemetry.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
      <div
        id="telemetry-tester-modal"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-blue-700 flex items-center justify-between bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/15 text-white">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Python YOLO & CV Stream Ingestion Test</h3>
              <p className="text-xs text-blue-100 font-mono">Simulates: POST /api/v1/internal/telemetry</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1 font-mono text-slate-700">
            <div><span className="text-slate-500 font-medium">Target Event:</span> <span className="font-semibold text-slate-900">{selectedEvent.name}</span></div>
            <div><span className="text-slate-500 font-medium">Target Zone:</span> North Ingress Plaza (zone_north_plaza)</div>
            <div><span className="text-slate-500 font-medium">Virtual Line Cam:</span> Turnstile Line Sensor (cam_n_plaza_01)</div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">People Count (Zone)</label>
              <input
                id="input-cv-people-count"
                type="number"
                value={peopleCount}
                onChange={e => setPeopleCount(Number(e.target.value))}
                min={0}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Occupancy Percent (%)</label>
              <input
                id="input-cv-occupancy"
                type="number"
                value={occupancyPercent}
                onChange={e => setOccupancyPercent(Number(e.target.value))}
                min={0}
                max={100}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 30-Second Inflow / Outflow line crossing */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              30-Second Virtual Line Crossing
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Inflow (IN)</label>
                <input
                  id="input-cv-inflow"
                  type="number"
                  value={inflow}
                  onChange={e => setInflow(Number(e.target.value))}
                  min={0}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-emerald-600 font-bold font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Outflow (OUT)</label>
                <input
                  id="input-cv-outflow"
                  type="number"
                  value={outflow}
                  onChange={e => setOutflow(Number(e.target.value))}
                  min={0}
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 font-bold font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Net Flow (IN - OUT)</label>
                <div className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-blue-700 font-mono">
                  {netFlow > 0 ? `+${netFlow}` : netFlow} / 30s
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Density Level</label>
              <select
                id="input-cv-density"
                value={densityLevel}
                onChange={e => setDensityLevel(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="LOW">LOW</option>
                <option value="MODERATE">MODERATE</option>
                <option value="BUSY">BUSY</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Queue Length</label>
              <input
                id="input-cv-queue"
                type="number"
                value={queueLength}
                onChange={e => setQueueLength(Number(e.target.value))}
                min={0}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {result && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 font-medium ${
                result.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span className="font-mono">{result.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              id="btn-submit-cv-telemetry"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Transmitting...' : 'Post CV Telemetry Window'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
