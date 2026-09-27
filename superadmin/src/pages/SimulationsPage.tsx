import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  Calendar,
  AlertTriangle,
  Layers,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { simulationService } from '../services/simulationService';
import { Simulation, ScenarioType } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const SimulationsPage: React.FC = () => {
  const { events, selectedEventId, selectedEvent } = useAuth();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [name, setName] = useState('Gate 1 Surge Scenario');
  const [scenarioType, setScenarioType] = useState<ScenarioType>('GATE_CLOSURE');
  const [description, setDescription] = useState('Evaluate crowd rerouting if primary gate shuts down');
  const [reroutePercentage, setReroutePercentage] = useState(50);
  const [inflowMultiplier, setInflowMultiplier] = useState(1.5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeResult, setActiveResult] = useState<any | null>(null);

  const fetchSimulations = async () => {
    if (!selectedEventId) return;
    setIsLoading(true);
    try {
      const res = await simulationService.getEventSimulations(selectedEventId);
      setSimulations(res);
      if (res.length > 0 && !activeResult) {
        setActiveResult(res[0].results);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulations();
  }, [selectedEventId]);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setIsSubmitting(true);
    try {
      const res = await simulationService.createSimulation(selectedEventId, {
        name,
        description,
        scenarioType,
        inputParameters: {
          reroutePercentage: Number(reroutePercentage),
          inflowMultiplier: Number(inflowMultiplier)
        }
      });
      setActiveResult(res.results);
      fetchSimulations();
    } catch (err: any) {
      alert(err?.message || 'Simulation execution failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="simulations-page" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          <span>Crowd Dynamics & Tactical Scenario Simulator</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Predictive consequence modeling for gate closures, crowd surges, and concourse route changes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario Config Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Configure Scenario</h3>

          <form onSubmit={handleRun} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Target Event</label>
              <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg font-mono text-blue-700 font-semibold text-xs">
                {selectedEvent?.name || 'Select an event'}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Scenario Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Scenario Archetype</label>
              <select
                value={scenarioType}
                onChange={e => setScenarioType(e.target.value as ScenarioType)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              >
                <option value="GATE_CLOSURE">GATE_CLOSURE (Emergency closure)</option>
                <option value="CROWD_SURGE">CROWD_SURGE (Sudden ingress surge)</option>
                <option value="ROUTE_CHANGE">ROUTE_CHANGE (Concourse redirect)</option>
                <option value="CAPACITY_CHANGE">CAPACITY_CHANGE (Zone limit adjustment)</option>
                <option value="STAFF_REALLOCATION">STAFF_REALLOCATION (Security deployment)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Reroute %</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={reroutePercentage}
                  onChange={e => setReroutePercentage(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Inflow Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="3.0"
                  value={inflowMultiplier}
                  onChange={e => setInflowMultiplier(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Scenario Notes</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              id="btn-run-sim"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isSubmitting ? 'Calculating Simulation...' : 'Execute Simulation Scenario'}</span>
            </button>
          </form>
        </div>

        {/* Results Output Console */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Simulation Consequence Projection</span>
          </h3>

          {activeResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-blue-700 font-bold uppercase">Scenario Assessment</span>
                  <StatusBadge status={activeResult.metrics?.riskLevel || 'HIGH'} type="alert" />
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{activeResult.summary}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-center font-mono">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[10px] text-slate-500 font-semibold block">SPILLOVER RATE</span>
                    <span className="text-lg font-bold text-amber-600">+{activeResult.metrics?.spilloverRate || 35}%</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[10px] text-slate-500 font-semibold block">QUEUE IMPACT</span>
                    <span className="text-lg font-bold text-rose-600">+{activeResult.metrics?.queueDelayEstimate || 8} min</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[10px] text-slate-500 font-semibold block">RISK LEVEL</span>
                    <span className="text-lg font-bold text-amber-600">{activeResult.metrics?.riskLevel || 'HIGH'}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs">
                    <span className="text-[10px] text-slate-500 font-semibold block">STAFF DISPATCH</span>
                    <span className="text-lg font-bold text-emerald-600">+{activeResult.metrics?.recommendedStaffCount || 10} Units</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Prescribed Incident Preemption</span>
                </div>
                <p className="text-emerald-800">{activeResult.prescribedAction || 'Direct adjacent gates to initiate mobile ticketing mode and alert concourse staff to guide attendees away from bottleneck zones.'}</p>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">
              Execute a scenario or select a previous run from the history table below to review consequences.
            </div>
          )}

          {/* Historical Runs */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Previous Simulation Runs</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {simulations.map(sim => (
                <div
                  key={sim.id}
                  onClick={() => setActiveResult(sim.results)}
                  className="p-3 rounded-lg bg-slate-50 hover:bg-blue-50/50 border border-slate-200 flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-800">{sim.name}</span>
                    <span className="text-[11px] text-blue-600 font-mono ml-2 font-semibold">[{sim.scenarioType}]</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(sim.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
