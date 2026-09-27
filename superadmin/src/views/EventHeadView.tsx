import React from 'react';
import EventHeadApp from '../eventhead/App';

export const EventHeadView: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      <EventHeadApp />
    </div>
  );
};
