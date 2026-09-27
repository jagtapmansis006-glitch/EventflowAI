import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapboxLiveMap } from '../components/MapboxLiveMap';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Layers,
  Activity,
  DoorOpen,
  Camera as CameraIcon,
  Bell,
  AlertTriangle,
  Users,
  Navigation,
  Sparkles,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Plus,
  Play,
  Flame,
  Radio,
  Send,
  Compass,
  ArrowUpRight,
  TrendingUp,
  Shield,
  Zap,
  Lock,
  Unlock
} from 'lucide-react';
import { eventService } from '../services/eventService';
import { alertService } from '../services/alertService';
import { incidentService } from '../services/incidentService';
import { simulationService } from '../services/simulationService';
import { predictionService } from '../services/predictionService';
import { adminService } from '../services/adminService';
import { realtimeService } from '../services/realtimeService';
import { apiClient } from '../api/client';
import {
  Event,
  EventDashboardData,
  CrowdZone,
  Gate,
  Camera,
  Alert,
  Incident,
  MLPrediction,
  Simulation,
  AlertStatus,
  IncidentStatus,
  GateStatus
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { StatCard } from '../components/StatCard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

interface EventDetailsPageProps {
  eventId: string;
  onBack: () => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({ eventId, onBack }) => {
  const [data, setData] = useState<EventDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dual Control Mode: MANUAL ↔ AI CONTROL
  const [autonomousMode, setAutonomousMode] = useState<boolean>(false);
  const [isTogglingAutonomous, setIsTogglingAutonomous] = useState<boolean>(false);

  // Recommendations and Manual Approval
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isApprovingRec, setIsApprovingRec] = useState<boolean>(false);

  // Venue Map Artwork Upload State
  const [venueMapUploading, setVenueMapUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      const res = await apiClient.get<any>(`/api/v1/admin/events/${eventId}/recommendations`);
      setRecommendations(Array.isArray(res) ? res : (res?.recommendations || res?.data || []));
    } catch (err) {
      console.warn('Could not fetch recommendations:', err);
    }
  }, [eventId]);

  const approveRecommendation = async (recId: string) => {
    setIsApprovingRec(true);
    try {
      await apiClient.post(`/api/v1/admin/events/${eventId}/recommendations/${recId}/approve`, {});
      fetchDetails();
      fetchRecommendations();
      fetchActivityLogs();
    } catch (err) {
      console.error('Failed to approve recommendation:', err);
    } finally {
      setIsApprovingRec(false);
    }
  };

  const handleMapFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVenueMapUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        await apiClient.post(`/api/v1/admin/events/${eventId}/venue-map`, {
          imageBase64: base64Data,
          fileName: file.name
        });
        fetchDetails();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Map upload failed:', err);
    } finally {
      setVenueMapUploading(false);
    }
  };

  // Activity / Audit Logs
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // AI Decision Engine State
  const [lastAiDecision, setLastAiDecision] = useState<{
    action: string;
    gate: string;
    reason: string;
    confidence: number;
    executedAt: string;
  } | null>(null);
  const [aiDecisionExecuting, setAiDecisionExecuting] = useState<boolean>(false);

  // Modal / Form states for inside tabs
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertSeverity, setNewAlertSeverity] = useState('WARNING');
  const [newAlertPublicMsg, setNewAlertPublicMsg] = useState('');
  const [newAlertInternalMsg, setNewAlertInternalMsg] = useState('');
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);

  const [newIncidentTitle, setNewIncidentTitle] = useState('');
  const [newIncidentType, setNewIncidentType] = useState('MEDICAL');
  const [newIncidentSeverity, setNewIncidentSeverity] = useState('HIGH');
  const [newIncidentLocation, setNewIncidentLocation] = useState('');
  const [newIncidentDesc, setNewIncidentDesc] = useState('');
  const [isCreatingIncident, setIsCreatingIncident] = useState(false);

  // Simulation form
  const [simScenario, setSimScenario] = useState('GATE_CLOSURE');
  const [simName, setSimName] = useState('Gate 1 Emergency Closure Surge');
  const [isRunningSim, setIsRunningSim] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await eventService.getEventDashboard(eventId);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const fetchAutonomousMode = useCallback(async () => {
    try {
      const res = await apiClient.get<any>(`/api/v1/admin/events/${eventId}/auto-execute`);
      if (res && typeof res.autonomousMode === 'boolean') {
        setAutonomousMode(res.autonomousMode);
      }
    } catch (err) {
      console.warn('Could not fetch auto-execute state:', err);
    }
  }, [eventId]);

  const fetchActivityLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await apiClient.get<any>(`/api/v1/admin/events/${eventId}/activity-logs`);
      setActivityLogs(Array.isArray(res) ? res : (res?.auditLogs || res?.logs || []));
    } catch (err) {
      console.warn('Could not fetch activity logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [eventId]);

  const toggleAutonomousMode = async () => {
    setIsTogglingAutonomous(true);
    const nextState = !autonomousMode;
    setAutonomousMode(nextState);
    try {
      await apiClient(`/api/v1/admin/events/${eventId}/auto-execute`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: nextState })
      });
      fetchActivityLogs();
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle autonomous mode');
      setAutonomousMode(!nextState);
    } finally {
      setIsTogglingAutonomous(false);
    }
  };

  // Structured AI Decision Dispatcher
  const dispatchAiDecision = async (decision: {
    action: 'OPEN' | 'CLOSE';
    gate: string;
    reason: string;
    confidence: number;
  }) => {
    setAiDecisionExecuting(true);
    try {
      const res = await apiClient.post<any>(`/api/v1/admin/events/${eventId}/ai-decision`, {
        action: decision.action,
        gate: decision.gate,
        reason: decision.reason,
        confidence: decision.confidence,
        source: autonomousMode ? 'system_ai_engine' : 'manual_admin'
      });

      setLastAiDecision({
        ...decision,
        executedAt: new Date().toISOString()
      });

      fetchDetails();
      fetchActivityLogs();
      return res;
    } catch (err: any) {
      console.error('Failed to execute AI decision:', err);
    } finally {
      setAiDecisionExecuting(false);
    }
  };

  // SSE Real-Time Telemetry Subscription
  useEffect(() => {
    fetchDetails();
    fetchAutonomousMode();
    fetchActivityLogs();
    fetchRecommendations();

    realtimeService.connect(eventId);

    const unsubCrowd = realtimeService.subscribe('crowd_status_updated', (evt) => {
      if (evt?.telemetry) {
        setData(prev => {
          if (!prev) return prev;
          const tel = evt.telemetry;
          const existingRecent = prev.recentTelemetry || [];
          return {
            ...prev,
            currentCrowdStatus: {
              ...prev.currentCrowdStatus,
              currentPeopleCount: tel.peopleCount ?? prev.currentCrowdStatus?.currentPeopleCount ?? 0,
              currentInflow: tel.inflow ?? prev.currentCrowdStatus?.currentInflow ?? 0,
              currentOutflow: tel.outflow ?? prev.currentCrowdStatus?.currentOutflow ?? 0,
              netFlow: tel.netFlow ?? prev.currentCrowdStatus?.netFlow ?? 0,
              occupancyPercent: tel.occupancyPercent ?? prev.currentCrowdStatus?.occupancyPercent ?? 0,
              densityLevel: (tel.densityLevel || prev.currentCrowdStatus?.densityLevel || 'LOW') as any
            },
            recentTelemetry: [...existingRecent.slice(-29), tel]
          };
        });
      }
    });

    const unsubGate = realtimeService.subscribe('gate_status_changed', () => {
      fetchDetails();
      fetchActivityLogs();
    });

    const unsubRoute = realtimeService.subscribe('route_updated', () => {
      fetchActivityLogs();
    });

    const unsubAlert = realtimeService.subscribe('alert_created', () => {
      fetchDetails();
    });

    const unsubStatus = realtimeService.subscribe('event_status_changed', (evt) => {
      if (typeof evt?.autonomousMode === 'boolean') {
        setAutonomousMode(evt.autonomousMode);
      }
    });

    const pollInterval = setInterval(() => {
      fetchDetails();
      fetchActivityLogs();
    }, 10000);

    return () => {
      unsubCrowd();
      unsubGate();
      unsubRoute();
      unsubAlert();
      unsubStatus();
      clearInterval(pollInterval);
      realtimeService.disconnect();
    };
  }, [eventId, fetchDetails, fetchAutonomousMode, fetchActivityLogs]);

  // Autonomous congestion monitor: If AI predicts congestion (>85%) and AI Control is ON -> auto-dispatch
  useEffect(() => {
    if (!autonomousMode || !data) return;

    const predictions = data.latestPredictions || [];
    const gates = data.gateStatuses || [];

    const criticalPrediction = predictions.find(
      p => (p.predictedOccupancyPercent > 85 || p.riskLevel === 'CRITICAL')
    );

    const closedGate = gates.find(g => g.status === 'CLOSED');

    if (criticalPrediction && closedGate && !aiDecisionExecuting && !lastAiDecision) {
      dispatchAiDecision({
        action: 'OPEN',
        gate: closedGate.id,
        reason: `Zone prediction density exceeded 85% (${criticalPrediction.predictedOccupancyPercent}%). Autonomous ingress relief dispatched.`,
        confidence: Number(criticalPrediction.confidence) || 0.94
      });
    }
  }, [autonomousMode, data, aiDecisionExecuting, lastAiDecision]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
        <Activity className="w-5 h-5 animate-spin text-blue-600" />
        <span className="font-medium text-xs">Loading event operational matrix...</span>
      </div>
    );
  }

  if (!data || error || !data.event) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-4 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </button>
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium shadow-xs">
          {error || 'Event data not found or backend offline'}
        </div>
      </div>
    );
  }

  const {
    event,
    currentCrowdStatus = {
      currentPeopleCount: 0,
      netFlow: 0,
      currentInflow: 0,
      currentOutflow: 0,
      occupancyPercent: 0,
      densityLevel: 'LOW'
    },
    activeAlerts = [],
    activeIncidents = [],
    gateStatuses = [],
    zoneStatuses = [],
    latestPredictions = [],
    cameraStatuses = [],
    recentTelemetry = [],
    criticalAlerts = []
  } = (data as any);

  const safeActiveAlerts = Array.isArray(activeAlerts) ? activeAlerts : [];
  const safeActiveIncidents = Array.isArray(activeIncidents) ? activeIncidents : [];
  const safeGateStatuses = Array.isArray(gateStatuses) ? gateStatuses : [];
  const safeZoneStatuses = Array.isArray(zoneStatuses) ? zoneStatuses : [];
  const safeCameraStatuses = Array.isArray(cameraStatuses) ? cameraStatuses : [];
  const safeLatestPredictions = Array.isArray(latestPredictions) ? latestPredictions : [];
  const safeRecentTelemetry = Array.isArray(recentTelemetry) ? recentTelemetry : [];
  const safeCriticalAlerts = Array.isArray(criticalAlerts) ? criticalAlerts : [];

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingAlert(true);
    try {
      await alertService.createAlert(event.id, {
        title: newAlertTitle,
        severity: newAlertSeverity as any,
        publicMessage: newAlertPublicMsg,
        internalMessage: newAlertInternalMsg,
        alertType: 'CROWD_SURGE'
      });
      setNewAlertTitle('');
      setNewAlertPublicMsg('');
      setNewAlertInternalMsg('');
      fetchDetails();
    } catch (err: any) {
      alert(err?.message || 'Failed to create alert');
    } finally {
      setIsCreatingAlert(false);
    }
  };

  const handleUpdateAlertStatus = async (alertId: string, status: AlertStatus) => {
    try {
      await alertService.updateAlertStatus(event.id, alertId, status);
      fetchDetails();
    } catch (err: any) {
      alert(err?.message || 'Update failed');
    }
  };

  const handleUpdateIncidentStatus = async (incidentId: string, status: IncidentStatus) => {
    try {
      await incidentService.updateIncidentStatus(event.id, incidentId, status);
      fetchDetails();
    } catch (err: any) {
      alert(err?.message || 'Update failed');
    }
  };

  const handleToggleGate = async (gateId: string, currentStatus: GateStatus) => {
    const nextStatus: GateStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await apiClient(`/api/v1/admin/events/${event.id}/gates/${gateId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, source: 'manual_admin' })
      });
      fetchDetails();
      fetchActivityLogs();
    } catch (err: any) {
      alert(err?.message || 'Gate toggle failed');
    }
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunningSim(true);
    setSimResult(null);
    try {
      const res = await simulationService.createSimulation(event.id, {
        name: simName,
        description: 'Command center rule-based scenario evaluation',
        scenarioType: simScenario as any,
        inputParameters: {
          gateId: safeGateStatuses[0]?.id || 'gate_north_1',
          reroutePercentage: 45,
          inflowMultiplier: 1.5
        }
      });
      setSimResult(res?.results || null);
      fetchActivityLogs();
    } catch (err: any) {
      alert(err?.message || 'Simulation error');
    } finally {
      setIsRunningSim(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'venue-map', label: 'Live Google Map & Weather', icon: Compass },
    { id: 'crowd-status', label: 'Crowd Status & Velocity', icon: Activity },
    { id: 'heatmap', label: 'Venue Heatmap & Flow Vectors', icon: Flame },
    { id: 'zones', label: `Zones (${safeZoneStatuses.length})`, icon: Layers },
    { id: 'gates', label: `Gates (${safeGateStatuses.length})`, icon: DoorOpen },
    { id: 'cameras', label: `Cameras (${safeCameraStatuses.length})`, icon: CameraIcon },
    { id: 'alerts', label: `Alerts (${safeActiveAlerts.length})`, icon: Bell },
    { id: 'incidents', label: `Incidents (${safeActiveIncidents.length})`, icon: AlertTriangle },
    { id: 'predictions', label: 'ML Decision Engine', icon: Sparkles },
    { id: 'simulations', label: 'Simulations', icon: Sliders },
    { id: 'activity-log', label: `Activity Log (${activityLogs.length})`, icon: Radio }
  ];

  const telemetryChartData = safeRecentTelemetry.slice(-15).map(t => ({
    time: t?.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }) : '',
    peopleCount: t?.peopleCount ?? 0,
    inflow: t?.inflow ?? 0,
    outflow: t?.outflow ?? 0,
    netFlow: t?.netFlow ?? 0
  }));

  // Heatmap Zone Data Calculation
  const heatmapZones = useMemo(() => {
    return safeZoneStatuses.map((zone, idx) => {
      const cap = zone.capacity || 2000;
      const telem = safeRecentTelemetry.filter(t => t.zoneId === zone.id).slice(-1)[0];
      const pCount = telem ? telem.peopleCount : Math.round(cap * (0.35 + (idx * 0.18) % 0.6));
      const occPct = Math.min(100, Math.round((pCount / cap) * 100));
      const speed = telem?.avgSpeedMps ?? (occPct > 80 ? 0.32 : occPct > 60 ? 0.78 : 1.25);
      
      const directions = ['North ↑', 'North-East ↗', 'East →', 'South-East ↘', 'South ↓', 'West ←'];
      const dir = directions[idx % directions.length];

      return {
        id: zone.id,
        name: zone.name,
        capacity: cap,
        currentCount: pCount,
        occupancy: occPct,
        speedMps: speed,
        direction: dir,
        densityStatus: occPct >= 85 ? 'CRITICAL' : occPct >= 65 ? 'BUSY' : occPct >= 40 ? 'MODERATE' : 'LOW'
      };
    });
  }, [safeZoneStatuses, safeRecentTelemetry]);

  return (
    <div id="event-details-console" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{event?.name || 'Unnamed Event'}</h1>
              {event?.status && <StatusBadge status={event.status} type="event" />}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 font-mono font-medium">
              <span>{event?.venueName || 'N/A'}, {event?.city || 'N/A'}</span>
              <span>•</span>
              <span>
                {event?.startDateTime ? new Date(event.startDateTime).toLocaleDateString() : ''} -{' '}
                {event?.endDateTime ? new Date(event.endDateTime).toLocaleDateString() : ''}
              </span>
            </p>
          </div>
        </div>

        {/* Dual Mode Switch & State Controls */}
        <div className="flex items-center gap-3">
          {/* AI AUTONOMOUS CONTROL TOGGLE */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              autonomousMode 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI CONTROL</span>
            </span>

            <button
              id="btn-toggle-ai-autonomous"
              type="button"
              onClick={toggleAutonomousMode}
              disabled={isTogglingAutonomous}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                autonomousMode ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
              title="Toggle between Manual Operator Control and AI Autonomous Control"
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-xs transition-transform" />
            </button>

            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              !autonomousMode 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
            }`}>
              <span>MANUAL</span>
            </span>
          </div>

          <button
            onClick={() => {
              fetchDetails();
              fetchActivityLogs();
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* DUAL MODE BANNER INDICATOR */}
      <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        autonomousMode 
          ? 'bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white border-indigo-700 shadow-md' 
          : 'bg-white border-slate-200 text-slate-800 shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${autonomousMode ? 'bg-indigo-500/30 text-amber-300' : 'bg-slate-100 text-slate-700'}`}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider">
                {autonomousMode ? 'AI AUTONOMOUS CONTROL ENGINE ACTIVE' : 'MANUAL CONTROL MODE ACTIVE'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                autonomousMode ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
              }`}>
                {autonomousMode ? 'AUTOPILOT ON' : 'OPERATOR REQUIRED'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${autonomousMode ? 'text-indigo-100' : 'text-slate-500'}`}>
              {autonomousMode 
                ? 'System continuously dispatches structured JSON payloads ({ action, gate, reason, confidence }) to directly invoke backend state changes.' 
                : 'System generates real-time predictions and recommendations. Admin triggers gate actions manually.'}
            </p>
          </div>
        </div>

        {lastAiDecision && (
          <div className="text-[11px] font-mono bg-black/20 rounded-lg px-3 py-1.5 border border-white/10 shrink-0">
            <span className="text-amber-300 font-bold">Last Auto Action:</span> {lastAiDecision.action} {lastAiDecision.gate} ({Math.round(lastAiDecision.confidence * 100)}% conf)
          </div>
        )}
      </div>

      {/* MANUAL MODE: RECOMMENDED ACTION APPROVAL BANNER */}
      {!autonomousMode && recommendations.filter((r: any) => r.status === 'ACTIVE' || !r.status).length > 0 && (
        <div id="manual-recommendation-approval-banner" className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-5 border-2 border-indigo-300 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold font-mono uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                    Recommended Gate Action
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Manual Operator Approval Required</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {recommendations.filter((r: any) => r.status === 'ACTIVE' || !r.status)[0].title || recommendations.filter((r: any) => r.status === 'ACTIVE' || !r.status)[0].action}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {recommendations.filter((r: any) => r.status === 'ACTIVE' || !r.status)[0].description || 'AI crowd congestion prediction detected threshold density. Operator authorization required to open gate.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-approve-recommendation-superadmin"
                type="button"
                disabled={isApprovingRec}
                onClick={() => approveRecommendation(recommendations.filter((r: any) => r.status === 'ACTIVE' || !r.status)[0].id)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs tracking-wider transition-all shadow-md shadow-indigo-500/25 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isApprovingRec ? 'Approving...' : 'Approve Recommendation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metric Quick Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          title="Current Population"
          value={(currentCrowdStatus?.currentPeopleCount ?? 0).toLocaleString()}
          subtext="Live CCTV telemetry"
          icon={Users}
        />
        <StatCard
          title="30s Net Flow"
          value={`${(currentCrowdStatus?.netFlow ?? 0) > 0 ? '+' : ''}${currentCrowdStatus?.netFlow ?? 0}/30s`}
          subtext={`In: ${currentCrowdStatus?.currentInflow ?? 0} | Out: ${currentCrowdStatus?.currentOutflow ?? 0}`}
          icon={Activity}
          badgeType={(currentCrowdStatus?.netFlow ?? 0) > 20 ? 'amber' : 'emerald'}
        />
        <StatCard
          title="Average Occupancy"
          value={`${currentCrowdStatus?.occupancyPercent ?? 0}%`}
          subtext={`Density: ${currentCrowdStatus?.densityLevel || 'LOW'}`}
          icon={Layers}
          badgeType={(currentCrowdStatus?.occupancyPercent ?? 0) > 80 ? 'rose' : 'cyan'}
        />
        <StatCard
          title="Active Alerts"
          value={safeActiveAlerts.length}
          subtext={`${safeCriticalAlerts.length} Critical`}
          icon={Bell}
          badgeType={safeCriticalAlerts.length > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          title="Activity Audit Events"
          value={activityLogs.length}
          subtext="Real-time log trail"
          icon={Radio}
          badgeType="emerald"
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-700 border-t-2 border-blue-600 border-x border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-blue-600" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Embedded Google Live Map with Weather & Density Pins */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Global Mapbox Geospatial Map • Weather Overlay & Density Ingress</span>
                </h3>

                {/* Venue Map Artwork Upload Button */}
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMapFileUpload}
                    accept=".png,.jpeg,.jpg,.svg,image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={venueMapUploading}
                    className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{venueMapUploading ? 'Parsing Map Artwork...' : 'Upload Venue Map Artwork'}</span>
                  </button>
                </div>
              </div>

              <MapboxLiveMap
                lat={(event as any)?.latitude || 19.0635}
                lng={(event as any)?.longitude || 72.86744}
                venueName={event?.venueName || 'Apex Stadium Ground'}
                eventId={event?.id || eventId}
                crowdCount={currentCrowdStatus?.currentPeopleCount || 4120}
                densityLevel={currentCrowdStatus?.densityLevel || 'LOW'}
                occupancyPercent={currentCrowdStatus?.occupancyPercent || 48}
                height="380px"
              />
            </div>

            {/* Live 30s Telemetry Inflow/Outflow Graph */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ingress & Egress Dynamics</h3>
                  <p className="text-xs text-slate-500 font-medium">Virtual line crossing telemetry (30-second sliding windows via SSE)</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" /> Inflow
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs" /> Outflow
                  </span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetryChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                    />
                    <Area type="monotone" dataKey="inflow" stroke="#10b981" fillOpacity={1} fill="url(#colorInflow)" strokeWidth={2} />
                    <Area type="monotone" dataKey="outflow" stroke="#f43f5e" fillOpacity={1} fill="url(#colorOutflow)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Status of Gates & Zones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Gate Management</h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {autonomousMode ? '🤖 AUTO-MANAGED' : 'MANUAL TOGGLES'}
                  </span>
                </div>
                <div className="space-y-2">
                  {safeGateStatuses.length === 0 ? (
                    <div className="text-xs text-slate-400 py-2">No gates configured.</div>
                  ) : (
                    safeGateStatuses.map(g => (
                      <div key={g.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{g.name}</span>
                          <span className="text-slate-500 font-mono text-[10px] ml-2">[{g.gateCode || 'GATE'}]</span>
                          <div className="text-[10px] text-slate-500 font-mono">{g.currentCount}/{g.capacity} attendees</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={g.status} type="gate" />
                          {!autonomousMode ? (
                            <button
                              type="button"
                              onClick={() => handleToggleGate(g.id, g.status)}
                              className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                g.status === 'OPEN' 
                                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-700' 
                                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                              }`}
                            >
                              {g.status === 'OPEN' ? 'Close' : 'Open'}
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              LOCKED
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Heatmap Preview in Overview */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    <span>Venue Density Heatmap</span>
                  </h4>
                  <button 
                    onClick={() => setActiveTab('heatmap')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-2">
                  {heatmapZones.slice(0, 4).map(hz => (
                    <div key={hz.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{hz.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                          <span>Flow: {hz.direction}</span>
                          <span>•</span>
                          <span>Speed: {hz.speedMps.toFixed(2)} m/s</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          hz.densityStatus === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          hz.densityStatus === 'BUSY' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {hz.occupancy}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* AI Decision Engine Card */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-900 rounded-2xl p-5 text-white shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-200">
                    Direct AI Decision Engine
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-200">
                  {autonomousMode ? 'AUTO-DISPATCH' : 'MANUAL APPROVAL'}
                </span>
              </div>

              <p className="text-xs text-slate-300">
                Predictive congestion alerts (density &gt; 85%) trigger autonomous structured payloads to reroute crowd paths.
              </p>

              {safeLatestPredictions.length > 0 ? (
                <div className="p-3 rounded-xl bg-white/10 border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Zone {safeLatestPredictions[0]?.zoneId}</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {safeLatestPredictions[0]?.predictedOccupancyPercent}% predicted
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">
                    Model: {safeLatestPredictions[0]?.modelName} • Confidence: {safeLatestPredictions[0]?.confidence}%
                  </div>

                  {!autonomousMode ? (
                    <button
                      type="button"
                      disabled={aiDecisionExecuting}
                      onClick={() => {
                        const targetGate = safeGateStatuses[0]?.id || 'gate_1';
                        dispatchAiDecision({
                          action: 'OPEN',
                          gate: targetGate,
                          reason: 'Manual execution of AI congestion forecast recommendation',
                          confidence: Number(safeLatestPredictions[0]?.confidence) || 0.92
                        });
                      }}
                      className="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Execute Recommended Gate Action</span>
                    </button>
                  ) : (
                    <div className="mt-2 p-2 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-[11px] text-indigo-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Autonomous dispatch armed — will auto-divert upon surge.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center">
                  All predictive models nominal. No surge diversion required.
                </div>
              )}
            </div>

            {/* Quick Dispatch Alert */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span>Broadcast Event Alert</span>
              </h3>
              <form onSubmit={handleCreateAlert} className="space-y-3 text-xs">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Alert Title (e.g. North Gate Bottleneck)"
                    value={newAlertTitle}
                    onChange={e => setNewAlertTitle(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <select
                    value={newAlertSeverity}
                    onChange={e => setNewAlertSeverity(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:border-blue-500 focus:outline-none font-mono"
                  >
                    <option value="INFO">INFO</option>
                    <option value="WARNING">WARNING</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div>
                  <textarea
                    rows={2}
                    required
                    placeholder="Public message (visible to attendees)..."
                    value={newAlertPublicMsg}
                    onChange={e => setNewAlertPublicMsg(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingAlert}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isCreatingAlert ? 'Broadcasting...' : 'Broadcast Alert'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Venue Heatmap & Flow Vectors */}
      {activeTab === 'heatmap' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span>Interactive Venue Crowd-Density Heatmap & Movement Vectors</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Aggregated from computer vision telemetry across monitored zones and gate turnstiles
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  &lt;40% Nominal
                </span>
                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  40-84% Dense
                </span>
                <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                  85%+ Bottleneck
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {heatmapZones.map(hz => (
                <div
                  key={hz.id}
                  className={`p-5 rounded-2xl border transition-all shadow-xs ${
                    hz.densityStatus === 'CRITICAL'
                      ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200'
                      : hz.densityStatus === 'BUSY'
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-extrabold text-sm text-slate-900">{hz.name}</h4>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono uppercase ${
                      hz.densityStatus === 'CRITICAL' ? 'bg-rose-600 text-white' :
                      hz.densityStatus === 'BUSY' ? 'bg-amber-500 text-white' :
                      'bg-emerald-600 text-white'
                    }`}>
                      {hz.densityStatus}
                    </span>
                  </div>

                  <div className="text-2xl font-black text-slate-900 font-mono tracking-tight my-2">
                    {hz.occupancy}% <span className="text-xs font-medium text-slate-500">density</span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        hz.occupancy >= 85 ? 'bg-rose-600' : hz.occupancy >= 65 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, hz.occupancy)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 font-mono text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">FLOW VECTOR</span>
                      <span className="font-bold text-blue-700 flex items-center gap-1">
                        <Compass className="w-3 h-3" /> {hz.direction}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">VELOCITY</span>
                      <span className="font-bold text-slate-800">{hz.speedMps.toFixed(2)} m/s</span>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 flex justify-between font-mono">
                    <span>Monitored: {hz.currentCount.toLocaleString()}</span>
                    <span>Capacity: {hz.capacity.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Crowd Status & Velocity */}
      {activeTab === 'crowd-status' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">30-Second Crowd Count Progression</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">Total monitored population across all venue ingress points</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetryChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                  />
                  <Line type="monotone" dataKey="peopleCount" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} />
                  <Line type="monotone" dataKey="netFlow" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Raw Telemetry Audit Stream</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Timestamp</th>
                    <th className="py-2.5 px-3 font-bold">Zone</th>
                    <th className="py-2.5 px-3 font-bold">People Count</th>
                    <th className="py-2.5 px-3 font-bold">Inflow</th>
                    <th className="py-2.5 px-3 font-bold">Outflow</th>
                    <th className="py-2.5 px-3 font-bold">Net Flow</th>
                    <th className="py-2.5 px-3 font-bold">Density</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {safeRecentTelemetry.slice(-10).reverse().map(t => (
                    <tr key={t.id} className="hover:bg-blue-50/20">
                      <td className="py-2.5 px-3 text-slate-500">{t?.timestamp ? new Date(t.timestamp).toLocaleTimeString() : '-'}</td>
                      <td className="py-2.5 px-3 text-blue-700 font-bold">{t?.zoneId || '-'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{t?.peopleCount ?? 0}</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-bold">+{t?.inflow ?? 0}</td>
                      <td className="py-2.5 px-3 text-rose-600 font-bold">-{t?.outflow ?? 0}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{(t?.netFlow ?? 0) > 0 ? `+${t.netFlow}` : (t?.netFlow ?? 0)}</td>
                      <td className="py-2.5 px-3">{t?.densityLevel && <StatusBadge status={t.densityLevel} type="density" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Zones */}
      {activeTab === 'zones' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeZoneStatuses.length === 0 ? (
              <div className="text-xs text-slate-400 py-8 text-center col-span-3">No zones available.</div>
            ) : (
              safeZoneStatuses.map(zone => (
                <div key={zone.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">{zone.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{zone.description}</p>
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-center">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">CAPACITY</span>
                      <span className="font-bold text-slate-800">{zone.capacity}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">WARN THRESH</span>
                      <span className="font-bold text-amber-600">{zone.warningThreshold}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">CRIT THRESH</span>
                      <span className="font-bold text-rose-600">{zone.criticalThreshold}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Gates */}
      {activeTab === 'gates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {safeGateStatuses.length === 0 ? (
              <div className="text-xs text-slate-400 py-8 text-center col-span-4">No gates configured.</div>
            ) : (
              safeGateStatuses.map(gate => (
                <div key={gate.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{gate.name}</h4>
                      <span className="text-slate-500 font-mono text-[11px]">Code: {gate.gateCode}</span>
                    </div>
                    <StatusBadge status={gate.status} type="gate" />
                  </div>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gate Type:</span>
                      <span className="text-slate-900 font-semibold">{gate.gateType}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Capacity:</span>
                      <span className="text-slate-900 font-semibold">{gate.capacity}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Throughput:</span>
                      <span className="text-slate-900 font-semibold">{gate.currentCount}</span>
                    </div>
                  </div>
                  
                  {!autonomousMode ? (
                    <button
                      onClick={() => handleToggleGate(gate.id, gate.status)}
                      className="w-full py-2 text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      {gate.status === 'OPEN' ? 'Close Gate (Restricted)' : 'Re-open Gate'}
                    </button>
                  ) : (
                    <div className="w-full py-2 text-center text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg font-mono">
                      🤖 AI AUTONOMOUSLY MANAGED
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Cameras */}
      {activeTab === 'cameras' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {safeCameraStatuses.length === 0 ? (
              <div className="text-xs text-slate-400 py-8 text-center col-span-3">No cameras configured.</div>
            ) : (
              safeCameraStatuses.map(cam => (
                <div key={cam.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CameraIcon className="w-4 h-4 text-blue-600" />
                      <h4 className="font-bold text-slate-900 text-sm">{cam.name}</h4>
                    </div>
                    <StatusBadge status={cam.status} type="default" />
                  </div>
                  <div className="text-xs font-mono space-y-1 text-slate-600">
                    <div><span className="text-slate-400 font-semibold">Code:</span> {cam.cameraCode}</div>
                    <div><span className="text-slate-400 font-semibold">Source:</span> {cam.sourceType}</div>
                    <div><span className="text-slate-400 font-semibold">Zone:</span> {cam.zoneId}</div>
                    <div><span className="text-slate-400 font-semibold">Last Seen:</span> {cam.lastSeenAt ? new Date(cam.lastSeenAt).toLocaleTimeString() : '-'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Active Event Alerts ({safeActiveAlerts.length})</h3>
            <div className="space-y-3">
              {safeActiveAlerts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No active alerts for this event.</div>
              ) : (
                safeActiveAlerts.map(alert => (
                  <div key={alert.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{alert.title}</span>
                        <StatusBadge status={alert.severity} type="alert" />
                        <span className="text-[11px] text-slate-500 font-mono">[{alert.alertType}]</span>
                      </div>
                      <p className="text-xs text-slate-700"><span className="text-slate-500 font-semibold">Public:</span> {alert.publicMessage}</p>
                      {alert.internalMessage && (
                        <p className="text-xs text-amber-800 font-mono"><span className="text-amber-700 font-semibold">Internal:</span> {alert.internalMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {alert.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleUpdateAlertStatus(alert.id, 'ACKNOWLEDGED')}
                          className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-lg shadow-xs cursor-pointer"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateAlertStatus(alert.id, 'RESOLVED')}
                        className="px-3 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 rounded-lg shadow-xs cursor-pointer"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Incidents */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Open Incidents ({safeActiveIncidents.length})</h3>
            <div className="space-y-3">
              {safeActiveIncidents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No unresolved incidents logged.</div>
              ) : (
                safeActiveIncidents.map(inc => (
                  <div key={inc.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{inc.title}</span>
                        <StatusBadge status={inc.status} type="incident" />
                        <StatusBadge status={inc.severity} type="alert" />
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{inc.description}</p>
                      <p className="text-[11px] text-slate-500 font-mono">Location: {inc.location} • Reported by: {inc.reportedBy}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={inc.status}
                        onChange={e => handleUpdateIncidentStatus(inc.id, e.target.value as IncidentStatus)}
                        className="bg-white border border-slate-200 text-xs text-slate-800 font-semibold rounded-lg px-2.5 py-1.5 font-mono shadow-2xs focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="REPORTED">REPORTED</option>
                        <option value="INVESTIGATING">INVESTIGATING</option>
                        <option value="DISPATCHED">DISPATCHED</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ML Decision Engine */}
      {activeTab === 'predictions' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>AI Predictive Decision Engine</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Autonomous crowd redistribution algorithms with dynamic threshold evaluation
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold font-mono ${
                autonomousMode ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
              }`}>
                {autonomousMode ? 'AUTOPILOT ARMED' : 'MANUAL APPROVAL'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeLatestPredictions.length === 0 ? (
                <div className="text-xs text-slate-400 py-8 text-center col-span-2">No predictive data available.</div>
              ) : (
                safeLatestPredictions.map(p => (
                  <div key={p.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono text-blue-700 font-bold uppercase">{p.predictionType}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">Forecast for Zone: {p.zoneId}</h4>
                      </div>
                      <StatusBadge status={p.riskLevel} type="alert" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-center shadow-2xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-semibold">PREDICTED POP</span>
                        <span className="text-slate-900 font-bold">{p.predictedPeopleCount}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-semibold">OCCUPANCY</span>
                        <span className="text-slate-900 font-bold">{p.predictedOccupancyPercent}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block font-semibold">CONFIDENCE</span>
                        <span className="text-emerald-700 font-bold">{p.confidence}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Model: {p.modelName} v{p.modelVersion}</span>
                      <span>Window: {p.inputWindow}</span>
                    </div>

                    {!autonomousMode && p.predictedOccupancyPercent > 80 && (
                      <button
                        type="button"
                        onClick={() => {
                          const targetGate = safeGateStatuses[0]?.id || 'gate_1';
                          dispatchAiDecision({
                            action: 'OPEN',
                            gate: targetGate,
                            reason: `Manual execution of AI congestion forecast recommendation for ${p.zoneId}`,
                            confidence: Number(p.confidence) || 0.92
                          });
                        }}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Trigger Relief Gate Action</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Simulations */}
      {activeTab === 'simulations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Simulate Operational Scenarios</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Evaluate consequence models for gate closures and unexpected surges before live execution.
            </p>

            <form onSubmit={handleRunSimulation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Scenario Name</label>
                <input
                  type="text"
                  required
                  value={simName}
                  onChange={e => setSimName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Scenario Archetype</label>
                <select
                  value={simScenario}
                  onChange={e => setSimScenario(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                >
                  <option value="GATE_CLOSURE">GATE_CLOSURE (Emergency shutdown)</option>
                  <option value="CROWD_SURGE">CROWD_SURGE (Unexpected +50% influx)</option>
                  <option value="ROUTE_CHANGE">ROUTE_CHANGE (Concourse evacuation)</option>
                  <option value="STAFF_REALLOCATION">STAFF_REALLOCATION (Security redistribution)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isRunningSim}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isRunningSim ? 'Executing Scenario Engine...' : 'Run Simulation'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Scenario Impact Projection</h3>
            {simResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs space-y-2 shadow-2xs">
                  <div className="text-blue-700 font-bold">{simResult?.summary || 'Scenario complete'}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">SPILLOVER RATE</span>
                      <span className="font-bold text-amber-600">+{simResult?.metrics?.spilloverRate ?? 35}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">QUEUE DELAY</span>
                      <span className="font-bold text-rose-600">+{simResult?.metrics?.queueDelayEstimate ?? 8} min</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">RISK LEVEL</span>
                      <span className="font-bold text-amber-600">{simResult?.metrics?.riskLevel || 'HIGH'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">RECOMMENDED STAFF</span>
                      <span className="font-bold text-emerald-700">+{simResult?.metrics?.recommendedStaffCount ?? 12}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 shadow-2xs">
                  <div className="font-bold mb-1">Prescribed Action:</div>
                  <div className="font-medium">{simResult?.prescribedAction || 'Direct secondary ingress gates to accept overflow tickets with handheld scanners.'}</div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs font-medium">
                Select a scenario archetype and trigger execution to view projected crowd redistribution and queuing impacts.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Activity & Audit Log */}
      {activeTab === 'activity-log' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-600" />
                  <span>Real-Time Activity & State Transition Logs</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Timeline trail of gate transitions, crowd routing shifts, and AI autonomous decisions
                </p>
              </div>
              <button
                onClick={fetchActivityLogs}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Refresh Log
              </button>
            </div>

            <div className="space-y-3">
              {activityLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No activity logged yet. Gate toggles and AI decisions will record here in real time.
                </div>
              ) : (
                activityLogs.map((log, index) => {
                  const isAi = log.userId?.includes('ai') || log.action?.includes('AUTONOMOUS');
                  const isGate = log.resourceType === 'GATE' || log.action?.includes('GATE');
                  const isRoute = log.action?.includes('ROUTE') || log.metadata?.notice;

                  return (
                    <div
                      key={log.id || index}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isAi ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                            isGate ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {log.action}
                          </span>
                          <span className="font-bold text-slate-900">
                            {log.metadata?.gateName ? `Gate: ${log.metadata.gateName}` : log.resourceId || 'System'}
                          </span>
                          {log.metadata?.confidence && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {Math.round(log.metadata.confidence * 100)}% Confidence
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 font-sans text-xs">
                          {log.metadata?.reason || log.metadata?.notice || `Executed by: ${log.userId}`}
                        </p>
                      </div>

                      <div className="text-right text-[11px] text-slate-400 shrink-0 font-mono">
                        <div>{log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString()}</div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          Source: {log.metadata?.source || log.userId}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};