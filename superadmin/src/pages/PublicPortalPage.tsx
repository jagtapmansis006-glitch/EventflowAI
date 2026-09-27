import React, { useState, useEffect } from 'react';
import {
  Shield,
  Radio,
  Clock,
  DoorOpen,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { publicService } from '../services/publicService';
import { PublicEventDetails } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface PublicPortalPageProps {
  initialSlug?: string;
  onExit?: () => void;
}

export const PublicPortalPage: React.FC<PublicPortalPageProps> = ({
  initialSlug = 'apex-summit-2026',
  onExit
}) => {
  const [slug, setSlug] = useState(initialSlug);
  const [eventData, setEventData] = useState<PublicEventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchPublicData = async (targetSlug: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await publicService.getPublicEvent(targetSlug);
      setEventData(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch public event information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData(slug);
    const interval = setInterval(() => {
      fetchPublicData(slug);
    }, 20000); // 20-second automatic refresh
    return () => clearInterval(interval);
  }, [slug]);

  const densityDescriptions: Record<string, { label: string; desc: string; color: string; badge: string }> = {
    LOW: {
      label: 'Low Crowd Density',
      desc: 'Free movement across all concourses. Turnstiles running with minimal queues.',
      color: 'border-emerald-300 bg-emerald-50 text-emerald-950',
      badge: 'NORMAL CROWD'
    },
    MODERATE: {
      label: 'Moderate Density',
      desc: 'Expect moderate wait times at main gates. Concourse moving at steady walking pace.',
      color: 'border-blue-300 bg-blue-50 text-blue-950',
      badge: 'EXPECT QUEUES'
    },
    BUSY: {
      label: 'Heavy Congestion',
      desc: 'High foot traffic. Please consider using secondary or express gates.',
      color: 'border-amber-300 bg-amber-50 text-amber-950',
      badge: 'HEAVY CONGESTION'
    },
    CRITICAL: {
      label: 'Critical Ingress Surge',
      desc: 'Primary access lanes heavily congested. Follow venue marshals and use alternate gates.',
      color: 'border-rose-300 bg-rose-50 text-rose-950',
      badge: 'AVOID AREA / USE ALTERNATE GATES'
    }
  };

  const crowdLevel = eventData?.crowdStatus?.densityLevel || 'LOW';
  const densityInfo = densityDescriptions[crowdLevel] || densityDescriptions.LOW;

  return (
    <div id="public-safety-portal" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onExit && (
              <button
                onClick={onExit}
                className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800 font-semibold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Return to Ops Console</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-bold tracking-tight text-slate-900">EventFlow Attendee Safety Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Feed
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Updated {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
        {/* Event Selector / Slug Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-xs text-slate-600 font-bold">Viewing Public Safety Feed for:</span>
          <div className="flex items-center gap-2">
            {[
              { label: 'Apex World Stadium Championship', slugVal: 'apex-summit-2026' },
              { label: 'Metropolis Soundwave Expo', slugVal: 'metropolis-soundwave' },
              { label: 'Global AI Summit', slugVal: 'cybertech-con-2026' }
            ].map(item => (
              <button
                key={item.slugVal}
                onClick={() => setSlug(item.slugVal)}
                className={`px-3 py-1.5 text-xs rounded-lg font-mono font-medium transition-colors cursor-pointer ${
                  slug === item.slugVal
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && !eventData ? (
          <div className="p-16 text-center text-slate-500 flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Connecting to public safety network...</span>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
            <p className="font-bold">{error}</p>
          </div>
        ) : eventData ? (
          <>
            {/* Event Overview Hero */}
            <div className="border border-blue-200 bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-lg">
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-blue-100 text-xs font-mono font-bold">
                  <span>PUBLIC ATTENDEE ADVISORY</span>
                  <span>•</span>
                  <span>{eventData.city}</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                  {eventData.name}
                </h1>
                <p className="text-blue-100 text-sm max-w-2xl font-medium">
                  Venue: <span className="font-bold text-white">{eventData.venueName}</span>
                </p>
              </div>
            </div>

            {/* Public Crowd Indicator Card */}
            <div className={`border rounded-2xl p-6 sm:p-8 transition-all shadow-xs ${densityInfo.color}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider block text-slate-600">
                    Real-time Venue Ingress Status
                  </span>
                  <div className="text-2xl sm:text-3xl font-black mt-1 tracking-tight text-slate-900">
                    {densityInfo.label}
                  </div>
                  <p className="text-sm mt-2 max-w-xl text-slate-700 font-medium leading-relaxed">
                    {densityInfo.desc}
                  </p>
                </div>
                <div className="self-start sm:self-auto">
                  <span className="inline-block px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase font-mono shadow-xs bg-white border border-slate-300 text-slate-900">
                    {densityInfo.badge}
                  </span>
                </div>
              </div>
            </div>

            {/* Public Gate Recommendations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <DoorOpen className="w-5 h-5 text-blue-600" />
                  <span>Gate Status & Wait Times</span>
                </h2>
                <span className="text-xs text-slate-500 font-mono font-semibold">
                  Recommended arrival routing
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(eventData.gateStatuses || []).map(gate => {
                  const isRec = gate.recommendation === 'RECOMMENDED';
                  const isClosed = gate.status === 'CLOSED';
                  return (
                    <div
                      key={gate.name}
                      className={`p-5 rounded-xl border transition-all ${
                        isClosed
                          ? 'bg-rose-50/50 border-rose-200 text-slate-600'
                          : isRec
                          ? 'bg-emerald-50 border-emerald-300 text-slate-900 shadow-xs ring-2 ring-emerald-400/30'
                          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-base text-slate-900">{gate.name}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            isClosed
                              ? 'bg-rose-100 text-rose-800'
                              : isRec
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {gate.recommendation}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-500 font-medium">
                          <span>Gate Status:</span>
                          <span className={`font-bold ${gate.status === 'OPEN' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {gate.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500 font-medium">
                          <span>Est. Wait Time:</span>
                          <span className="font-bold font-mono text-slate-900">
                            {gate.waitMinutes} mins
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Public Safety Alerts */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Official Safety Broadcasts</span>
              </h2>

              {(eventData.publicAlerts || []).length === 0 ? (
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-500 font-medium shadow-xs">
                  No active public safety advisories at this time.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {eventData.publicAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 shadow-xs"
                    >
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{alert.title}</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-900">
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {alert.publicMessage}
                        </p>
                        <span className="text-[10px] font-mono text-slate-500 block pt-1">
                          Issued at {new Date(alert.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 font-mono">
        EventFlow AI Autonomous Crowd Telemetry & Safety System • Public Feed Node
      </footer>
    </div>
  );
};
