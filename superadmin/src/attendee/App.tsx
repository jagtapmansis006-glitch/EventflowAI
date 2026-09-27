import React from 'react';
import AttendeeLayout from './app/user/layout';
import HomePage from './app/user/home/page';
import MapPage from './app/user/map/page';
import AlertsPage from './app/user/alerts/page';
import AssistantPage from './app/user/assistant/page';
import { usePathname } from './lib/navigation';

export default function App() {
  const pathname = usePathname();

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

  return (
    <AttendeeLayout>
      {renderContent()}
    </AttendeeLayout>
  );
}
