import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { EventData, UserSession, AuditRecord } from '../types.ts';
import { apiFetch, getToken, USER_KEY } from '../api.ts';

interface SimulationState {
  isOpen: boolean;
  data: any | null;
  loading: boolean;
}

interface EventAdminContextType {
  session: UserSession | null;
  event: EventData | null;
  allEvents: EventData[];
  loading: boolean;
  error: string | null;
  hasAssignment: boolean;
  assignedCount: number;
  myEvents: EventData[];
  selectedEventId: string | null;
  selectEvent: (eventId: string) => void;
  goBackToEvents: () => void;
  myEventsLoading: boolean;
  canAccessEvent: (eventId: string) => boolean;
  fetchMyEvents: () => Promise<void>;
  activeTab: 'COMMAND_CENTER' | 'LIVE_MAP' | 'EVENT_REPORT';
  setActiveTab: (tab: 'COMMAND_CENTER' | 'LIVE_MAP' | 'EVENT_REPORT') => void;
  selectedItem: { type: 'GATE' | 'QUEUE' | 'ZONE' | 'CAMERA' | 'INCIDENT'; data: any } | null;
  setSelectedItem: (item: { type: 'GATE' | 'QUEUE' | 'ZONE' | 'CAMERA' | 'INCIDENT'; data: any } | null) => void;
  simulation: SimulationState;
  openSimulation: (action: string, targetId?: string, prefill?: any) => Promise<void>;
  closeSimulation: () => void;
  applySimulation: (actionPayload: any) => Promise<void>;
  voiceOpen: boolean;
  setVoiceOpen: (open: boolean) => void;
  voiceLogs: { id: string; role: 'user' | 'assistant'; text: string; time: string; actionExecuted?: boolean }[];
  executeVoice: (command: string, confirmed?: boolean) => Promise<{ status: string; voiceResponse: string; requiresConfirmation?: boolean }>;
  toggleGate: (gateId: string, status?: 'OPEN' | 'CLOSED', source?: string) => Promise<void>;
  redirectRoute: (routeId: string) => Promise<void>;
  handleAlertAction: (alertId: string, actionType: string, payload?: any) => Promise<void>;
  dispatchIncidentStaff: (incidentId: string) => Promise<void>;
  switchUserRole: (role: 'EVENT_ADMIN' | 'SUPER_ADMIN', targetEventId?: string) => Promise<void>;
  createEventBySuperAdmin: (formData: any) => Promise<EventData | null>;
  auditLogs: AuditRecord[];
  fetchAuditLogs: () => Promise<void>;
  autonomousMode: boolean;
  toggleAutonomousMode: () => Promise<void>;
  dispatchAiDecision: (decision: { action: 'OPEN' | 'CLOSE'; gate: string; reason: string; confidence: number }) => Promise<void>;
  recommendations: any[];
  fetchRecommendations: (eventId?: string) => Promise<void>;
  approveRecommendation: (recId: string) => Promise<void>;
  refreshEvent: () => Promise<void>;
}

const DEFAULT_EVENT_ID = 'event_apex_summit_2026';

const EventAdminContext = createContext<EventAdminContextType | undefined>(undefined);

