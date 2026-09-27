import React, { useState } from 'react';
import { EventAdminProvider, useEventAdmin } from './context/EventAdminContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { CommandCenter } from './components/CommandCenter.tsx';
import { LiveMap } from './components/LiveMap.tsx';
import { EventReport } from './components/EventReport.tsx';
import { SidePanel } from './components/SidePanel.tsx';
import { SimulationModal } from './components/SimulationModal.tsx';
import { VoiceAssistantModal } from './components/VoiceAssistantModal.tsx';
import { Sparkles, AlertCircle, RefreshCw, ArrowLeftRight } from 'lucide-react';
import { MyEventsPage } from './components/MyEventsPage.tsx';

const MainLayout: React.FC = () => {
  const { activeTab, loading, error, refreshEvent, goBackToEvents, event } = useEventAdmin();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-600">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 animate-bounce mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="text-base font-bold text-slate-800">
          Loading EventFlow AI Operations Console...
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Authenticating Event Admin & synchronizing venue telemetry...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="text-base font-bold text-slate-900">
          Access Restricted / Event Not Found
        </div>
        <div className="text-xs text-slate-500 mt-1 max-w-md">
          {error}
        </div>
        <button
          onClick={() => refreshEvent()}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex font-sans antialiased overflow-hidden">
      <Sidebar onOpenSuperAdminModal={() => {}} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />

        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-100">
          <div className="text-xs text-slate-500 truncate">
            Viewing: <span className="font-semibold text-slate-700">{event?.name || 'Event'}</span>
          </div>
          <button
            onClick={goBackToEvents}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Switch Event
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'COMMAND_CENTER' && <CommandCenter />}
          {activeTab === 'LIVE_MAP' && <LiveMap />}
          {activeTab === 'EVENT_REPORT' && <EventReport />}
        </main>
      </div>

      <SidePanel />
      <SimulationModal />
      <VoiceAssistantModal />
    </div>
  );
};

const AppInner: React.FC = () => {
  const { selectedEventId, myEventsLoading } = useEventAdmin();

  if (myEventsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-600">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 animate-bounce mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="text-base font-bold text-slate-800">Loading your events...</div>
      </div>
    );
  }

  if (!selectedEventId) {
    return <MyEventsPage />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <EventAdminProvider>
      <AppInner />
    </EventAdminProvider>
  );
}