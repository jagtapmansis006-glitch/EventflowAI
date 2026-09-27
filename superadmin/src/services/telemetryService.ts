import { apiClient } from '../api/client';
import { CrowdTelemetry } from '../types';

export const telemetryService = {
  getTelemetryHistory: async (eventId: string, zoneId?: string, limit = 40): Promise<CrowdTelemetry[]> => {
    const q = new URLSearchParams();
    if (zoneId) q.append('zoneId', zoneId);
    q.append('limit', String(limit));
    
    // Unpack either res.telemetry or res.data safely
    const res = await apiClient<any>(`/api/v1/admin/events/${eventId}/telemetry?${q.toString()}`);
    
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.telemetry)) return res.telemetry;
    
    return [];
  },

  // Manual CV tester trigger (used in Command Center to test external CV ingestion format)
  submitCVTelemetry: async (data: {
    eventId: string;
    cameraId: string;
    zoneId: string;
    peopleCount: number;
    inflow: number;
    outflow: number;
    netFlow: number;
    occupancyPercent: number;
    densityLevel: string;
    queueLength: number;
    timestamp?: string;
  }): Promise<any> => {
    return apiClient('/api/v1/internal/telemetry', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};