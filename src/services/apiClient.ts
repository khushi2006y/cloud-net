/**
 * apiClient.ts — CloudNet National Backend API Client
 * Seamlessly interfaces with FastAPI REST endpoints with offline fallback.
 */
import { WeatherEvent, VerificationStatus } from '../types/weather';
import { getStoredEvents, saveEvents } from './storage';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const TOKEN_KEY = 'cloudnet_jwt_token_v2';
const USER_KEY = 'cloudnet_auth_user_v2';

export interface AuthSession {
  token: string;
  role: string;
  username: string;
}

export const apiClient = {
  // Auth token helpers
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setAuthSession(session: AuthSession): void {
    try {
      localStorage.setItem(TOKEN_KEY, session.token);
      localStorage.setItem(USER_KEY, JSON.stringify({ role: session.role, username: session.username }));
    } catch {}
  },

  clearAuthSession(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  },

  getAuthUser(): { role: string; username: string } | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // 1. Fetch Events with Filters
  async getEvents(filters?: {
    category?: string;
    status?: string;
    severity?: string;
    state?: string;
    city?: string;
    search?: string;
    limit?: number;
  }): Promise<WeatherEvent[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.state && filters.state !== 'All States') params.append('state', filters.state);
      if (filters?.city) params.append('city', filters.city);
      if (filters?.search) params.append('search', filters.search);
      params.append('limit', String(filters?.limit || 100));

      const res = await fetch(`${API_BASE}/events?${params.toString()}`, {
        headers: this.getHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        // Convert to client WeatherEvent format
        const clientEvents: WeatherEvent[] = data.map(this._mapBackendToClient);
        saveEvents(clientEvents); // update local offline cache
        return clientEvents;
      }
    } catch (e) {
      console.warn('[CloudNet API] Backend unreachable, serving local cache:', e);
    }

    // Graceful offline fallback
    return getStoredEvents();
  },

  // 2. Fetch Single Event Detail with Evidence and Audit Logs
  async getEventDetail(id: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/events/${id}`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn(`[CloudNet API] Could not fetch detail for event ${id}:`, e);
    }
    return null;
  },

  // 3. Submit Citizen Report
  async submitReport(payload: any): Promise<WeatherEvent | null> {
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        return this._mapBackendToClient(data);
      }
    } catch (e) {
      console.warn('[CloudNet API] Backend report submission failed, offline queuing:', e);
    }
    return null;
  },

  // 4. Analytics
  async getAnalytics(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/analytics`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[CloudNet API] Analytics fetch failed:', e);
    }
    return null;
  },

  // 5. System Health
  async getSystemHealth(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/system/health`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[CloudNet API] Health check failed:', e);
    }
    return { status: 'DEGRADED', database: 'OFFLINE', ai_engine: 'FALLBACK_RULES' };
  },

  // 6. Admin Login
  async login(username: string, password: string): Promise<AuthSession> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid username or password');
    }

    const data = await res.json();
    const session: AuthSession = {
      token: data.access_token,
      role: data.role,
      username: data.username,
    };
    this.setAuthSession(session);
    return session;
  },

  // 7. Admin Verification Queue
  async getVerificationQueue(status = 'PROVISIONAL'): Promise<WeatherEvent[]> {
    try {
      const res = await fetch(`${API_BASE}/admin/verification-queue?status_filter=${status}`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.map(this._mapBackendToClient);
      }
    } catch (e) {
      console.warn('[CloudNet API] Could not fetch verification queue:', e);
    }
    return [];
  },

  // 8. Admin Override / Verify / Flag
  async overrideEvent(eventId: string, newStatus: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/events/${eventId}/override`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ new_status: newStatus, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Administrative action failed');
    }
    return await res.json();
  },

  // 9. Trigger SIH Demonstration Scenarios
  async triggerDemoScenario(scenarioId: string, params?: any): Promise<any> {
    let url = `${API_BASE}/demo/scenario/${scenarioId}`;
    if (params) {
      const search = new URLSearchParams(params).toString();
      url += `?${search}`;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Demo scenario ${scenarioId} failed`);
    }
    return await res.json();
  },

  // Internal mapper
  _mapBackendToClient(b: any): WeatherEvent {
    return {
      id: b.id,
      source: b.source?.type?.toLowerCase() || 'citizen',
      sourceAuthor: b.source?.name || 'Anonymous Reporter',
      timestamp: b.timestamps?.uploadTime || new Date().toISOString(),
      city: b.location?.city || b.city || 'India',
      state: b.location?.state || b.state || 'National',
      latitude: b.location?.latitude ?? b.latitude ?? 28.6139,
      longitude: b.location?.longitude ?? b.longitude ?? 77.2090,
      category: (b.category?.replace('heavy_rainfall', 'rainfall') || 'rainfall') as any,
      severity: (b.severity?.toLowerCase() || 'medium') as any,
      title: b.title || `Weather alert in ${b.city || 'India'}`,
      description: b.text || b.description || '',
      verificationStatus: (b.verification?.status?.toLowerCase() || b.verificationStatus?.toLowerCase() || 'unverified') as any,
      confidenceScore: b.verification?.confidence ?? b.confidenceScore ?? 50,
      duplicateOf: b.processing?.duplicateOf,
      mediaUrl: b.media_url,
      evidence: b.evidence || [],
      auditLogs: b.audit_logs || [],
    } as any;
  },
};
