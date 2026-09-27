import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import { 
  Hotel,
  Utensils,
  Toilet,
  Car,
  Bus,
  RefreshCw,
  Minus,
  Plus,
  Maximize2,
  X,
  Sparkles,
  SlidersHorizontal,
  DoorClosed,
  DoorOpen,
  Camera,
  Compass,
  AlertTriangle,
  Radio
} from 'lucide-react';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFuc2lqMTIzNDU2IiwiYSI6ImNtdWpicWwxYTBxM3IyeHIyZjIzdXg0aTMifQ.F7WfQjj3iG765vg0cctLMA';
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';
const DEFAULT_CENTER: [number, number] = [72.86744, 19.0635]; // [lng, lat]

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

const BKC_RESOURCES: Record<ResourceType, Array<{ name: string; lat: number; lng: number; details: string }>> = {
  hotels: [
    { name: 'Trident Hotel BKC', lat: 19.0673, lng: 72.8682, details: '5-Star Luxury • 300m away' },
    { name: 'Sofitel Mumbai BKC', lat: 19.0665, lng: 72.8660, details: 'French Luxury Hospitality • 450m away' },
    { name: 'Grand Hyatt Mumbai', lat: 19.0772, lng: 72.8525, details: 'Executive Suites • 2.1 km away' },
  ],
  restaurants: [
    { name: 'Jio World Food Court & Cafes', lat: 19.0645, lng: 72.8688, details: 'Multi-Cuisine Hub • Concourse Floor' },
    { name: 'Starbucks Jio Drive', lat: 19.0638, lng: 72.8695, details: 'Coffee & Refreshments' },
    { name: 'Bandra Artisan Food Truck Zone', lat: 19.0620, lng: 72.8670, details: 'Grab & Go Quick Meals' },
  ],
  washrooms: [
    { name: 'Executive Washroom Restrooms - North', lat: 19.0652, lng: 72.8675, details: 'Wheelchair Accessible • Sanitized' },
    { name: 'Arena Concourse Restrooms - South', lat: 19.0615, lng: 72.8685, details: 'High-Capacity Multi-Stall' },
    { name: 'East Corridor VIP Restrooms', lat: 19.0640, lng: 72.8710, details: 'VIP Lounge Amenities' },
  ],
  parking: [
    { name: 'Jio World Multi-Level Car Parking (MLCP)', lat: 19.0625, lng: 72.8705, details: '88% Occupied • 240 slots left' },
    { name: 'BKC G-Block Surface Parking Lot B', lat: 19.0680, lng: 72.8690, details: 'Valet & VIP Reserved' },
    { name: 'Kalanagar Transit Overflow Parking', lat: 19.0600, lng: 72.8630, details: 'General Ingress Parking' },
  ],
  transport: [
    { name: 'BKC Metro Station (Line 3 Aqua Line)', lat: 19.0658, lng: 72.8645, details: 'Direct underground venue walkway' },
    { name: 'Ola / Uber Dedicated Pickup Bay 1', lat: 19.0610, lng: 72.8698, details: 'Geo-fenced automated pickup' },
    { name: 'BEST Feeder Shuttle Stop - BKC', lat: 19.0668, lng: 72.8702, details: 'Loops every 5 mins' },
  ],
};

