import React from 'react';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import { 
  Sparkles, 
  X, 
  ArrowRight, 
  TrendingDown, 
  ShieldCheck, 
  CheckCircle2, 
  Sliders,
  AlertCircle
} from 'lucide-react';

export const SimulationModal: React.FC = () => {
  const { simulation, closeSimulation, applySimulation } = useEventAdmin();

  if (!simulation.isOpen) return null;

  const simData = simulation.data || {
    title: 'WHAT-IF SIMULATION: OPEN GATE 3',
    confidence: 91,
    metrics: [
      { label: 'Gate 2 Crowd', from: '1,240', to: '860', change: '-30.6%', time: 'in 3 minutes' },
      { label: 'Inflow Redistribution', from: '100% G2', to: '60% G2 / 40% G3', change: 'Balanced', time: 'immediate' },
      { label: 'Zone B High Density', from: '88%', to: '70%', change: '-18%', time: 'in 5 minutes' },
    ],
    actionPayload: { action: 'OPEN_GATE', targetId: 'gate_3' },
  };

  return (
    <div 
      id="simulation-modal-backdrop"
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div 
        id="simulation-modal-card"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                Predictive Digital Twin
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                {simData.title}
              </h3>
            </div>
          </div>

          <button
            onClick={closeSimulation}
            className="p-1.5 rounded-xl hover:bg-white text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Model Calculation:</span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confidence: {simData.confidence}%
            </span>
          </div>

          <div className="text-xs text-slate-600">
            <strong>Expected Results (Simulated without changing live venue state):</strong>
          </div>

          {/* Metric Comparison Cards */}
          <div className="space-y-2.5">
            {simData.metrics.map((m: any, i: number) => (
              <div 
                key={i} 
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800">{m.label}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Expected {m.time}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 line-through font-mono">
                      {m.from}
                    </div>
                    <div className="text-sm font-extrabold text-blue-600 font-mono">
                      {m.to}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-extrabold font-mono">
                    {m.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Safety Notice */}
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              Real turnstiles and attendee signage remain unaffected until you explicitly click "Apply Recommendation".
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            id="btn-cancel-simulation"
            onClick={closeSimulation}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            id="btn-apply-simulation"
            onClick={() => applySimulation(simData.actionPayload)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold tracking-wider transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>APPLY RECOMMENDATION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
