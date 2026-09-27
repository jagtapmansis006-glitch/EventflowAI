import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Radio,
  Cpu,
  Shield,
  Key,
  Database,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';

export const SystemSettingsPage: React.FC = () => {
  const [status, setStatus] = useState<any | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedPython, setCopiedPython] = useState(false);

  useEffect(() => {
    analyticsService.getSystemStatus().then(res => setStatus(res)).catch(() => {});
  }, []);

  const curlSnippet = `curl -X POST http://localhost:3001/api/v1/internal/telemetry \\
  -H "x-api-key: eventflow_cv_secret_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "eventId": "event_apex_summit_2026",
    "cameraId": "cam_n_plaza_01",
    "zoneId": "zone_north_plaza",
    "peopleCount": 940,
    "inflow": 52,
    "outflow": 14,
    "netFlow": 38,
    "occupancyPercent": 94,
    "densityLevel": "CRITICAL",
    "queueLength": 120,
    "timestamp": "2026-09-22T16:01:00Z"
  }'`;

  const pythonSnippet = `import requests
import datetime

payload = {
    "eventId": "event_apex_summit_2026",
    "cameraId": "cam_n_plaza_01",
    "zoneId": "zone_north_plaza",
    "peopleCount": 850,
    "inflow": 48,
    "outflow": 12,
    "netFlow": 36,
    "occupancyPercent": 85,
    "densityLevel": "BUSY",
    "queueLength": 95,
    "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
}

headers = {
    "x-api-key": "eventflow_cv_secret_key",
    "Content-Type": "application/json"
}

response = requests.post("http://localhost:3001/api/v1/internal/telemetry", json=payload, headers=headers)
print("Response:", response.status_code, response.json())`;

  const handleCopy = (text: string, type: 'curl' | 'python') => {
    navigator.clipboard.writeText(text);
    if (type === 'curl') {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } else {
      setCopiedPython(true);
      setTimeout(() => setCopiedPython(false), 2000);
    }
  };

  return (
    <div id="system-settings-page" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <span>System Environment & CV Ingestion Hub</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Backend server status, real-time SSE stream configuration, and external computer vision pipeline endpoints
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Core System Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 font-mono text-xs shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
            <Server className="w-4 h-4 text-blue-600" />
            <span>Backend Server Matrix</span>
          </div>
          <div className="space-y-2 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Service:</span>
              <span className="text-blue-600 font-semibold">{status?.service || 'EventFlow AI Engine'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Environment:</span>
              <span className="font-semibold text-slate-800">{status?.environment || 'production-ready'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Database Engine:</span>
              <span className="text-emerald-700 font-semibold">Disk-Backed JSON Store</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Server Time:</span>
              <span className="font-semibold text-slate-800">{status?.serverTime ? new Date(status.serverTime).toLocaleTimeString() : 'Active'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Telemetry Engine:</span>
              <span className="text-emerald-700 font-semibold">30s Sliding Windows</span>
            </div>
          </div>
        </div>

        {/* Realtime SSE Configuration */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 font-mono text-xs shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span>Real-time Event Broadcasting</span>
          </div>
          <div className="space-y-2 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Protocol:</span>
              <span className="text-emerald-700 font-semibold">Server-Sent Events (SSE)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Channel:</span>
              <span className="text-blue-600 font-semibold">/api/v1/realtime/stream</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Heartbeat Interval:</span>
              <span className="font-semibold text-slate-800">25 Seconds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reconnection:</span>
              <span className="text-emerald-700 font-semibold">Automatic (Exponential)</span>
            </div>
          </div>
        </div>

        {/* Security & Access Policies */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 font-mono text-xs shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>RBAC & Isolation Controls</span>
          </div>
          <div className="space-y-2 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Super Admins:</span>
              <span className="text-blue-600 font-semibold">Cap: 5 Accounts Max</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Event Admins:</span>
              <span className="text-indigo-600 font-semibold">Cap: 40 Accounts Max</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Public Isolation:</span>
              <span className="text-emerald-700 font-semibold">Strict Field Stripping</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Internal Key:</span>
              <span className="text-amber-700 font-semibold">x-api-key Enforced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Python / YOLO CV Integration Snippets */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            External Computer Vision Ingestion Pipeline (YOLOv8 / DeepSORT)
          </h3>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Deploy Python optical line-crossing edge workers to stream 30-second virtual turnstile counts into EventFlow AI:
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* Curl Command */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[11px]">
              <span className="font-semibold text-slate-300">cURL Telemetry Test Snippet</span>
              <button
                onClick={() => handleCopy(curlSnippet, 'curl')}
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-sans text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-slate-200 overflow-x-auto whitespace-pre leading-relaxed text-[11px]">
              {curlSnippet}
            </pre>
          </div>

          {/* Python Snippet */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[11px]">
              <span className="font-semibold text-slate-300">Python Edge Worker Pipeline</span>
              <button
                onClick={() => handleCopy(pythonSnippet, 'python')}
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-sans text-xs px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {copiedPython ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPython ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-slate-200 overflow-x-auto whitespace-pre leading-relaxed text-[11px]">
              {pythonSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