export const LiveMap: React.FC = () => {
  const { event, setSelectedItem } = useEventAdmin();
  const [filter, setFilter] = useState<MapFilter>('ALL');
  const [mapReady, setMapReady] = useState(false);
  const [activeGate, setActiveGate] = useState<SelectedGateInfo | null>(null);

  const [layers, setLayers] = useState({
    hotels: false,
    restaurants: false,
    washrooms: false,
    parking: false,
    transport: false
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const resourceMarkersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE,
      center: DEFAULT_CENTER,
      zoom: 16.2,
      pitch: 45,
      bearing: -12
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      setMapReady(true);

      // Add heatmap layer for crowd density
      const crowdGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { weight: 0.95 },
            geometry: { type: 'Point', coordinates: [DEFAULT_CENTER[0] - 0.0012, DEFAULT_CENTER[1] + 0.0006] }
          },
          {
            type: 'Feature',
            properties: { weight: 0.7 },
            geometry: { type: 'Point', coordinates: [DEFAULT_CENTER[0], DEFAULT_CENTER[1]] }
          },
          {
            type: 'Feature',
            properties: { weight: 0.4 },
            geometry: { type: 'Point', coordinates: [DEFAULT_CENTER[0] + 0.0014, DEFAULT_CENTER[1] - 0.0005] }
          }
        ]
      };

      if (!map.getSource('crowd-telemetry-heat')) {
        map.addSource('crowd-telemetry-heat', {
          type: 'geojson',
          data: crowdGeoJSON
        });

        map.addLayer({
          id: 'crowd-heat-layer',
          type: 'heatmap',
          source: 'crowd-telemetry-heat',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': 2,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0,0,255,0)',
              0.2, '#06b6d4',
              0.4, '#10b981',
              0.6, '#f59e0b',
              0.8, '#ef4444',
              1.0, '#b91c1c'
            ],
            'heatmap-radius': 50,
            'heatmap-opacity': 0.7
          }
        });
      }

      // Add camera nodes
      const cameraList = [
        { id: 'cam_n_plaza_01', name: 'CAM North Plaza 01', coords: [DEFAULT_CENTER[0] - 0.0012, DEFAULT_CENTER[1] + 0.0006], count: 48 },
        { id: 'cam_bowl_pan_04', name: 'CAM Main Bowl 04', coords: [DEFAULT_CENTER[0], DEFAULT_CENTER[1]], count: 82 },
        { id: 'cam_gate_1', name: 'CAM Gate 1 West', coords: [DEFAULT_CENTER[0] - 0.0018, DEFAULT_CENTER[1] - 0.0008], count: 32 }
      ];

      cameraList.forEach((cam) => {
        const el = document.createElement('div');
        el.className = 'camera-mapbox-pin group cursor-pointer';
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-cyan-400 opacity-75"></span>
            <div class="relative w-8 h-8 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-xl flex items-center justify-center text-cyan-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
            </div>
            <div class="absolute -bottom-5 px-1 py-0.5 rounded bg-slate-950 border border-slate-700 text-[8px] font-mono text-cyan-300 whitespace-nowrap">
              ${cam.id.slice(-8)}
            </div>
          </div>
        `;

        el.addEventListener('click', () => {
          setActiveGate({
            id: cam.id,
            name: cam.name,
            locationName: 'BKC Concourse Level',
            status: cam.count > 60 ? 'CONGESTED' : 'OPEN',
            currentCrowd: cam.count,
            totalCapacity: 100,
            flowRate: 18,
            occupancyPercent: Math.round((cam.count / 100) * 100),
            predictionText: cam.count > 60 ? 'Surge warning: relief routing suggested' : 'Nominal ingress flow'
          });
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat(cam.coords as [number, number])
          .addTo(map);

        markersRef.current.push(marker);
      });
    });

    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
    };
  }, []);

  // Toggle POI resource layers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    // Clear old resource markers
    resourceMarkersRef.current.forEach(m => m.remove());
    resourceMarkersRef.current = [];

    const activeResourceTypes = (Object.keys(layers) as ResourceType[]).filter(k => layers[k]);

    activeResourceTypes.forEach(type => {
      const items = BKC_RESOURCES[type] || [];
      items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'poi-marker p-1.5 rounded-full bg-slate-900 border border-blue-400 text-blue-300 shadow-md cursor-pointer text-xs';
        el.innerText = type === 'hotels' ? '🏨' : type === 'restaurants' ? '🍔' : type === 'washrooms' ? '🚻' : type === 'parking' ? '🅿️' : '🚌';

        const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(`
          <div style="font-family:sans-serif; color:#0f172a; padding:3px;">
            <strong style="font-size:12px;">${item.name}</strong><br/>
            <span style="font-size:11px; color:#64748b;">${item.details}</span>
          </div>
        `);

        const m = new mapboxgl.Marker(el)
          .setLngLat([item.lng, item.lat])
          .setPopup(popup)
          .addTo(mapInstanceRef.current!);

        resourceMarkersRef.current.push(m);
      });
    });
  }, [layers, mapReady]);

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Top Map Filter Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-700 shadow-xl">
        {(['ALL', 'CROWD', 'GATES', 'CAMERAS', 'INCIDENTS'] as MapFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === f
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {f}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-700 mx-1" />

        {/* POI Toggles */}
        <button
          onClick={() => toggleLayer('washrooms')}
          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
            layers.washrooms ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Restrooms"
        >
          <Toilet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Restrooms</span>
        </button>

        <button
          onClick={() => toggleLayer('parking')}
          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
            layers.parking ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Parking"
        >
          <Car className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Parking</span>
        </button>

        <button
          onClick={() => toggleLayer('transport')}
          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
            layers.transport ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Transit"
        >
          <Bus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Transit</span>
        </button>
      </div>

      {/* Mapbox Canvas */}
      <div ref={mapContainerRef} className="w-full h-full flex-1" />

      {/* Selected Gate / Camera Drawer */}
      {activeGate && (
        <div className="absolute bottom-6 left-6 z-20 w-80 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-4 text-white animate-in slide-in-from-bottom-4 duration-150">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold truncate">{activeGate.name}</h4>
            <button onClick={() => setActiveGate(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Status</span>
              <span className={`font-bold font-mono px-1.5 py-0.5 rounded text-[10px] ${
                activeGate.status === 'CONGESTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>{activeGate.status}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Current Crowd</span>
              <span className="font-mono font-bold text-white">{activeGate.currentCrowd} / {activeGate.totalCapacity}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full ${activeGate.occupancyPercent > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, activeGate.occupancyPercent)}%` }}
              />
            </div>
            <p className="text-[11px] text-cyan-300 italic pt-1">{activeGate.predictionText}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMap;