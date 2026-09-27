/**
 * Web app manifest. Add icons at public/icons/icon-192.png, icon-512.png and
 * icon-maskable-512.png before shipping, or "Add to Home Screen" won't offer install.
 */
export default function manifest(): any {
  return {
    name: 'EventFlow-AI Attendee',
    short_name: 'EventFlow',
    description: 'Live crowd levels, wayfinding, alerts and an AI concierge for your event.',
    start_url: '/user/home',
    scope: '/user/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
