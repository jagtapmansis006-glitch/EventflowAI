import React, { useState, useEffect } from 'react';
import {
  Camera as CameraIcon,
  Search,
  RefreshCw,
  Plus,
  Video,
  Radio,
  CheckCircle,
  AlertCircle,
  Lock
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cameraService } from '../services/cameraService';
import { Camera } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const CamerasPage: React.FC = () => {
  const { events } = useAuth();
  const [cameras, setCameras] = useState<(Camera & { eventName?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCameras = async () => {
    setIsLoading(true);
    try {
      let combined: (Camera & { eventName?: string })[] = [];
      for (const evt of events) {
        try {
          const list = await cameraService.getEventCameras(evt.id);
          combined.push(...list.map(c => ({ ...c, eventName: evt.name })));
        } catch (_) {}
      }
      setCameras(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (events.length > 0) {
      fetchCameras();
    }
  }, [events]);

  const filtered = cameras.filter(c => {
    const matchesSource = filterSource === 'ALL' || c.sourceType === filterSource;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cameraCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.zoneId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesSearch;
  });

  return (
    <div id="cameras-page" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CameraIcon className="w-5 h-5 text-blue-600" />
            <span>Video & Optical Line Crossing Sensors</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            RTSP streams, IP optical cameras, and CV line sensors. Hardware credentials & tokens isolated securely.
          </p>
        </div>

        <button
          onClick={fetchCameras}
          className="flex items-center gap-1.5 px-4 py-2 text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Sensor Status</span>
        </button>
      </div>

      {/* Security callout banner */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 flex items-center gap-3.5 shadow-xs">
        <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-slate-900">Zero-Trust Credential Isolation</div>
          <div className="text-xs text-slate-600 mt-0.5">
            RTSP stream credentials, passwords, and API ingestion tokens are stripped at the backend service layer and never exposed in browser runtime memory.
          </div>
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
            placeholder="Search by camera name, code, zone..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'RTSP', 'HTTP_STREAM', 'IP_CAMERA', 'WEBCAM'].map(src => (
            <button
              key={src}
              onClick={() => setFilterSource(src)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                filterSource === src
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Cameras Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 font-bold">Event</th>
                <th className="py-3.5 px-4 font-bold">Camera Name</th>
                <th className="py-3.5 px-4 font-bold">Camera Code</th>
                <th className="py-3.5 px-4 font-bold">Monitored Zone</th>
                <th className="py-3.5 px-4 font-bold">Source Protocol</th>
                <th className="py-3.5 px-4 font-bold">Hardware Status</th>
                <th className="py-3.5 px-4 font-bold">Last Telemetry Ping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No camera sensors match criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(cam => (
                  <tr key={cam.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-blue-600 font-semibold text-[11px]">
                      {cam.eventName || cam.eventId}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {cam.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      {cam.cameraCode}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      {cam.zoneId}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-semibold">
                        {cam.sourceType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium ${
                          cam.status === 'ONLINE'
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-rose-50 border border-rose-200 text-rose-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'ONLINE' ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                        {cam.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {cam.lastSeenAt ? new Date(cam.lastSeenAt).toLocaleTimeString() : 'Never'}
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
