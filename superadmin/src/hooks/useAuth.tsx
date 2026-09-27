import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role, Event } from '../types';
import { authService } from '../services/authService';
import { eventService } from '../services/eventService';
import { realtimeService } from '../services/realtimeService';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  events: Event[];
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  selectedEvent: Event | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshEvents: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authService.getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    const token = authService.getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      const allEvents = await eventService.getAllEvents();
      setEvents(allEvents);

      if (allEvents.length > 0) {
        // If event admin, select first assigned event or first available
        const preferred = allEvents.find(e => e.status === 'LIVE') || allEvents[0];
        setSelectedEventId(preferred.id);
      }
    } catch (err) {
      authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    const handleUnauthorized = () => {
      setUser(null);
      setEvents([]);
    };
    window.addEventListener('eventflow_auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('eventflow_auth_unauthorized', handleUnauthorized);
  }, [loadInitialData]);

  // Connect realtime SSE whenever selectedEventId or user changes
  useEffect(() => {
    if (user) {
      realtimeService.connect(selectedEventId);
    } else {
      realtimeService.disconnect();
    }
    return () => {
      realtimeService.disconnect();
    };
  }, [user, selectedEventId]);

  const refreshEvents = async () => {
    if (!user) return;
    try {
      const allEvents = await eventService.getAllEvents();
      setEvents(allEvents);
    } catch (_) {}
  };

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setUser(res.user);
    const allEvents = await eventService.getAllEvents();
    setEvents(allEvents);
    if (allEvents.length > 0) {
      const preferred = allEvents.find(e => e.status === 'LIVE') || allEvents[0];
      setSelectedEventId(preferred.id);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setEvents([]);
    setSelectedEventId('');
  };

  const selectedEvent = events.find(e => e.id === selectedEventId) || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: Boolean(user),
        isLoading,
        events,
        selectedEventId,
        setSelectedEventId,
        selectedEvent,
        login,
        logout,
        refreshEvents
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
