type RealtimeListener = (eventData: any) => void;

class RealtimeClientService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<RealtimeListener>> = new Map();
  private isConnected = false;
  private connectionChangeListeners: Set<(connected: boolean) => void> = new Set();
  private reconnectTimer: any = null;

  public connect(eventId?: string) {
    if (this.eventSource) {
      this.disconnect();
    }

    const token = localStorage.getItem('eventflow_auth_token') || '';
    const q = new URLSearchParams();
    if (token) q.append('token', token);
    if (eventId) q.append('eventId', eventId);

    const url = `/api/v1/realtime/stream?${q.toString()}`;

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.addEventListener('connected', () => {
        this.setConnected(true);
      });

      const eventTypes = [
        'crowd_status_updated',
        'alert_created',
        'alert_updated',
        'gate_status_changed',
        'route_updated',
        'incident_created',
        'event_status_changed',
        'queue_status_changed'
      ];

      for (const type of eventTypes) {
        this.eventSource.addEventListener(type, (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            this.notifyListeners(type, parsed);
          } catch (err) {
            console.warn('Realtime parse error:', err);
          }
        });
      }

      this.eventSource.onerror = () => {
        this.setConnected(false);
        this.eventSource?.close();
        this.eventSource = null;
        // Auto-reconnect after 4 seconds
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.connect(eventId);
        }, 4000);
      };
    } catch (err) {
      console.warn('EventSource initialization error:', err);
      this.setConnected(false);
    }
  }

  public disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setConnected(false);
  }

  public subscribe(eventTypeOrCallback: string | RealtimeListener, maybeCallback?: RealtimeListener): () => void {
    if (typeof eventTypeOrCallback === 'function') {
      const callback = eventTypeOrCallback;
      const allTypes = [
        'crowd_status_updated',
        'alert_created',
        'alert_updated',
        'gate_status_changed',
        'route_updated',
        'incident_created',
        'event_status_changed',
        'queue_status_changed'
      ];
      const unsubs = allTypes.map(t => this.subscribe(t, callback));
      return () => unsubs.forEach(u => u());
    }

    const eventType = eventTypeOrCallback;
    const callback = maybeCallback!;
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  public onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionChangeListeners.add(callback);
    callback(this.isConnected);
    return () => {
      this.connectionChangeListeners.delete(callback);
    };
  }

  private setConnected(connected: boolean) {
    this.isConnected = connected;
    this.connectionChangeListeners.forEach(cb => cb(connected));
  }

  private notifyListeners(type: string, data: any) {
    const list = this.listeners.get(type);
    if (list) {
      list.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in listener for ${type}:`, e);
        }
      });
    }
  }
}

export const realtimeService = new RealtimeClientService();
