import React, { useState, useEffect } from 'react';
import {
  Activity,
  Camera as CameraIcon,
  Video,
  Cpu,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Gauge,
  Sliders,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { telemetryService } from '../services/telemetryService';
import { cameraService } from '../services/cameraService';
import { CrowdTelemetry, Camera } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TelemetryTesterModal } from '../components/TelemetryTesterModal';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export const TelemetryMonitoringPage: React.FC = () => {
  const { selectedEventId, selectedEvent, events } = useAuth();
  const [activeTab, setActiveTab] = useState<'grid' | 'analytics' | 'sensors'>('grid');
  const [telemetry, setTelemetry] = useState<CrowdTelemetry[]>([]);
  const [cameras, setCameras] = useState<(Camera & { eventName?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTelemetryAndCameras = async () => {
    setIsLoading(true);
    try {
      if (selectedEventId) {
        const telRes = await telemetryService.getTelemetryHistory(selectedEventId, undefined, 30);
        setTelemetry(telRes);
      }
      
      let combinedCameras: (Camera & { eventName?: string })[] = [];
      for (const evt of events) {
        try {
          const list = await cameraService.getEventCameras(evt.id);
          combinedCameras.push(...list.map(c => ({ ...c, eventName: evt.name })));
        } catch (_) {}
      }
      setCameras(combinedCameras);
    } catch (err) {
      console.error('Failed to sync CCTV and telemetry feeds:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetryAndCameras();
    const interval = setInterval(fetchTelemetryAndCameras, 8000);
    return () => clearInterval(interval);
  }, [selectedEventId, events]);

  const latest = telemetry[telemetry.length - 1];

  const chartData = telemetry.map(t => ({
    time: new Date(t.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
    inflow: t.inflow,
    outflow: t.outflow,
    netFlow: t.netFlow,
    peopleCount: t.peopleCount
  }));

  // Fallback demo cameras if database camera collection is currently empty
  const activeCameras = cameras.length > 0 ? cameras : [
    {
      id: 'cam_n_plaza_01',
      name: 'North Plaza Gate 1 Entrance',
      cameraCode: 'CAM-NP-01',
      zoneId: 'North Plaza',
      sourceType: 'VIDEO_FILE' as const,
      status: 'ONLINE' as const,
      sourceUrl: './cameras/camera_1/feed.mp4',
      eventId: selectedEventId || 'ev_algeria',
      venueId: 'v_panvel',
      isActive: true,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cam_east_conc_03',
      name: 'East Concourse Transit Feeder',
      cameraCode: 'CAM-EC-03',
      zoneId: 'East Concourse',
      sourceType: 'VIDEO_FILE' as const,
      status: 'ONLINE' as const,
      sourceUrl: './cameras/camera_2/feed.mp4',
      eventId: selectedEventId || 'ev_algeria',
      venueId: 'v_panvel',
      isActive: true,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cam_bowl_pan_04',
      name: 'Main Bowl Panoramic Arena',
      cameraCode: 'CAM-MB-04',
      zoneId: 'Main Bowl',
      sourceType: 'VIDEO_FILE' as const,
      status: 'ONLINE' as const,
      sourceUrl: './cameras/camera_3/feed.mp4',
      eventId: selectedEventId || 'ev_algeria',
      venueId: 'v_panvel',
      isActive: true,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  return (
    <div id="cctv-telemetry-page" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header & Mode Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
              <CameraIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                CCTV Video Streams & CV Telemetry Feeds
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Multi-camera optical crossing lines, YOLO object detection grids & real-time telemetry ingestion
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveTab('grid')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CCTV Grid
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'analytics' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flow Analytics
            </button>
            <button
              onClick={() => setActiveTab('sensors')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'sensors' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hardware Registry
            </button>
          </div>

          <button
            onClick={() => setIsTesterOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors"
          >
            <Cpu className="w-4 h-4" />
            <span>Simulate CV Input</span>
          </button>
          <button
            onClick={fetchTelemetryAndCameras}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Scope Pill Banner */}
      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-700 shadow-xs">
        <div>
          <span className="text-slate-500 font-bold">EVENT SCOPE:</span>{' '}
          <span className="font-bold text-blue-700">{selectedEvent?.name || 'All Assigned Events'}</span>
        </div>
        <div>
          <span className="text-slate-500 font-bold">PIPELINE:</span> <span className="font-semibold text-slate-800">YOLOv8 + ByteTrack (Inflow/Outflow)</span>
        </div>
        <div>
          <span className="text-slate-500 font-bold">INGESTION:</span> <span className="font-semibold text-slate-800">/api/v1/internal/telemetry</span>
        </div>
      </div>

      {/* TAB 1: Real-Time CCTV Feed Cards Grid */}
      {activeTab === 'grid' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCameras.map((cam, idx) => (
              <div
                key={cam.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Camera Feed Simulated Player */}
                <div className="relative bg-slate-950 aspect-video flex flex-col justify-between p-3 overflow-hidden group">
                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px]" />
                  
                  {/* Top Feed Info */}
                  <div className="relative z-10 flex items-center justify-between text-xs text-white">
                    <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm font-mono text-[10px] font-bold">
                      {cam.cameraCode}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/80 backdrop-blur-sm text-white font-mono text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      REC • LIVE
                    </span>
                  </div>

                  {/* Bounding Box Simulation Visual */}
                  <div className="relative z-10 my-auto text-center">
                    <div className="inline-block border-2 border-emerald-400 bg-emerald-500/10 px-3 py-1 rounded text-emerald-300 font-mono text-[11px] font-bold shadow-lg">
                      YOLO PERSON DETECT: ACTIVE
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      Tracking Line: [X: 0, Y: 320] → [X: 640, Y: 320]
                    </div>
                  </div>

                  {/* Bottom Stream Status */}
                  <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-300 bg-black/50 px-2 py-1 rounded backdrop-blur-xs">
                    <span>Zone: <strong className="text-white">{cam.zoneId}</strong></span>
                    <span>30 FPS • 720p</span>
                  </div>
                </div>

                {/* Telemetry Metrics for this Camera */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{cam.name}</h3>
                      <p className="text-xs text-slate-500">{cam.sourceType} • {cam.sourceUrl}</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      ONLINE
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs pt-2 border-t border-slate-100">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-sans block font-semibold">INFLOW</span>
                      <span className="font-bold text-emerald-700">+{idx === 0 ? 34 : idx === 1 ? 21 : 12}/30s</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-sans block font-semibold">OUTFLOW</span>
                      <span className="font-bold text-rose-700">-{idx === 0 ? 8 : idx === 1 ? 14 : 9}/30s</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-sans block font-semibold">SPEED</span>
                      <span className="font-bold text-blue-700">{idx === 0 ? '0.35 m/s' : idx === 1 ? '0.92 m/s' : '1.20 m/s'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Visual Chart & Inflow/Outflow Analytics */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Virtual Line Crossing Ingress / Egress Rates
              </h3>
              <div className="flex items-center gap-4 text-xs font-mono font-medium">
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" /> Inflow (People IN)
                </span>
                <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs" /> Outflow (People OUT)
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="streamIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="streamOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                  />
                  <Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#streamIn)" />
                  <Area type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#streamOut)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Latest 30s Window Snapshot
            </h3>

            {latest ? (
              <div className="space-y-3 font-mono">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">POPULATION COUNT</span>
                  <span className="text-3xl font-black text-slate-900 mt-0.5 block">{latest.peopleCount.toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] text-emerald-800 font-bold block">INFLOW</span>
                    <span className="text-lg font-black text-emerald-700">+{latest.inflow} / 30s</span>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="text-[10px] text-rose-800 font-bold block">OUTFLOW</span>
                    <span className="text-lg font-black text-rose-700">-{latest.outflow} / 30s</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-medium">Net Velocity:</span>
                    <span className={`font-bold ${latest.netFlow > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {latest.netFlow > 0 ? `+${latest.netFlow}` : latest.netFlow} people / 30s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Occupancy:</span>
                    <span className="font-bold text-slate-900">{latest.occupancyPercent}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Density Level:</span>
                    <StatusBadge status={latest.densityLevel} type="density" size="sm" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">No telemetry recorded yet.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Hardware Sensor Registry & Audit Table */}
      {activeTab === 'sensors' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Connected Optical Hardware Sensors
            </h3>
            <span className="text-xs text-slate-500 font-mono">Zero-Trust Token Protected</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-bold">Event</th>
                  <th className="py-3 px-4 font-bold">Sensor Name</th>
                  <th className="py-3 px-4 font-bold">Camera Code</th>
                  <th className="py-3 px-4 font-bold">Zone</th>
                  <th className="py-3 px-4 font-bold">Protocol</th>
                  <th className="py-3 px-4 font-bold">Hardware Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCameras.map(cam => (
                  <tr key={cam.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-blue-600 font-semibold">{cam.eventName || cam.eventId}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{cam.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{cam.cameraCode}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{cam.zoneId}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{cam.sourceType}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        ONLINE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Test Runner Modal */}
      <TelemetryTesterModal
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
        onSuccess={fetchTelemetryAndCameras}
      />
    </div>
  );
};