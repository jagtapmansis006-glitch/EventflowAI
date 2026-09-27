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
import { SuperAdminModal } from './components/SuperAdminModal.tsx';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Login } from './components/Login.tsx';
import { getToken } from './api.ts';

const MainLayout: React.FC = () => {
  const { activeTab, loading, error, refreshEvent } = useEventAdmin();
  const [superAdminModalOpen, setSuperAdminModalOpen] = useState(false);

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
      {/* Minimal Operations Sidebar */}
      <Sidebar onOpenSuperAdminModal={() => setSuperAdminModalOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Dynamic Main Page Views (ONLY 3) */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'COMMAND_CENTER' && <CommandCenter />}
          {activeTab === 'LIVE_MAP' && <LiveMap />}
          {activeTab === 'EVENT_REPORT' && <EventReport />}
        </main>
      </div>

      {/* Interactive Contextual Side Panel */}
      <SidePanel />

      {/* What-If Simulation Modal */}
      <SimulationModal />

      {/* Action-Based Voice Assistant Modal */}
      <VoiceAssistantModal />

      {/* Super Admin Multi-Event Creation Modal */}
      <SuperAdminModal 
        isOpen={superAdminModalOpen} 
        onClose={() => setSuperAdminModalOpen(false)} 
        onSuccess={() => refreshEvent()}
      />
    </div>
  );
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());

  if (!loggedIn) {
    return <Login onLoggedIn={() => setLoggedIn(true)} />;
  }

  return (
    <EventAdminProvider>
      <MainLayout />
    </EventAdminProvider>
  );
}
