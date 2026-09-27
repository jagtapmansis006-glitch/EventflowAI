import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Calendar, 
  Trash2, 
  Camera as CameraIcon, 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  MapPin, 
  Compass, 
  CheckCircle2 
} from 'lucide-react';
import { eventService } from '../services/eventService';
import { apiClient } from '../api/client';
import { EventStatus } from '../types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface ZoneCameraDraft {
  zoneName: string;
  zoneCapacity: string;
  cameraName: string;
  cameraSourceType: 'WEBCAM' | 'VIDEO_FILE' | 'RTSP' | 'HTTP_STREAM' | 'IP_CAMERA' | 'CCTV';
  cameraSourceUrl: string;
}

interface GateDraft {
  name: string;
  capacity: string;
  latitude: string;
  longitude: string;
}

const EMPTY_ZONE_CAMERA: ZoneCameraDraft = {
  zoneName: '',
  zoneCapacity: '1000',
  cameraName: '',
  cameraSourceType: 'VIDEO_FILE',
  cameraSourceUrl: ''
};

const DEFAULT_GATE: GateDraft = {
  name: 'Gate 1 (North Entry)',
  capacity: '2500',
  latitude: '18.9894',
  longitude: '73.1175'
};

function unwrap<T>(res: any, key: string): T {
  if (res && typeof res === 'object' && key in res) return res[key];
  return res;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('CONFERENCE');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueCapacity, setVenueCapacity] = useState('10000');
  const [city, setCity] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [status, setStatus] = useState<EventStatus>('UPCOMING');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressNote, setProgressNote] = useState<string | null>(null);

  // Gates draft with coordinates
  const [gateDrafts, setGateDrafts] = useState<GateDraft[]>([{ ...DEFAULT_GATE }]);

  // Zones & Cameras draft
  const [zoneCameraDrafts, setZoneCameraDrafts] = useState<ZoneCameraDraft[]>([{ ...EMPTY_ZONE_CAMERA }]);

  // Voice Assistant state
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceStatusMsg, setVoiceStatusMsg] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<Record<string, string> | null>(null);
  const recognitionRef = useRef<any>(null);

  // Venue Map Artwork Upload State
  const [uploadedMapPath, setUploadedMapPath] = useState<string | null>(null);
  const [uploadedMapPreview, setUploadedMapPreview] = useState<string | null>(null);
  const [isParsingMap, setIsParsingMap] = useState(false);

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingMap(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setUploadedMapPreview(base64Data);

        const res = await apiClient<{
          success: boolean;
          mapImageUrl?: string;
          venueName?: string;
          totalCapacity?: number;
          gates?: any[];
          zones?: any[];
        }>('/api/v1/admin/events/parse-venue-map', {
          method: 'POST',
          body: JSON.stringify({
            imageBase64: base64Data,
            fileName: file.name
          })
        });

        if (res?.mapImageUrl) {
          setUploadedMapPath(res.mapImageUrl);
        }
        if (res?.venueName) {
          setVenueName(res.venueName);
          if (!name) setName(`${res.venueName} Championship 2026`);
        }
        if (res?.totalCapacity) {
          setVenueCapacity(String(res.totalCapacity));
        }
        if (Array.isArray(res?.gates) && res.gates.length > 0) {
          setGateDrafts(res.gates.map((g: any, i: number) => ({
            name: g.gate_id || `Gate ${i + 1}`,
            capacity: '2500',
            latitude: '18.9894',
            longitude: '73.1175'
          })));
        }
        if (Array.isArray(res?.zones) && res.zones.length > 0) {
          setZoneCameraDrafts(res.zones.slice(0, 4).map((z: any, i: number) => ({
            zoneName: z.zone_name,
            zoneCapacity: String(Math.round(z.area_sqm * 3.5) || 2000),
            cameraName: `CAM ${i + 1}`,
            cameraSourceType: 'VIDEO_FILE' as const,
            cameraSourceUrl: `./cameras/camera_${i + 1}/feed.mp4`
          })));
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Map parsing failed:', err);
    } finally {
      setIsParsingMap(false);
    }
  };

  if (!isOpen) return null;

  const updateDraft = (index: number, field: keyof ZoneCameraDraft, value: string) => {
    setZoneCameraDrafts(prev =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const addDraftRow = () => {
    setZoneCameraDrafts(prev => [...prev, { ...EMPTY_ZONE_CAMERA }]);
  };

  const removeDraftRow = (index: number) => {
    setZoneCameraDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const updateGateDraft = (index: number, field: keyof GateDraft, value: string) => {
    setGateDrafts(prev =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    );
  };

  const addGateRow = () => {
    setGateDrafts(prev => [
      ...prev,
      {
        name: `Gate ${prev.length + 1}`,
        capacity: '2000',
        latitude: '18.9894',
        longitude: '73.1175'
      }
    ]);
  };

  const removeGateRow = (index: number) => {
    setGateDrafts(prev => prev.filter((_, i) => i !== index));
  };

  // Voice Speech-to-Text Parser with Ordered Sequential Field Matching
  const parseVoiceInput = (text: string) => {
    const raw = text.trim();
    if (!raw) return;

    const extracted: Record<string, string> = {};

    // 1. "Event Name: [Name]" -> Populates Event Name field
    const nameMatch = raw.match(/(?:event\s*name|name)\s*[:\-]\s*([^,.\n]+?)(?=(?:\s*description|\s*capacity|\s*type|\s*venue|$))/i)
      || raw.match(/(?:create\s+event|event\s+name|event)[:\s]+([^,.]+?)(?:\s+at|\s+with|\s+venue|\s+capacity|\s+description|$)/i);
    if (nameMatch) {
      const eName = nameMatch[1].trim();
      setName(eName);
      extracted.name = eName;
    }

    // 2. "Description: [Text]" -> Populates Description field
    const descMatch = raw.match(/description\s*[:\-]\s*([^,.\n]+?)(?=(?:\s*capacity|\s*type|\s*venue|\s*event\s*name|$))/i);
    if (descMatch) {
      const eDesc = descMatch[1].trim();
      setDescription(eDesc);
      extracted.description = eDesc;
    }

    // 3. "Capacity: [Number]" -> Populates Capacity field
    const capMatch = raw.match(/capacity\s*[:\-]?\s*([\d,]+)/i) 
      || raw.match(/([\d,]+)\s*(?:capacity|attendees|people|seats)/i);
    if (capMatch) {
      const parsedCap = capMatch[1].replace(/,/g, '');
      setVenueCapacity(parsedCap);
      extracted.capacity = parsedCap;
    }

    // 4. "Type: [Conference/Concert]" -> Populates Type dropdown
    const typeMatch = raw.match(/type\s*[:\-]\s*([a-zA-Z_\s]+)/i);
    if (typeMatch) {
      const t = typeMatch[1].trim().toLowerCase();
      let matchedType: string = 'CONFERENCE';
      if (t.includes('concert') || t.includes('music')) matchedType = 'MUSIC_EXPO';
      else if (t.includes('sport') || t.includes('match') || t.includes('stadium')) matchedType = 'SPORTS_FESTIVAL';
      else if (t.includes('exhibition') || t.includes('expo')) matchedType = 'EXHIBITION';
      else if (t.includes('convention')) matchedType = 'CONVENTION';
      else matchedType = 'CONFERENCE';
      setEventType(matchedType);
      extracted.type = matchedType;
    }

    // Extra: Gate Coordinates & Venue if present
    const coordMatch = raw.match(/(?:coordinates?|coords?|lat(?:itude)?|location)?[:\s]*(-?\d+\.?\d*)\s*[,/ ]\s*(-?\d+\.?\d*)/i);
    if (coordMatch) {
      const lat = coordMatch[1];
      const lng = coordMatch[2];
      setGateDrafts(prev => {
        const copy = [...prev];
        if (copy.length === 0) copy.push({ ...DEFAULT_GATE });
        copy[0] = { ...copy[0], latitude: lat, longitude: lng };
        return copy;
      });
      extracted.gateCoords = `${lat}, ${lng}`;
    }

    const venueMatch = raw.match(/venue[:\s]+([^,.]+?)(?:\s+with|\s+capacity|\s+gate|\s+in|\s+city|$)/i) 
      || raw.match(/at\s+([A-Za-z0-9\s]+?)(?:\s+with|\s+capacity|\s+gate|\s+in|\s+city|$)/i);
    if (venueMatch) {
      const vName = venueMatch[1].trim();
      setVenueName(vName);
      extracted.venueName = vName;
    }

    setExtractedFields(extracted);
    setVoiceStatusMsg(`Auto-filled: ${Object.keys(extracted).join(', ') || 'fields parsed'}`);

    // Dispatch to backend /api/v1/admin/voice-command for AI speech entity extraction
    apiClient<{
      success: boolean;
      actionType?: string;
      fields?: {
        name?: string;
        venueName?: string;
        capacity?: number;
        city?: string;
        gateName?: string;
        latitude?: number;
        longitude?: number;
      };
      voiceResponse?: string;
    }>('/api/v1/admin/voice-command', {
      method: 'POST',
      body: JSON.stringify({ command: text })
    }).then(res => {
      if (res?.fields) {
        if (res.fields.venueName) setVenueName(res.fields.venueName);
        if (res.fields.capacity) setVenueCapacity(String(res.fields.capacity));
        if (res.fields.name) setName(res.fields.name);
        if (res.fields.city) setCity(res.fields.city);
        if (res.fields.latitude && res.fields.longitude) {
          const lat = String(res.fields.latitude);
          const lng = String(res.fields.longitude);
          const gName = res.fields.gateName || 'GATE 1 (MAIN)';
          setGateDrafts(prev => {
            const copy = [...prev];
            if (copy.length === 0) copy.push({ ...DEFAULT_GATE });
            copy[0] = { ...copy[0], name: gName, latitude: lat, longitude: lng };
            return copy;
          });
        }
        if (res.voiceResponse) {
          setVoiceStatusMsg(res.voiceResponse);
        }
      }
    }).catch(err => {
      console.warn('Backend voice command parsing fallback:', err);
    });

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const speakMsg = new SpeechSynthesisUtterance('Voice details processed and applied to event creation fields.');
        window.speechSynthesis.speak(speakMsg);
      } catch (_) {}
    }
  };

  const handleStartListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatusMsg('Speech recognition not supported in this browser. Please type spoken text below.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatusMsg('Listening... speak in order: Event Name, Description, Capacity, Type');
      };

      recognition.onresult = (event: any) => {
        let transcriptAccum = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcriptAccum += event.results[i][0].transcript + ' ';
        }
        const text = transcriptAccum.trim();
        setVoiceQuery(text);
        parseVoiceInput(text);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        if (e.error !== 'no-speech') {
          setIsListening(false);
          setVoiceStatusMsg('Mic paused or permission required. You can also paste speech query below.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleManualVoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (voiceQuery.trim()) {
      parseVoiceInput(voiceQuery);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setProgressNote(null);

    try {
      setProgressNote('Creating event...');
      const eventRes = await eventService.createEvent({
        name: name.trim(),
        description: description.trim() || `Event hosted at ${venueName.trim()} with capacity ${venueCapacity}`,
        eventType,
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim(),
        city: city.trim(),
        startDateTime: startDateTime ? new Date(startDateTime).toISOString() : new Date().toISOString(),
        endDateTime: endDateTime ? new Date(endDateTime).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        status,
        mapImageUrl: uploadedMapPath || '/uploads/venue_map_default.png',
        venueMapPath: uploadedMapPath || '/uploads/venue_map_default.png'
      } as any);

      const createdEvent = unwrap<{ id: string }>(eventRes, 'event');
      const eventId = createdEvent?.id;

      if (!eventId) {
        throw new Error('Event was created but no event ID was returned — cannot attach gates or zones.');
      }

      // 1. Create configured Gates with coordinates
      for (const g of gateDrafts) {
        if (g.name.trim()) {
          setProgressNote(`Creating gate: ${g.name}...`);
          try {
            await apiClient.post(`/api/v1/admin/events/${eventId}/gates`, {
              name: g.name.trim(),
              capacity: Number(g.capacity) || 2000,
              latitude: Number(g.latitude) || 18.9894,
              longitude: Number(g.longitude) || 73.1175,
              status: 'OPEN',
              isPublic: true
            });
          } catch (gateErr) {
            console.warn('Gate creation error:', gateErr);
          }
        }
      }

      // 2. Chain zone + camera creation
      const validDrafts = zoneCameraDrafts.filter(d => d.zoneName.trim());

      for (let i = 0; i < validDrafts.length; i++) {
        const draft = validDrafts[i];
        setProgressNote(`Creating zone ${i + 1} of ${validDrafts.length}: ${draft.zoneName}...`);

        const zoneRes = await apiClient.post(`/api/v1/admin/events/${eventId}/zones`, {
          name: draft.zoneName.trim(),
          capacity: Number(draft.zoneCapacity) || 1000
        });
        const createdZone = unwrap<{ id: string }>(zoneRes, 'zone');
        const zoneId = createdZone?.id;

        if (zoneId && draft.cameraName.trim() && draft.cameraSourceUrl.trim()) {
          setProgressNote(`Attaching camera for ${draft.zoneName}...`);
          await apiClient.post(`/api/v1/admin/events/${eventId}/cameras`, {
            name: draft.cameraName.trim(),
            zoneId,
            sourceType: draft.cameraSourceType,
            sourceUrl: draft.cameraSourceUrl.trim()
          });
        }
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
      setProgressNote(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
      <div
        id="create-event-modal"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-blue-700 flex items-center justify-between bg-blue-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/15 text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New Event</h3>
              <p className="text-xs text-blue-100">Configure venue parameters, gates & real-time telemetry</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              id="btn-voice-assistant-modal"
              type="button"
              onClick={() => setVoiceOpen(!voiceOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                voiceOpen 
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-white/50' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title="Toggle Voice Assistant to auto-fill event creation"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Assistant</span>
            </button>

            <button 
              onClick={onClose} 
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VOICE ASSISTANT BANNER PANEL */}
        {voiceOpen && (
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 border-b border-indigo-700 text-white shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-blue-500/30 text-blue-300">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                  Voice Assistant • Venue & Event Auto-Fill
                </span>
              </div>
              <span className="text-[11px] text-slate-300">
                Speech-to-Text Enabled
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              Speak or paste venue name, capacity, and gate coordinates:
            </p>

            <form onSubmit={handleManualVoiceSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="voice-assistant-input"
                  type="text"
                  value={voiceQuery}
                  onChange={e => setVoiceQuery(e.target.value)}
                  placeholder='e.g. "Create Expo at Grand Arena with capacity 15000 and Gate A coordinates 18.98, 73.11 in Mumbai"'
                  className="w-full bg-white/10 border border-white/20 rounded-lg pl-3 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={isListening ? handleStopListening : handleStartListening}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isListening 
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isListening ? 'Listening...' : 'Speak'}</span>
                </button>

                {isListening && (
                  <div className="flex items-center gap-1 h-6 px-2.5 bg-blue-950/80 rounded-lg border border-blue-400/40">
                    <span className="w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                    <span className="w-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s] h-5" />
                    <span className="w-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0s] h-4" />
                    <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s] h-2.5" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Parse
              </button>
            </form>

            {/* Sequential Command Guide Helper Text */}
            <div className="mt-2 px-3 py-2 rounded-lg bg-blue-950/60 border border-blue-400/30 text-[11px] text-blue-100 flex items-center gap-2">
              <span className="font-bold text-amber-300">Voice Order Guide:</span>
              <span>1. &quot;Event Name: [Name]&quot; ➔ 2. &quot;Description: [Text]&quot; ➔ 3. &quot;Capacity: [Number]&quot; ➔ 4. &quot;Type: [Conference/Concert]&quot;</span>
            </div>

            {/* Quick Prompts */}
            <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-slate-400 shrink-0">Sample voice:</span>
              <button
                type="button"
                onClick={() => {
                  const sample = 'Create Tech Summit at Grand Convention Center with capacity 12000 and Gate A coordinates 18.9894, 73.1175 in Mumbai';
                  setVoiceQuery(sample);
                  parseVoiceInput(sample);
                }}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 shrink-0"
              >
                Grand Arena (12k, Gate A)
              </button>
              <button
                type="button"
                onClick={() => {
                  const sample = 'Venue Apex Stadium with capacity 25000 and Gate 1 coordinates 37.7749, -122.4194 in San Francisco';
                  setVoiceQuery(sample);
                  parseVoiceInput(sample);
                }}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 shrink-0"
              >
                Apex Stadium (25k, Gate 1)
              </button>
            </div>

            {/* Feedback / status */}
            {voiceStatusMsg && (
              <div className="mt-2 text-xs flex items-center gap-1.5 text-emerald-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{voiceStatusMsg}</span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}
          {progressNote && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-medium">
              {progressNote}
            </div>
          )}

          {/* VENUE MAP ARTWORK UPLOAD & GEMINI / LLM PARSER */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span>Upload Venue Map Artwork (.png, .jpeg, .svg)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Gemini & CV Map Reader</span>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="venue-map-upload-input"
                type="file"
                accept=".png,.jpeg,.jpg,.svg,image/*"
                onChange={handleMapUpload}
                disabled={isParsingMap}
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              {isParsingMap && (
                <span className="text-xs font-semibold text-indigo-600 animate-pulse flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Reading map zones & gates...
                </span>
              )}
            </div>

            {uploadedMapPreview && (
              <div className="mt-2 flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                <img src={uploadedMapPreview} alt="Venue Map Preview" className="w-16 h-12 object-cover rounded border" />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">Venue Layout Extracted</span>
                  <span className="text-slate-500 text-[11px]">Gates, turnstiles, coordinates & zones mapped automatically</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Event Name *</label>
            <input
              id="new-event-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Apex Global Championship 2026"
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Description</label>
            <textarea
              id="new-event-desc"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Operational overview, capacity expectations, and zone structure..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Event Type</label>
              <select
                id="new-event-type"
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="CONFERENCE">CONFERENCE</option>
                <option value="SPORTS_FESTIVAL">SPORTS_FESTIVAL</option>
                <option value="MUSIC_EXPO">MUSIC_EXPO</option>
                <option value="EXHIBITION">EXHIBITION</option>
                <option value="STADIUM_MATCH">STADIUM_MATCH</option>
                <option value="CONVENTION">CONVENTION</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Initial Status</label>
              <select
                id="new-event-status"
                value={status}
                onChange={e => setStatus(e.target.value as EventStatus)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="UPCOMING">UPCOMING</option>
                <option value="LIVE">LIVE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3.5">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Venue Name *</label>
              <input
                id="new-event-venue"
                type="text"
                required
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
                placeholder="e.g. Apex Grand Arena"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Venue Capacity *</label>
              <input
                id="new-event-capacity"
                type="number"
                required
                value={venueCapacity}
                onChange={e => setVenueCapacity(e.target.value)}
                placeholder="10000"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">City / Region</label>
              <input
                id="new-event-city"
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Venue Street Address</label>
              <input
                id="new-event-address"
                type="text"
                value={venueAddress}
                onChange={e => setVenueAddress(e.target.value)}
                placeholder="e.g. 100 Olympic Way"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* GATE COORDINATES SECTION */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                Gate Coordinates & Thresholds
              </label>
              <button
                type="button"
                onClick={addGateRow}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Gate
              </button>
            </div>

            <div className="space-y-3">
              {gateDrafts.map((gate, index) => (
                <div key={index} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 relative">
                  {gateDrafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGateRow(index)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={gate.name}
                      onChange={e => updateGateDraft(index, 'name', e.target.value)}
                      placeholder="Gate Name, e.g. Gate 1"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={gate.capacity}
                      onChange={e => updateGateDraft(index, 'capacity', e.target.value)}
                      placeholder="Gate Capacity"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="relative">
                      <input
                        type="text"
                        value={gate.latitude}
                        onChange={e => updateGateDraft(index, 'latitude', e.target.value)}
                        placeholder="Latitude (e.g. 18.9894)"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={gate.longitude}
                        onChange={e => updateGateDraft(index, 'longitude', e.target.value)}
                        placeholder="Longitude (e.g. 73.1175)"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ZONES & CAMERAS SECTION */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CameraIcon className="w-3.5 h-3.5 text-blue-600" />
                Zones & CCTV Cameras (Optional)
              </label>
              <button
                type="button"
                onClick={addDraftRow}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Zone
              </button>
            </div>

            <div className="space-y-3">
              {zoneCameraDrafts.map((draft, index) => (
                <div key={index} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2 relative">
                  {zoneCameraDrafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDraftRow(index)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={draft.zoneName}
                      onChange={e => updateDraft(index, 'zoneName', e.target.value)}
                      placeholder="Zone name, e.g. North Plaza"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={draft.zoneCapacity}
                      onChange={e => updateDraft(index, 'zoneCapacity', e.target.value)}
                      placeholder="Capacity"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={draft.cameraName}
                      onChange={e => updateDraft(index, 'cameraName', e.target.value)}
                      placeholder="Camera name"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                    <select
                      value={draft.cameraSourceType}
                      onChange={e => updateDraft(index, 'cameraSourceType', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="WEBCAM">WEBCAM</option>
                      <option value="VIDEO_FILE">VIDEO_FILE</option>
                      <option value="RTSP">RTSP</option>
                      <option value="HTTP_STREAM">HTTP_STREAM</option>
                      <option value="IP_CAMERA">IP_CAMERA</option>
                      <option value="CCTV">CCTV</option>
                    </select>
                    <input
                      type="text"
                      value={draft.cameraSourceUrl}
                      onChange={e => updateDraft(index, 'cameraSourceUrl', e.target.value)}
                      placeholder="Source path / URL"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-create-event"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Event...' : 'Create Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};