/**
 * websocketClient.ts — CloudNet Real-Time Intelligence Stream Client
 * Connects to FastAPI WebSocket endpoint (/ws/events) with automatic exponential backoff,
 * heartbeats, event dispatching, and graceful HTTP fallback polling.
 */
import { WeatherEvent } from '../types/weather';
import { apiClient } from './apiClient';

export type EventCallback = (event: WeatherEvent) => void;
export type StatusOverrideCallback = (override: {
  eventId: string;
  newStatus: string;
  confidence: number;
  reason: string;
}) => void;
export type ConnectionCallback = (connected: boolean) => void;
export type ScenarioCallback = (scenarioResult: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private reconnectTimer: any = null;
  private pingIntervalTimer: any = null;
  private fallbackPollTimer: any = null;
  private isExplicitlyClosed = false;

  private eventListeners: Set<EventCallback> = new Set();
  private statusOverrideListeners: Set<StatusOverrideCallback> = new Set();
  private connectionListeners: Set<ConnectionCallback> = new Set();
  private scenarioListeners: Set<ScenarioCallback> = new Set();

  public isConnected = false;

  constructor() {
    const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/events';
    this.url = wsBase;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.isExplicitlyClosed = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.stopFallbackPolling();
        this.startHeartbeat();
        this.notifyConnectionState(true);
        console.log('[CloudNet WS] Real-time channel established:', this.url);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (e) {
          console.warn('[CloudNet WS] Unparseable message received:', event.data);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[CloudNet WS] Connection error:', err);
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.notifyConnectionState(false);

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
          this.startFallbackPolling();
        }
      };
    } catch (err) {
      console.warn('[CloudNet WS] Failed to initiate WebSocket:', err);
      this.scheduleReconnect();
      this.startFallbackPolling();
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    this.stopFallbackPolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.notifyConnectionState(false);
  }

  private handleMessage(data: any): void {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'CONNECTION_ESTABLISHED':
        console.log('[CloudNet WS]', data.message);
        break;

      case 'NEW_EVENT':
        if (data.event) {
          const clientEvent = apiClient._mapBackendToClient(data.event);
          this.eventListeners.forEach((cb) => {
            try {
              cb(clientEvent);
            } catch (e) {
              console.error('[CloudNet WS] Error in event listener:', e);
            }
          });
        }
        break;

      case 'STATUS_OVERRIDE':
        this.statusOverrideListeners.forEach((cb) => {
          try {
            cb({
              eventId: data.event_id,
              newStatus: data.new_status,
              confidence: data.confidence,
              reason: data.reason,
            });
          } catch (e) {
            console.error('[CloudNet WS] Error in status override listener:', e);
          }
        });
        break;

      case 'SCENARIO_RESULT':
        this.scenarioListeners.forEach((cb) => {
          try {
            cb(data);
          } catch (e) {
            console.error('[CloudNet WS] Error in scenario listener:', e);
          }
        });
        break;

      case 'PONG':
        // Heartbeat response acknowledged
        break;

      default:
        // Handle arbitrary event types gracefully
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    // Exponential backoff with 20% random jitter: min 2s, max 30s
    const baseDelay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
    const delay = Math.round(baseDelay + jitter);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log(`[CloudNet WS] Attempting reconnection (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingIntervalTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  private startFallbackPolling(): void {
    if (this.fallbackPollTimer) return;
    console.log('[CloudNet WS] Activating HTTP sync fallback (polling every 30s)...');
    this.fallbackPollTimer = setInterval(async () => {
      try {
        const events = await apiClient.getEvents({ limit: 50 });
        if (events && events.length > 0) {
          // If first event is recent, pass to listeners
          const latest = events[0];
          this.eventListeners.forEach((cb) => {
            try {
              cb(latest);
            } catch {}
          });
        }
      } catch {}
    }, 30000);
  }

  private stopFallbackPolling(): void {
    if (this.fallbackPollTimer) {
      clearInterval(this.fallbackPollTimer);
      this.fallbackPollTimer = null;
    }
  }

  private notifyConnectionState(connected: boolean): void {
    this.connectionListeners.forEach((cb) => {
      try {
        cb(connected);
      } catch {}
    });
  }

  // Subscription APIs
  public onEvent(callback: EventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  public onStatusOverride(callback: StatusOverrideCallback): () => void {
    this.statusOverrideListeners.add(callback);
    return () => this.statusOverrideListeners.delete(callback);
  }

  public onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionListeners.add(callback);
    callback(this.isConnected);
    return () => this.connectionListeners.delete(callback);
  }

  public onScenarioResult(callback: ScenarioCallback): () => void {
    this.scenarioListeners.add(callback);
    return () => this.scenarioListeners.delete(callback);
  }
}

export const websocketClient = new WebSocketClient();
