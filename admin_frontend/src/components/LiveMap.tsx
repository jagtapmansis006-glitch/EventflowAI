import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import {
  Hotel,
  Utensils,
  Toilet,
  Car,
  Bus,
  TrafficCone,
  Minus,
  Plus,
  Maximize2,
  X,
  Sparkles,
  SlidersHorizontal,
  DoorClosed,
  DoorOpen
} from 'lucide-react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

declare const google: any;
declare namespace google {
  namespace maps {
    type Map = any;
    type TrafficLayer = any;
    type Marker = any;
    type Circle = any;
    type Polyline = any;
    type Polygon = any;
    type Size = any;
    type Point = any;
    type LatLng = any;
    type LatLngLiteral = { lat: number; lng: number };
  }
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
// Fallback center only used if the event has no zones with coordinates yet
const FALLBACK_CENTER = { lat: 19.0635, lng: 72.86744 };

type MapFilter = 'ALL' | 'CROWD' | 'GATES' | 'ROUTES' | 'INCIDENTS' | 'CAMERAS';
type ResourceType = 'hotels' | 'restaurants' | 'washrooms' | 'parking' | 'transport';

interface SelectedGateInfo {
  id: string;
  name: string;
  locationName: string;
  status: 'OPEN' | 'CONGESTED' | 'CLOSED';
  currentCrowd: number;
  totalCapacity: number;
  flowRate: number;
  occupancyPercent: number;
  predictionText: string;
}

// Nearby venue amenities are not part of the event telemetry model (no hotels/restaurants/
// parking/transport table in the backend), so this stays as a local reference lookup keyed
// by venue. Add more venues here as needed, or replace with a places API call later.
const VENUE_RESOURCES: Record<string, Record<ResourceType, Array<{ name: string; lat: number; lng: number; details: string }>>> = {
  default: {
    hotels: [],
    restaurants: [],
    washrooms: [],
    parking: [],
    transport: [],
  },
};

function getResourcesForVenue(_venueName: string | undefined) {
  // Extend this to branch on event.venue if you add more venue POI sets later
  return VENUE_RESOURCES.default;
}

export const LiveMap: React.FC = () => {
  const { event, setSelectedItem } = useEventAdmin();
  const [filter, setFilter] = useState<MapFilter>('ALL');
  const [zoom, setZoom] = useState(16);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  const [activeGate, setActiveGate] = useState<SelectedGateInfo | null>(null);

  const [layers, setLayers] = useState({
    hotels: false,
    restaurants: false,
    washrooms: false,
    parking: false,
    transport: false,
    traffic: false,
  });

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const operationalObjectsRef = useRef<(google.maps.Marker | google.maps.Circle | google.maps.Polyline | google.maps.Polygon)[]>([]);
  const resourceMarkersRef = useRef<Record<string, google.maps.Marker[]>>({});

  // ---- derive real geo data from the live event ----
  const realZones = useMemo(() => {
    return (event?.zones || []).filter(
      (z: any) => typeof z.latitude === 'number' && typeof z.longitude === 'number'
    );
  }, [event]);

  const realGates = useMemo(() => {
    return (event?.gates || []).filter(
      (g: any) => typeof g.latitude === 'number' && typeof g.longitude === 'number'
    );
  }, [event]);

  const realFacilities = useMemo(() => {
    return (event?.facilities || []).filter(
      (f: any) => typeof f.latitude === 'number' && typeof f.longitude === 'number'
    );
  }, [event]);

  const zoneLookup = useMemo(() => {
    const map: Record<string, any> = {};
    realZones.forEach((z: any) => { map[z.id] = z; });
    return map;
  }, [realZones]);

  const mapCenter = useMemo(() => {
    if (realZones.length > 0) {
      const avgLat = realZones.reduce((s: number, z: any) => s + z.latitude, 0) / realZones.length;
      const avgLng = realZones.reduce((s: number, z: any) => s + z.longitude, 0) / realZones.length;
      return { lat: avgLat, lng: avgLng };
    }
    if (realGates.length > 0) {
      const avgLat = realGates.reduce((s: number, g: any) => s + g.latitude, 0) / realGates.length;
      const avgLng = realGates.reduce((s: number, g: any) => s + g.longitude, 0) / realGates.length;
      return { lat: avgLat, lng: avgLng };
    }
    return FALLBACK_CENTER;
  }, [realZones, realGates]);

  const densityColor = (status: string) => {
    if (status === 'CRITICAL') return '#ef4444';
    if (status === 'WARNING' || status === 'BUSY') return '#f59e0b';
    return '#10b981';
  };

  // ---- init map ----
  useEffect(() => {
    if (!mapRef.current) return;
    if (!GOOGLE_MAPS_KEY) {
      setMapLoadError('VITE_GOOGLE_MAPS_API_KEY is missing from admin_frontend/.env');
      return;
    }
    let isCancelled = false;

    // Surfaces Google's own auth failure (bad key / restrictions / billing) as visible text
    // instead of a silent blank map.
    (window as any).gm_authFailure = () => {
      if (!isCancelled) {
        setMapLoadError(
          'Google Maps rejected this API key (gm_authFailure). Check: Maps JavaScript API enabled, billing enabled, and HTTP referrer restrictions allow this origin.'
        );
      }
    };

    async function initMap() {
      try {
        setOptions({ key: GOOGLE_MAPS_KEY, v: 'weekly' });
        await importLibrary('maps');

        if (isCancelled || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: mapCenter,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
          ]
        });

        mapInstance.current = map;
        const traffic = new google.maps.TrafficLayer();
        trafficLayerRef.current = traffic;

        setMapReady(true);
      } catch (err: any) {
        console.error("Google Maps load error:", err);
        setMapLoadError(err?.message || 'Failed to load Google Maps script.');
      }
    }

    initMap();
    return () => { isCancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center once we know the real event's coordinates (map may init before event loads)
  useEffect(() => {
    if (mapReady && mapInstance.current) {
      mapInstance.current.panTo(mapCenter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, mapCenter.lat, mapCenter.lng]);

  useEffect(() => {
    if (!trafficLayerRef.current || !mapInstance.current) return;
    trafficLayerRef.current.setMap(layers.traffic ? mapInstance.current : null);
  }, [layers.traffic, mapReady]);

  const clearOperational = () => {
    operationalObjectsRef.current.forEach(obj => obj.setMap(null));
    operationalObjectsRef.current = [];
  };

  // ---- draw real operational data ----
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    clearOperational();
    const map = mapInstance.current;

    const showCrowd = filter === 'ALL' || filter === 'CROWD';
    const showGates = filter === 'ALL' || filter === 'GATES';
    const showRoutes = filter === 'ALL' || filter === 'ROUTES';
    const showCameras = filter === 'ALL' || filter === 'CAMERAS';
    const showIncidents = filter === 'ALL' || filter === 'INCIDENTS';

    if (showCrowd) {
      realZones.forEach((z: any) => {
        const color = densityColor(z.status);
        const radius = 60 + Math.min(120, (z.density || 0) * 1.2);

        const circle = new google.maps.Circle({
          map,
          center: { lat: z.latitude, lng: z.longitude },
          radius,
          fillColor: color,
          fillOpacity: 0.16,
          strokeColor: color,
          strokeWeight: 2,
          clickable: true,
        });
        circle.addListener('click', () => setSelectedItem?.({ type: 'ZONE', data: z }));
        operationalObjectsRef.current.push(circle);

        const label = new google.maps.Marker({
          map,
          position: { lat: z.latitude, lng: z.longitude },
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
          label: {
            text: `${z.name} • ${z.density}%`,
            color: '#1e293b',
            fontSize: '11px',
            fontWeight: 'bold',
          },
          clickable: false,
        });
        operationalObjectsRef.current.push(label);
      });
    }

    if (showRoutes) {
      (event?.routes || []).forEach((r: any) => {
        const from = zoneLookup[r.fromZoneId];
        const to = zoneLookup[r.toZoneId];
        if (!from || !to) return;

        const line = new google.maps.Polyline({
          map,
          path: [
            { lat: from.latitude, lng: from.longitude },
            { lat: to.latitude, lng: to.longitude },
          ],
          strokeColor: r.status === 'REDIRECTED' ? '#f97316' : '#64748b',
          strokeWeight: 4,
          strokeOpacity: 0.85,
        });
        operationalObjectsRef.current.push(line);
      });
    }

    if (showGates) {
      realGates.forEach((g: any) => {
        const gateColor = g.status === 'CLOSED' ? '#64748b' : (g.flowRate > 80 ? '#ef4444' : '#10b981');

        const marker = new google.maps.Marker({
          map,
          position: { lat: g.latitude, lng: g.longitude },
          title: g.name,
          label: {
            text: `${g.name} ${g.status}`,
            color: '#0f172a',
            fontSize: '10px',
            fontWeight: 'bold'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: gateColor,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }
        });

        marker.addListener('click', () => {
          const info: SelectedGateInfo = {
            id: g.id,
            name: g.name,
            locationName: g.name,
            status: g.status === 'CLOSED' ? 'CLOSED' : (g.flowRate > 80 ? 'CONGESTED' : 'OPEN'),
            currentCrowd: g.currentCount || 0,
            totalCapacity: g.capacity || 0,
            flowRate: g.flowRate || 0,
            occupancyPercent: g.capacity ? Math.round(((g.currentCount || 0) / g.capacity) * 100) : 0,
            predictionText: g.status === 'CLOSED'
              ? 'Gate currently closed.'
              : `Live flow rate is ${g.flowRate || 0} per minute.`,
          };
          setActiveGate(info);
          setSelectedItem?.({ type: 'GATE', data: g });
        });

        operationalObjectsRef.current.push(marker);
      });
    }

    if (showCameras) {
      (event?.cameras || []).forEach((c: any) => {
        const zone = zoneLookup[c.zoneId];
        if (!zone) return;

        const camMarker = new google.maps.Marker({
          map,
          position: { lat: zone.latitude, lng: zone.longitude },
          title: c.name || c.code,
          label: { text: c.code || c.id, color: '#0284c7', fontSize: '9px', fontWeight: 'bold' },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: c.isOnline ? '#0284c7' : '#94a3b8',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
          }
        });
        camMarker.addListener('click', () => setSelectedItem?.({ type: 'CAMERA', data: c }));
        operationalObjectsRef.current.push(camMarker);
      });
    }

    if (showIncidents) {
      (event?.incidents || []).forEach((i: any) => {
        const zone = zoneLookup[i.zoneId];
        if (!zone) return;

        const incidentMarker = new google.maps.Marker({
          map,
          position: { lat: zone.latitude, lng: zone.longitude },
          title: i.title,
          label: { text: '!', color: '#ffffff', fontSize: '10px', fontWeight: 'bold' },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }
        });
        incidentMarker.addListener('click', () => setSelectedItem?.({ type: 'INCIDENT', data: i }));
        operationalObjectsRef.current.push(incidentMarker);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, filter, event?.zones, event?.gates, event?.routes, event?.cameras, event?.incidents]);

  const toggleResource = (key: keyof typeof layers) => {
    const next = !layers[key];
    setLayers(prev => ({ ...prev, [key]: next }));

    if (key === 'traffic') return;
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    if (resourceMarkersRef.current[key]) {
      resourceMarkersRef.current[key].forEach(m => m.setMap(null));
      resourceMarkersRef.current[key] = [];
    }

    if (!next) return;

    const colorMap: Record<ResourceType, string> = {
      hotels: '#2563eb',
      restaurants: '#ea580c',
      washrooms: '#7c3aed',
      parking: '#334155',
      transport: '#0891b2',
    };

    const typeKey = key as ResourceType;
    const resources = getResourcesForVenue(event?.venue);

    // Washrooms/medical/security/info can come straight from real event facilities
    let list = resources[typeKey] || [];
    if (typeKey === 'washrooms') {
      list = realFacilities
        .filter((f: any) => f.facilityType === 'TOILET')
        .map((f: any) => ({ name: f.name, lat: f.latitude, lng: f.longitude, details: f.location || f.status }));
    }

    const createdMarkers: google.maps.Marker[] = [];

    list.forEach(item => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: item.lat, lng: item.lng },
        title: item.name,
        label: {
          text: item.name.split(' ')[0],
          color: '#ffffff',
          fontSize: '9px',
          fontWeight: 'bold',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: colorMap[typeKey],
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const info = new google.maps.InfoWindow({
        content: `
          <div style="font-family:sans-serif;padding:6px;min-width:180px;">
            <strong style="font-size:12px;color:#0f172a;display:block;">${item.name}</strong>
            <div style="font-size:11px;color:#64748b;margin-top:3px;">${item.details || ''}</div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        info.open({ map, anchor: marker });
      });

      createdMarkers.push(marker);
    });

    resourceMarkersRef.current[key] = createdMarkers;
  };

  return (
    <div id="live-map-page" className="relative w-full h-[calc(100vh-4.2rem)] overflow-hidden select-none bg-slate-100 flex">

      <div className="relative flex-1 h-full">
        <div ref={mapRef} className="absolute inset-0 w-full h-full z-0" />

        {mapLoadError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/95 p-6">
            <div className="max-w-md bg-white border border-rose-200 rounded-xl shadow-lg p-5 text-sm">
              <div className="font-bold text-rose-700 mb-1">Google Maps failed to load</div>
              <div className="text-slate-600">{mapLoadError}</div>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">

          <div className="bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-1 pointer-events-auto">
            {(['ALL', 'CROWD', 'GATES', 'ROUTES', 'INCIDENTS', 'CAMERAS'] as MapFilter[]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-slate-200 shadow-md flex items-center gap-1.5 pointer-events-auto text-xs font-semibold">
            <button
              onClick={() => toggleResource('hotels')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                layers.hotels ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Hotel size={13} />
              <span>Hotels</span>
            </button>

            <button
              onClick={() => toggleResource('restaurants')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                layers.restaurants ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Utensils size={13} />
              <span>Food</span>
            </button>

            <button
              onClick={() => toggleResource('washrooms')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                layers.washrooms ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Toilet size={13} />
              <span>Washrooms</span>
            </button>

            <button
              onClick={() => toggleResource('parking')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                layers.parking ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Car size={13} />
              <span>Parking</span>
            </button>

            <button
              onClick={() => toggleResource('transport')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                layers.transport ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Bus size={13} />
              <span>Transport</span>
            </button>

            <button
              onClick={() => toggleResource('traffic')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                layers.traffic ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <TrafficCone size={13} />
              <span>Traffic</span>
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 shadow-md text-xs font-medium text-slate-600 pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Busy / High Density</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Critical Congestion</span>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-md flex items-center gap-1 pointer-events-auto">
            <button
              onClick={() => {
                if (mapInstance.current) {
                  const z = (mapInstance.current.getZoom() || 16) - 1;
                  mapInstance.current.setZoom(z);
                  setZoom(z);
                }
              }}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-700 w-8 text-center">{zoom}</span>
            <button
              onClick={() => {
                if (mapInstance.current) {
                  const z = (mapInstance.current.getZoom() || 16) + 1;
                  mapInstance.current.setZoom(z);
                  setZoom(z);
                }
              }}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (mapInstance.current) {
                  mapInstance.current.panTo(mapCenter);
                  mapInstance.current.setZoom(16);
                  setZoom(16);
                }
              }}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 ml-0.5 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 shadow-md text-[11px] font-mono font-bold text-slate-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Google Maps + EventFlow Live Telemetry</span>
        </div>
      </div>

      {activeGate && (
        <aside className="w-80 sm:w-96 bg-white border-l border-slate-200 shadow-2xl z-30 flex flex-col justify-between p-5 animate-in slide-in-from-right duration-200 overflow-y-auto">
          <div className="space-y-6">

            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  GATE TELEMETRY &amp; CONTROLS
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-blue-600" />
                  {activeGate.locationName}
                </h3>
              </div>
              <button
                onClick={() => setActiveGate(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Operating Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  activeGate.status === 'CONGESTED'
                    ? 'bg-rose-100 text-rose-700'
                    : activeGate.status === 'CLOSED'
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {activeGate.status}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50 font-mono">
                <span className="text-slate-500 font-sans font-medium">Current Crowd</span>
                <strong className="text-slate-800">{activeGate.currentCrowd.toLocaleString()} attendees</strong>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50 font-mono">
                <span className="text-slate-500 font-sans font-medium">Total Capacity</span>
                <strong className="text-slate-800">{activeGate.totalCapacity.toLocaleString()} max</strong>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50 font-mono">
                <span className="text-slate-500 font-sans font-medium">Current Flow Rate</span>
                <strong className={activeGate.flowRate > 80 ? 'text-rose-600' : 'text-emerald-600'}>
                  +{activeGate.flowRate}/min
                </strong>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-slate-500">Occupancy</span>
                  <span className="font-mono font-bold text-slate-700">{activeGate.occupancyPercent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      activeGate.occupancyPercent >= 90
                        ? 'bg-rose-500'
                        : activeGate.occupancyPercent >= 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${activeGate.occupancyPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                AI Optical Sensor Prediction
              </span>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                {activeGate.predictionText}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
              GATE DIRECT CONTROLS
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveGate(prev => prev ? ({
                    ...prev,
                    status: prev.status === 'CLOSED' ? 'OPEN' : 'CLOSED',
                    flowRate: prev.status === 'CLOSED' ? 45 : 0
                  }) : null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition ${
                  activeGate.status === 'CLOSED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <DoorClosed className="w-3.5 h-3.5" />
                <span>{activeGate.status === 'CLOSED' ? 'OPEN GATE' : 'CLOSE GATE'}</span>
              </button>

              <button
                onClick={() => {
                  alert(`Opening Diversion Simulator for ${activeGate.name}`);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>SIMULATE</span>
              </button>
            </div>
          </div>
        </aside>
      )}

    </div>
  );
};