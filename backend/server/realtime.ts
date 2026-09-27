import { Response } from 'express';

export type RealtimeEventType =
  | 'crowd_status_updated'
  | 'alert_created'
  | 'alert_updated'
  | 'gate_status_changed'
  | 'route_updated'
  | 'incident_created'
  | 'event_status_changed'
  | 'queue_status_changed'
  | 'recommendation_created'
  | 'recommendation_updated'
  | 'venue_map_updated';

import { getLiveWeather, WeatherData } from './services/weatherService';

interface RealtimeClient {
  id: string;
  res: Response;
  role: string;
  eventId?: string;
}

class RealtimeManager {
  private clients: Map<string, RealtimeClient> = new Map();
  private latestWeather: WeatherData | null = null;

  constructor() {
    this.refreshWeather();
    // Refresh live weather every 60 seconds
    setInterval(() => this.refreshWeather(), 60000);
  }

  private async refreshWeather() {
    try {
      this.latestWeather = await getLiveWeather();
    } catch (e) {
      // Graceful error handling
    }
  }

  public getLatestWeather(): WeatherData | null {
    return this.latestWeather;
  }

  public addClient(id: string, res: Response, role: string, eventId?: string) {
    this.clients.set(id, { id, res, role, eventId });

    // Send initial handshake with live weather context
    res.write(`event: connected\ndata: ${JSON.stringify({
      message: 'Realtime stream active',
      clientId: id,
      weather: this.latestWeather
    })}\n\n`);
  }

  public removeClient(id: string) {
    this.clients.delete(id);
  }

  public broadcast(eventType: RealtimeEventType, data: Record<string, any>, eventId?: string) {
    const payload = JSON.stringify({
      eventType,
      eventId,
      timestamp: new Date().toISOString(),
      weather: this.latestWeather,
      data: {
        ...data,
        weather: data.weather || this.latestWeather
      }
    });

    for (const [clientId, client] of this.clients.entries()) {
      // If event is event-scoped, only send to clients watching that event or super admins
      if (eventId && client.eventId && client.eventId !== eventId && client.role !== 'SUPER_ADMIN') {
        continue;
      }

      try {
        client.res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
      } catch (err) {
        this.clients.delete(clientId);
      }
    }
  }

  public getConnectedCount(): number {
    return this.clients.size;
  }
}

export const realtimeManager = new RealtimeManager();
