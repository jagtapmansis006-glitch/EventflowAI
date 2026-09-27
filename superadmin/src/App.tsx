import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EventsPage } from './pages/EventsPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { EventAdminsPage } from './pages/EventAdminsPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { LiveEventsPage } from './pages/LiveEventsPage';
import { GlobalAnalyticsPage } from './pages/GlobalAnalyticsPage';
import { AlertsIncidentPage } from './pages/AlertsIncidentPage';
import { CamerasPage } from './pages/CamerasPage';
import { TelemetryMonitoringPage } from './pages/TelemetryMonitoringPage';
import { SimulationsPage } from './pages/SimulationsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SystemSettingsPage } from './pages/SystemSettingsPage';
import { PublicPortalPage } from './pages/PublicPortalPage';
import { AutonomousOpsPage } from './pages/autonomousOpspage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TelemetryTesterModal } from './components/TelemetryTesterModal';
import { CreateEventModal } from './components/CreateEventModal';
import { RoleInterconnectBanner } from './components/RoleInterconnectBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EventHeadView } from './views/EventHeadView';
import { AttendeeView } from './views/AttendeeView';

// Super Admin Layout Stage
const SuperAdminLayout: React.FC = () => {
  const { selectedEventId, setSelectedEventId, refreshEvents } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isTesterOpen, setIsTesterOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentTab('event-details');
  };

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard
            onSelectEvent={handleSelectEvent}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        );
      case 'autonomous-ops':
        return <AutonomousOpsPage />;
      case 'events':
        return <EventsPage onSelectEvent={handleSelectEvent} />;
      case 'event-details':
        return (
          <EventDetailsPage
            eventId={selectedEventId}
            onBack={() => setCurrentTab('events')}
          />
        );
      case 'event-admins':
        return <EventAdminsPage />;
      case 'super-admins':
        return <SuperAdminPage />;
      case 'live-events':
        return <LiveEventsPage onSelectEvent={handleSelectEvent} />;
      case 'analytics':
        return <GlobalAnalyticsPage />;
      case 'alerts':
      case 'incidents':
        return <AlertsIncidentPage />;
      case 'cameras':
        return <CamerasPage />;
      case 'telemetry':
        return <TelemetryMonitoringPage />;
      case 'simulations':
        return <SimulationsPage />;
      case 'audit-logs':
        return <AuditLogsPage />;
      case 'settings':
        return <SystemSettingsPage />;
      default:
        return (
          <Dashboard
            onSelectEvent={handleSelectEvent}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 antialiased">
      <RoleInterconnectBanner currentView="SUPER_ADMIN" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar navigation */}
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* Main command stage */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
          <Header
            onOpenQuickTest={() => setIsTesterOpen(true)}
            onOpenCreateEvent={() => setIsCreateEventOpen(true)}
          />

          <main className="flex-1 overflow-y-auto bg-slate-50/80">
            <ErrorBoundary fallbackTitle="Super Admin Command Stage">
              {renderActiveView()}
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* Global Ingestion Tester Modal */}
      <TelemetryTesterModal
        isOpen={isTesterOpen}
        onClose={() => setIsTesterOpen(false)}
        onSuccess={() => {}}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onCreated={() => {
          refreshEvents();
          setIsCreateEventOpen(false);
          setCurrentTab('events');
        }}
      />
    </div>
  );
};

// Route Guard & Dispatcher
const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const role = user?.role;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-blue-600 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-semibold tracking-wider text-slate-700">INITIALIZING EVENTFLOW AI CONTROL MATRIX...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Portal Route */}
      <Route
        path="/public-portal"
        element={
          <PublicPortalPage
            initialSlug="apex-summit-2026"
            onExit={() => window.location.href = '/dashboard'}
          />
        }
      />

      {/* Login Route: Unauthenticated users land here first */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={role === 'ATTENDEE' ? '/user/home' : '/dashboard'} replace />
          ) : (
            <ErrorBoundary fallbackTitle="EventFlow Authentication">
              <Login />
            </ErrorBoundary>
          )
        }
      />

      {/* Attendee Portal Routes */}
      <Route
        path="/user/*"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : role !== 'ATTENDEE' && role !== 'SUPER_ADMIN' ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <div className="min-h-screen w-screen flex flex-col bg-slate-900">
              <RoleInterconnectBanner currentView="ATTENDEE" />
              <div className="flex-1 overflow-y-auto">
                <ErrorBoundary fallbackTitle="Attendee Mobile Application">
                  <AttendeeView />
                </ErrorBoundary>
              </div>
            </div>
          )
        }
      />

      {/* Attendee Alias */}
      <Route path="/attendee/*" element={<Navigate to="/user/home" replace />} />

      {/* Main Dashboard / Operations Console */}
      <Route
        path="/dashboard"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : role === 'ATTENDEE' ? (
            <Navigate to="/user/home" replace />
          ) : role === 'EVENT_ADMIN' ? (
            <div className="min-h-screen w-screen flex flex-col bg-slate-50">
              <RoleInterconnectBanner currentView="EVENT_ADMIN" />
              <div className="flex-1 overflow-hidden">
                <ErrorBoundary fallbackTitle="Event Head Operations Console">
                  <EventHeadView />
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <SuperAdminLayout />
          )
        }
      />

      {/* Event Head Alias */}
      <Route
        path="/event-head/*"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (
            <div className="min-h-screen w-screen flex flex-col bg-slate-50">
              <RoleInterconnectBanner currentView="EVENT_ADMIN" />
              <div className="flex-1 overflow-hidden">
                <ErrorBoundary fallbackTitle="Event Head Operations Console">
                  <EventHeadView />
                </ErrorBoundary>
              </div>
            </div>
          )
        }
      />

      {/* Catch-all root route: If unauthenticated, redirect to /login immediately */}
      <Route
        path="*"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (
            <Navigate to={role === 'ATTENDEE' ? '/user/home' : '/dashboard'} replace />
          )
        }
      />
    </Routes>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="EventFlow AI System Root">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}