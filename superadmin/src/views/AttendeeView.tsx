import React from 'react';
import AttendeeApp from '../attendee/App';

export const AttendeeView: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-slate-900 flex flex-col">
      <AttendeeApp />
    </div>
  );
};