export const EventAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  })();

  const initialSession: UserSession | null = storedUser
    ? {
        userId: storedUser.id,
        name: storedUser.fullName,
        email: storedUser.email,
        role: storedUser.role,
        assignedEventId: storedUser.assignedEventIds?.[0],
      } as any
    : null;

  const [session, setSession] = useState<UserSession | null>(initialSession);
  const [event, setEvent] = useState<EventData | null>(null);
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [myEventsLoading, setMyEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'COMMAND_CENTER' | 'LIVE_MAP' | 'EVENT_REPORT'>('LIVE_MAP');
  const [selectedItem, setSelectedItem] = useState<{ type: 'GATE' | 'QUEUE' | 'ZONE' | 'CAMERA' | 'INCIDENT'; data: any } | null>(null);

  // RBAC: assignment status for the current user
  const [hasAssignment, setHasAssignment] = useState(true);
  const [assignedCount, setAssignedCount] = useState(0);
  const [myEvents, setMyEvents] = useState<EventData[]>([]);

  const [simulation, setSimulation] = useState<SimulationState>({
    isOpen: false,
    data: null,
    loading: false,
  });

  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceLogs, setVoiceLogs] = useState<{ id: string; role: 'user' | 'assistant'; text: string; time: string; actionExecuted?: boolean }[]>([
    {
      id: 'init_1',
      role: 'assistant',
      text: 'EventFlow Voice Assistant online. Speak a command like "Hey, open Gate 3", "What\'s the current crowd?", or "Close Gate 2".',
      time: 'Ready',
    },
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [autonomousMode, setAutonomousMode] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const fetchRecommendations = useCallback(async (eventId?: string) => {
    const targetId = eventId || selectedEventId || event?.id || DEFAULT_EVENT_ID;
    try {
      const res = await apiFetch(`/api/v1/admin/events/${targetId}/recommendations`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || data.data || []);
      }
    } catch (err) {
      console.warn('Could not fetch recommendations:', err);
    }
  }, [selectedEventId, event?.id]);

  const approveRecommendation = async (recId: string) => {
    const targetId = selectedEventId || event?.id || DEFAULT_EVENT_ID;
    try {
      await apiFetch(`/api/v1/admin/events/${targetId}/recommendations/${recId}/approve`, {
        method: 'POST'
      });
      await fetchEvent(targetId);
      await fetchRecommendations(targetId);
      fetchAuditLogs();
    } catch (err) {
      console.error('Failed to approve recommendation:', err);
    }
  };

  const fetchAutonomousMode = useCallback(async (eventId?: string) => {
    const targetId = eventId || selectedEventId || event?.id || DEFAULT_EVENT_ID;
    try {
      const res = await apiFetch(`/api/v1/admin/events/${targetId}/auto-execute`);
      if (res.ok) {
        const data = await res.json();
        setAutonomousMode(Boolean(data.autonomousMode));
      }
    } catch (err) {
      console.warn('Auto-execute state fetch error:', err);
    }
  }, [selectedEventId, event?.id]);

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const fetchSession = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        setSession(data.user || data);
        return data.user || data;
      }
    } catch (err) {
      console.warn('Could not fetch user session:', err);
    }
    return null;
  }, []);

  const fetchEvent = useCallback(async (eventId?: string) => {
    try {
      const targetId = eventId || session?.assignedEventId || DEFAULT_EVENT_ID;
      const res = await apiFetch(`/api/v1/admin/events/${targetId}/overview`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        setAllEvents([data]);
        setError(null);
      } else {
        setError(`Failed to load event data (${res.status})`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch event overview');
    } finally {
      setLoading(false);
    }
  }, [session?.assignedEventId]);

  // RBAC: fetch assignment status + accessible events list
  const fetchMyEvents = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/admin/my-events');
      if (res.ok) {
        const data = await res.json();
        setHasAssignment(!!data.hasAssignment);
        setAssignedCount(data.assignedCount || 0);
        setMyEvents(data.events || []);
      }
    } catch (err) {
      console.warn('Could not fetch my-events:', err);
    } finally {
      setMyEventsLoading(false);
    }
  }, []);

  const selectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    setLoading(true);
    fetchEvent(eventId);
  }, [fetchEvent]);

  const goBackToEvents = useCallback(() => {
    setSelectedEventId(null);
    setEvent(null);
  }, []);

  // RBAC: check access to a specific event
  const canAccessEvent = useCallback(
    (eventId: string): boolean => {
      if (session?.role === 'SUPER_ADMIN') return true;
      const match = myEvents.find((e: any) => e.id === eventId);
      return match ? (match as any).canAccess : false;
    },
    [session?.role, myEvents]
  );

  const fetchAuditLogs = useCallback(async () => {
    const targetId = event?.id || session?.assignedEventId || DEFAULT_EVENT_ID;
    try {
      const res = await apiFetch(`/api/v1/admin/events/${targetId}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(Array.isArray(data) ? data : (data.logs || []));
      }
    } catch (err) {
      console.warn('Audit logs fetch error:', err);
    }
  }, [event?.id, session?.assignedEventId]);

  useEffect(() => {
    fetchSession();
    fetchMyEvents();
  }, [fetchSession, fetchMyEvents]);

  useEffect(() => {
    if (!selectedEventId) return;
    fetchAutonomousMode(selectedEventId);
    fetchRecommendations(selectedEventId);
    const interval = setInterval(() => {
      fetchEvent(selectedEventId);
      fetchAutonomousMode(selectedEventId);
      fetchRecommendations(selectedEventId);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedEventId, fetchEvent, fetchAutonomousMode, fetchRecommendations]);

  const toggleAutonomousMode = async () => {
    const targetId = selectedEventId || event?.id || DEFAULT_EVENT_ID;
    const nextState = !autonomousMode;
    setAutonomousMode(nextState);
    try {
      await apiFetch(`/api/v1/admin/events/${targetId}/auto-execute`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: nextState })
      });
      fetchAuditLogs();
    } catch (err) {
      console.error('Failed to toggle autonomous mode:', err);
    }
  };

  const dispatchAiDecision = async (decision: { action: 'OPEN' | 'CLOSE'; gate: string; reason: string; confidence: number }) => {
    const targetId = selectedEventId || event?.id || DEFAULT_EVENT_ID;
    try {
      await apiFetch(`/api/v1/admin/events/${targetId}/ai-decision`, {
        method: 'POST',
        body: JSON.stringify({
          action: decision.action,
          gate: decision.gate,
          reason: decision.reason,
          confidence: decision.confidence,
          source: autonomousMode ? 'system_ai_autopilot' : 'human_operator_approved'
        })
      });
      await fetchEvent(targetId);
      await fetchRecommendations(targetId);
      await fetchAuditLogs();
    } catch (err) {
      console.error('Failed to dispatch AI decision:', err);
    }
  };

  const toggleGate = async (gateId: string, status?: 'OPEN' | 'CLOSED', source = 'ui') => {
    const targetEventId = event?.id || DEFAULT_EVENT_ID;
    const current = event?.gates?.find((g: any) => g.id === gateId);
    const nextStatus = status || (current?.status === 'OPEN' ? 'CLOSED' : 'OPEN');

    setEvent((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        gates: (prev.gates || []).map((g: any) => {
          if (g.id === gateId) {
            return { ...g, status: nextStatus, flowRate: nextStatus === 'OPEN' ? 45 : 0 };
          }
          return g;
        }),
      };
    });

    try {
      await apiFetch(`/api/v1/admin/events/${targetEventId}/gates/${gateId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, source }),
      });
      fetchAuditLogs();
    } catch (err) {
      console.error('Failed to toggle gate:', err);
    }
  };

  const redirectRoute = async (routeId: string) => {
    setEvent((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        routes: (prev.routes || []).map((r: any) => (r.id === routeId ? { ...r, status: 'REDIRECTED' } : r)),
      };
    });
  };

  const handleAlertAction = async (alertId: string, actionType: string, payload?: any) => {
    if (actionType === 'OPEN_GATE' && payload?.gateId) {
      if (autonomousMode) {
        await dispatchAiDecision({
          action: 'OPEN',
          gate: payload.gateId,
          reason: 'AI Autonomous Congestion Relief Action',
          confidence: 0.95
        });
      } else {
        await toggleGate(payload.gateId, 'OPEN', 'ai_apply');
      }
    }
    if (actionType === 'REDIRECT_ROUTE' && payload?.routeId) {
      await redirectRoute(payload.routeId);
    }
    setEvent((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        alerts: (prev.alerts || []).map((a: any) => (a.id === alertId ? { ...a, resolved: true } : a)),
      };
    });
  };

  const dispatchIncidentStaff = async (_incidentId: string) => {};

  const openSimulation = async (action: string, targetId?: string, prefill?: any) => {
    setSimulation({
      isOpen: true,
      data: prefill || { action, targetId },
      loading: false,
    });
  };

  const closeSimulation = () => {
    setSimulation({ isOpen: false, data: null, loading: false });
  };

  const applySimulation = async (actionPayload: any) => {
    if (actionPayload?.action === 'OPEN_GATE') {
      await toggleGate(actionPayload.targetId || 'gate_3', 'OPEN', 'ai_apply');
    }
    closeSimulation();
  };

  const executeVoice = async (
    command: string,
    confirmed: boolean = false
  ): Promise<{ status: string; voiceResponse: string; requiresConfirmation?: boolean }> => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setVoiceLogs(prev => [...prev, { id: `u_${Date.now()}`, role: 'user', text: command, time: timeStr }]);

    const targetEventId = event?.id || DEFAULT_EVENT_ID;
    let resp = "Sorry, I couldn't process that command.";
    let requiresConfirmation = false;

    try {
      const res = await apiFetch(`/api/v1/admin/events/${targetEventId}/voice-command`, {
        method: 'POST',
        body: JSON.stringify({ command, confirmed }),
      });

      if (res.ok) {
        const data = await res.json();
        resp = data.voiceResponse || resp;
        requiresConfirmation = !!data.requiresConfirmation;

        if (data.executed) {
          if (data.actionType === 'TOGGLE_GATE' && data.gateId) {
            await toggleGate(data.gateId, data.newStatus, 'voice');
          } else {
            await refreshEvent();
            fetchAuditLogs();
          }
        }
      } else {
        resp = 'Voice command failed - the server returned an error.';
      }
    } catch (err) {
      console.error('Voice command request failed:', err);
      resp = 'Voice command failed - could not reach the server.';
    }

    setVoiceLogs(prev => [
      ...prev,
      { id: `a_${Date.now()}`, role: 'assistant', text: resp, time: timeStr, actionExecuted: !requiresConfirmation },
    ]);

    speakText(resp);
    return {
      status: requiresConfirmation ? 'PENDING_CONFIRMATION' : 'EXECUTED',
      voiceResponse: resp,
      requiresConfirmation,
    };
  };

  const switchUserRole = async (role: 'EVENT_ADMIN' | 'SUPER_ADMIN', targetEventId?: string) => {
    setSession(prev => (prev ? { ...prev, role } : null));
    if (targetEventId) await fetchEvent(targetEventId);
  };

  const createEventBySuperAdmin = async (formData: any): Promise<EventData | null> => {
    const created = { ...(event || {}), ...formData, id: `event_${Date.now()}` };
    setAllEvents(prev => [...prev, created]);
    setEvent(created);
    return created;
  };

  const refreshEvent = async () => {
    if (event?.id) await fetchEvent(event.id);
  };

  return (
    <EventAdminContext.Provider
      value={{
        session,
        event,
        allEvents,
        loading,
        error,
        hasAssignment,
        assignedCount,
        myEvents,
        canAccessEvent,
        fetchMyEvents,
        activeTab,
        setActiveTab,
        selectedItem,
        setSelectedItem,
        simulation,
        openSimulation,
        closeSimulation,
        applySimulation,
        voiceOpen,
        setVoiceOpen,
        voiceLogs,
        executeVoice,
        toggleGate,
        redirectRoute,
        handleAlertAction,
        dispatchIncidentStaff,
        switchUserRole,
        createEventBySuperAdmin,
        auditLogs,
        fetchAuditLogs,
        refreshEvent,
        selectedEventId,
        selectEvent,
        goBackToEvents,
        myEventsLoading,
        autonomousMode,
        toggleAutonomousMode,
        dispatchAiDecision,
        recommendations,
        fetchRecommendations,
        approveRecommendation,
      }}
    >
      {children}
    </EventAdminContext.Provider>
  );
};

export const useEventAdmin = () => {
  const ctx = useContext(EventAdminContext);
  if (!ctx) throw new Error('useEventAdmin must be used within EventAdminProvider');
  return ctx;
};