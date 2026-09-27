import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { 
  CloudRain, 
  Wind, 
  Thermometer, 
  Navigation, 
  Compass
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api/client';

const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFuc2lqMTIzNDU2IiwiYSI6ImNtdWpicWwxYTBxM3IyeHIyZjIzdXg0aTMifQ.F7WfQjj3iG765vg0cctLMA';
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';

export interface MapboxLiveMapProps {
  lat?: number;
  lng?: number;
  zoom?: number;
  height?: string;
  venueName?: string;
  eventId?: string;
  densityLevel?: string;
  crowdCount?: number;
  occupancyPercent?: number;
  showHeatmap?: boolean;
  showCameras?: boolean;
  showEvacuationRoute?: boolean;
  showHazardZones?: boolean;
  showGpsTracking?: boolean;
  onZoneClick?: (zoneId: string) => void;
}

export const MapboxLiveMap: React.FC<MapboxLiveMapProps> = ({
  lat = 19.0635,
  lng = 72.86744,
  zoom = 16,
  height = '380px',
  venueName = 'Apex Grand Arena / BKC',
  eventId = 'event_apex_summit_2026',
  densityLevel = 'LOW',
  crowdCount = 4250,
  showCameras = true,
  showEvacuationRoute = true,
  showHazardZones = true,
  showGpsTracking = true,
  onZoneClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [liveWeather, setLiveWeather] = useState<{
    temp: number;
    rainfallIntensity: number;
    windSpeed: number;
    condition: string;
  }>({
    temp: 28,
    rainfallIntensity: 0,
    windSpeed: 3.2,
    condition: 'Clear'
  });

  const [liveDensity, setLiveDensity] = useState(densityLevel);
  const [liveCrowd, setLiveCrowd] = useState(crowdCount);
  const [, setUserLocation] = useState<[number, number] | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // SSE telemetry subscription to dynamically sync map markers & weather
  useEffect(() => {
    const url = `${API_BASE_URL}/api/v1/realtime/stream?eventId=${encodeURIComponent(eventId || 'event_apex_summit_2026')}`;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(url);
      eventSource.addEventListener('crowd_status_updated', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          const t = parsed.data?.telemetry || parsed.telemetry;
          if (t) {
            if (t.densityLevel) setLiveDensity(t.densityLevel);
            if (t.peopleCount) setLiveCrowd(t.peopleCount);
          }
          if (parsed.weather) {
            setLiveWeather({
              temp: parsed.weather.temp ?? 28,
              rainfallIntensity: parsed.weather.rainfallIntensity ?? 0,
              windSpeed: parsed.weather.windSpeed ?? 3.2,
              condition: parsed.weather.condition || 'Clear'
            });
          }
        } catch (_) {}
      });
    } catch (_) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [eventId]);

  // Initialize Mapbox GL instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE,
      center: [lng, lat],
      zoom,
      pitch: 45,
      bearing: -17.6,
      antialias: true
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    if (showGpsTracking) {
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      });
      map.addControl(geolocate, 'top-right');

      geolocate.on('geolocate', (e: any) => {
        setUserLocation([e.coords.longitude, e.coords.latitude]);
        setGpsActive(true);
      });
    }

    map.on('load', () => {
      // 1. Crowd Density Heatmap Source & Layer
      const heatmapData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { intensity: 0.9, title: 'North Plaza Gate 1', zoneId: 'zone_north_plaza' },
            geometry: { type: 'Point', coordinates: [lng - 0.0012, lat + 0.0008] }
          },
          {
            type: 'Feature',
            properties: { intensity: 0.7, title: 'Main Bowl Concourse', zoneId: 'zone_main_bowl' },
            geometry: { type: 'Point', coordinates: [lng, lat] }
          },
          {
            type: 'Feature',
            properties: { intensity: 0.4, title: 'East Gate 3 Turnstiles', zoneId: 'zone_east_concourse' },
            geometry: { type: 'Point', coordinates: [lng + 0.0015, lat - 0.0006] }
          },
          {
            type: 'Feature',
            properties: { intensity: 0.85, title: 'West Perimeter Egress', zoneId: 'zone_west_gate' },
            geometry: { type: 'Point', coordinates: [lng - 0.0018, lat - 0.001] }
          }
        ]
      };

      if (!map.getSource('crowd-heat')) {
        map.addSource('crowd-heat', {
          type: 'geojson',
          data: heatmapData
        });

        map.addLayer({
          id: 'crowd-heat-layer',
          type: 'heatmap',
          source: 'crowd-heat',
          maxzoom: 19,
          paint: {
            'heatmap-weight': ['get', 'intensity'],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 14, 1, 18, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 255, 0)',
              0.2, '#06b6d4',
              0.4, '#10b981',
              0.6, '#f59e0b',
              0.8, '#ef4444',
              1.0, '#b91c1c'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 14, 25, 18, 60],
            'heatmap-opacity': 0.75
          }
        });
      }

      // 2. Animated Evacuation & Walking Route Overlay
      if (showEvacuationRoute) {
        const routeCoordinates: [number, number][] = [
          [lng - 0.0012, lat + 0.0008],
          [lng - 0.0007, lat + 0.0004],
          [lng - 0.0002, lat - 0.0002],
          [lng + 0.0015, lat - 0.0006]
        ];

        if (!map.getSource('evac-route')) {
          map.addSource('evac-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates
              }
            }
          });

          map.addLayer({
            id: 'evac-route-glow',
            type: 'line',
            source: 'evac-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#10b981',
              'line-width': 8,
              'line-opacity': 0.3
            }
          });

          map.addLayer({
            id: 'evac-route-line',
            type: 'line',
            source: 'evac-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#34d399',
              'line-width': 4,
              'line-dasharray': [2, 2]
            }
          });
        }
      }

      // 3. Active Hazard / High Density Zone Circles
      if (showHazardZones && !map.getSource('hazard-zones')) {
        map.addSource('hazard-zones', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { level: 'CRITICAL', title: 'Bottleneck Surge Area' },
                geometry: { type: 'Point', coordinates: [lng - 0.0012, lat + 0.0008] }
              }
            ]
          }
        });

        map.addLayer({
          id: 'hazard-circle-layer',
          type: 'circle',
          source: 'hazard-zones',
          paint: {
            'circle-radius': 45,
            'circle-color': '#ef4444',
            'circle-opacity': 0.25,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#f87171'
          }
        });
      }
    });

    // 4. Camera Node Markers & Gate Markers
    const cameraNodes = [
      { id: 'cam_n_plaza_01', name: 'CAM North Plaza 01', coords: [lng - 0.0012, lat + 0.0008] as [number, number], status: 'ONLINE', count: 48 },
      { id: 'cam_bowl_pan_04', name: 'CAM Main Bowl 04', coords: [lng, lat] as [number, number], status: 'ONLINE', count: 82 },
      { id: 'cam_gate_1', name: 'CAM Gate 1 West', coords: [lng - 0.0018, lat - 0.001] as [number, number], status: 'ONLINE', count: 31 }
    ];

    if (showCameras) {
      cameraNodes.forEach((node) => {
        const el = document.createElement('div');
        el.className = 'camera-mapbox-pin group cursor-pointer';
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-blue-400 opacity-75"></span>
            <div class="relative w-8 h-8 rounded-full bg-slate-900 border-2 border-blue-400 shadow-xl flex items-center justify-center text-blue-300 hover:scale-110 transition-transform">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                <circle cx="12" cy="13" r="3"></circle>
              </svg>
            </div>
            <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[9px] font-mono text-cyan-300 font-bold whitespace-nowrap shadow-md">
              ${node.id.slice(-8)}
            </div>
          </div>
        `;

        el.addEventListener('click', () => {
          setSelectedNode(node.name);
          if (onZoneClick) onZoneClick(node.id);
        });

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="color: #0f172a; padding: 4px; font-family: sans-serif;">
            <strong style="font-size: 12px; display: block;">${node.name}</strong>
            <span style="font-size: 11px; color: #10b981;">● Status: ${node.status}</span><br/>
            <span style="font-size: 11px; color: #475569;">Zone Telemetry Headcount: ${node.count}</span>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat(node.coords)
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
    };
  }, [lat, lng, zoom, showCameras, showEvacuationRoute, showHazardZones, showGpsTracking]);

  const densityColor = liveDensity === 'CRITICAL' ? 'bg-rose-500' : liveDensity === 'BUSY' ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950" style={{ height }}>
      {/* Mapbox GL Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Left: Live Weather & Venue Telemetry Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 max-w-xs pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-xl text-white">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold tracking-tight truncate text-slate-100 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              {venueName}
            </span>
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full text-white ${densityColor}`}>
              {liveDensity} ({liveCrowd})
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
            <div className="flex items-center gap-1 text-slate-300">
              <Thermometer className="w-3 h-3 text-amber-400" />
              <span>{liveWeather.temp}°C</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <CloudRain className="w-3 h-3 text-cyan-400" />
              <span>{liveWeather.rainfallIntensity} mm</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Wind className="w-3 h-3 text-indigo-400" />
              <span>{liveWeather.windSpeed} m/s</span>
            </div>
          </div>
        </div>

        {selectedNode && (
          <div className="bg-blue-950/90 border border-blue-500/60 rounded-xl px-3 py-2 text-xs text-blue-100 flex items-center justify-between shadow-lg animate-in fade-in">
            <span>Focused: <strong>{selectedNode}</strong></span>
            <button onClick={() => setSelectedNode(null)} className="text-blue-300 hover:text-white text-xs font-bold ml-2">✕</button>
          </div>
        )}
      </div>

      {/* Bottom Center: Live Map Layer Status & Controls */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-300 flex items-center gap-2 pointer-events-auto shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Mapbox Dark-v11 Canvas • Live SSE Heatmap</span>
        </div>

        {gpsActive && (
          <div className="bg-emerald-950/90 border border-emerald-500/60 rounded-xl px-3 py-1.5 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5 pointer-events-auto shadow-lg">
            <Navigation className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>GPS Locked</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapboxLiveMap;
