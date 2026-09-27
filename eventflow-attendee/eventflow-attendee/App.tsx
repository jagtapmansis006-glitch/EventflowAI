import React, { useState, useEffect } from 'react';
import AttendeeLayout from './app/user/layout';
import EventPicker from './components/user/EventPicker';
import HomePage from './app/user/home/page';
import MapPage from './app/user/map/page';
import AlertsPage from './app/user/alerts/page';
import AssistantPage from './app/user/assistant/page';
import { SelectedEventProvider, useSelectedEvent } from './lib/hooks/useSelectedEvent';

function AttendeeRoutes() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const { eventId } = useSelectedEvent();

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!eventId || pathname === '/attendee' || pathname === '/user' || pathname === '/user/events' || pathname === '/') {
    return <EventPicker />;
  }

  const renderContent = () => {
    if (pathname.includes('/map')) {
      return <MapPage />;
    }
    if (pathname.includes('/alerts')) {
      return <AlertsPage />;
    }
    if (pathname.includes('/assistant')) {
      return <AssistantPage />;
    }
    return <HomePage />;
  };

  return <AttendeeLayout>{renderContent()}</AttendeeLayout>;
}

export default function App() {
  return (
    <SelectedEventProvider>
      <AttendeeRoutes />
    </SelectedEventProvider>
  );
}