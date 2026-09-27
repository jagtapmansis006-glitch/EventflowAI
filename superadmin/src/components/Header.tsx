import React, { useState, useEffect } from 'react';
import { Calendar, Radio, ChevronDown, RefreshCw, PlusCircle, Mic, MicOff, Volume2, Sparkles, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { realtimeService } from '../services/realtimeService';

interface HeaderProps {
  onOpenCreateEvent?: () => void;
  onOpenQuickTest?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCreateEvent, onOpenQuickTest }) => {
  const { events, selectedEventId, setSelectedEventId, selectedEvent, refreshEvents, user } = useAuth();
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [assistantResponse, setAssistantResponse] = useState<string>(
    'EventFlow Voice Assistant standby. Click microphone or select a quick voice command.'
  );

  useEffect(() => {
    const unsub = realtimeService.onConnectionChange(conn => {
      setIsLiveConnected(conn);
    });
    return unsub;
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshEvents();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleVoiceCommand = (cmd: string) => {
    setTranscript(cmd);
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      if (cmd.includes('Gate') || cmd.includes('gate')) {
        setAssistantResponse(`[AI VOICE TELEMETRY]: Gate 1 current wait is 8 minutes. Gate 2 West is recommended at 2 minutes with low congestion.`);
      } else if (cmd.includes('surge') || cmd.includes('Surge')) {
        setAssistantResponse(`[AI SIMULATION]: Projected 15% influx surge at North Plaza. Recommending opening overflow turnstiles.`);
      } else {
        setAssistantResponse(`[AI ASSISTANT]: Command "${cmd}" processed. Monitored crowd telemetry within nominal safety parameters.`);
      }
    }, 1200);
  };

  return (
    <header
      id="command-header"
      className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between z-10 select-none shrink-0 shadow-xs"
    >
      {/* Event Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold font-mono">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>SCOPE:</span>
        </div>

        <div className="relative">
          <select
            id="header-event-select"
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="bg-white border border-slate-200 hover:border-blue-400 text-slate-800 text-xs rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-semibold appearance-none min-w-[260px] shadow-xs"
          >
            {events.map(e => (
              <option key={e.id} value={e.id} className="text-slate-800">
                {e.name} [{e.status}]
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {selectedEvent && (
          <span className={`text-[11px] px-2.5 py-0.5 rounded-md border font-mono font-medium ${
            selectedEvent.status === 'LIVE'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : selectedEvent.status === 'UPCOMING'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            {selectedEvent.venueName} • {selectedEvent.city}
          </span>
        )}
      </div>

      {/* Right side status & action buttons */}
      <div className="flex items-center gap-2.5">
        {/* Realtime Stream status indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-medium">
          <span className="relative flex h-2 w-2">
            {isLiveConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </span>
          <span className={isLiveConnected ? 'text-emerald-700 text-[11px]' : 'text-rose-700 text-[11px]'}>
            {isLiveConnected ? 'REALTIME ACTIVE' : 'CONNECTING...'}
          </span>
        </div>

        {/* AI Voice Assistant trigger button */}
        <button
          id="btn-voice-assistant"
          onClick={() => setIsVoiceOpen(true)}
          title="Open AI Voice Assistant"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors font-semibold shadow-xs"
        >
          <Mic className="w-3.5 h-3.5 text-blue-600" />
          <span>Voice AI</span>
        </button>

        {onOpenQuickTest && (
          <button
            id="btn-quick-telemetry-test"
            onClick={onOpenQuickTest}
            title="Simulate external CV line crossing input"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors font-semibold"
          >
            <Radio className="w-3.5 h-3.5 text-blue-600" />
            <span>Simulate Influx</span>
          </button>
        )}

        {onOpenCreateEvent && (
          <button
            id="btn-header-create-event"
            onClick={onOpenCreateEvent}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Event</span>
          </button>
        )}

        <button
          id="btn-header-refresh"
          onClick={handleRefresh}
          title="Refresh dashboard state"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors bg-white shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {/* User Profile Widget */}
        <div id="header-user-profile" className="flex flex-col items-end pl-2.5 ml-1 border-l border-slate-200">
          <span className="text-xs font-mono font-semibold text-slate-800 truncate max-w-[190px]">
            {user?.email || 'superadmin@eventflow.ai'}
          </span>
          <span className="text-[10px] font-bold font-mono tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 mt-0.5">
            {user?.role === 'EVENT_ADMIN' ? 'EVENT ADMIN' : 'SUPER ADMIN'}
          </span>
        </div>
      </div>

      {/* AI Voice Assistant Modal / Panel */}
      {isVoiceOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">EventFlow Voice AI</h3>
                  <p className="text-[10px] text-blue-100">Live Voice Command & Dispatch Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsVoiceOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Mic Status & Waveform */}
              <div className="flex flex-col items-center justify-center py-4 bg-blue-50/60 rounded-xl border border-blue-100">
                <button
                  onClick={() => handleVoiceCommand('Check current gate wait times')}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white ring-4 ring-rose-200 animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  }`}
                >
                  {isListening ? <Mic className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                {isListening && (
                  <div className="flex items-center gap-1.5 h-6 px-3 mt-2 bg-blue-100/80 rounded-full border border-blue-300/50">
                    <span className="w-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                    <span className="w-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s] h-5" />
                    <span className="w-1 bg-cyan-500 rounded-full animate-bounce [animation-delay:0s] h-4" />
                    <span className="w-1 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.2s] h-2.5" />
                    <span className="w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.1s] h-4.5" />
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-700 mt-2.5">
                  {isListening ? 'Listening to voice command...' : 'Tap to speak command'}
                </span>
                {transcript && (
                  <p className="text-xs text-blue-800 italic mt-1 bg-white px-3 py-1 rounded-full border border-blue-200 shadow-xs">
                    "{transcript}"
                  </p>
                )}
              </div>

              {/* Response box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 mb-1">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>ASSISTANT DISPATCH:</span>
                </div>
                <p className="text-slate-800 font-medium leading-relaxed">{assistantResponse}</p>
              </div>

              {/* Quick Voice Commands */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Sample Tactical Commands
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    'Check current gate wait times',
                    'Simulate 20% ingress surge at North Gate',
                    'Broadcast congestion alert to public portal',
                    'Inspect camera feed on East Concourse'
                  ].map(cmd => (
                    <button
                      key={cmd}
                      onClick={() => handleVoiceCommand(cmd)}
                      className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-xs text-slate-700 font-medium transition-colors flex items-center justify-between group"
                    >
                      <span>"{cmd}"</span>
                      <Sparkles className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsVoiceOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
              >
                Close Assistant
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
