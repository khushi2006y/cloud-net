/**
 * connectivityService.ts — Advanced Multi-Factor Connectivity & Heartbeat Engine
 *
 * Distinguishes between:
 *  1. 'online': Full internet & API reachability
 *  2. 'degraded': Slow network / intermittent API timeouts (3G / congested cell tower)
 *  3. 'offline': Zero connectivity (disaster blackout / airplane mode)
 *
 * Does not rely solely on navigator.onLine, as devices can report online
 * while captive portals, severed cables, or overloaded cell towers block actual traffic.
 */

import { useState, useEffect } from 'react';

export type ConnectivityStatus = 'online' | 'degraded' | 'offline';

type ConnectivityListener = (status: ConnectivityStatus) => void;

class ConnectivityManager {
  private status: ConnectivityStatus = navigator.onLine ? 'online' : 'offline';
  private simulatedStatus: ConnectivityStatus | null = null;
  private consecutiveFailures: number = 0;
  private listeners: Set<ConnectivityListener> = new Set();
  private heartbeatIntervalId: any = null;
  private lastCheckedTimestamp: number = Date.now();

  constructor() {
    // Check saved simulation state if any
    try {
      const savedSim = localStorage.getItem('cloudnet_simulated_connectivity');
      if (savedSim === 'online' || savedSim === 'degraded' || savedSim === 'offline') {
        this.simulatedStatus = savedSim;
      }
    } catch {}

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleBrowserOnline());
      window.addEventListener('offline', () => this.handleBrowserOffline());

      // Start periodic heartbeat every 20s
      this.startHeartbeat();
    }
  }

  public getEffectiveStatus(): ConnectivityStatus {
    if (this.simulatedStatus) {
      return this.simulatedStatus;
    }
    return this.status;
  }

  public setSimulatedStatus(status: ConnectivityStatus | null) {
    this.simulatedStatus = status;
    try {
      if (status) {
        localStorage.setItem('cloudnet_simulated_connectivity', status);
      } else {
        localStorage.removeItem('cloudnet_simulated_connectivity');
      }
    } catch {}
    this.notifyListeners();
  }

  public isSimulated(): boolean {
    return this.simulatedStatus !== null;
  }

  public subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    listener(this.getEffectiveStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const effective = this.getEffectiveStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(effective);
      } catch (err) {
        console.warn('Connectivity listener error:', err);
      }
    });

    // Also dispatch on window for non-React services (like syncQueue)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cloudnet_connectivity_changed', {
          detail: { status: effective }
        })
      );
    }
  }

  private setStatus(newStatus: ConnectivityStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.notifyListeners();
    }
  }

  private handleBrowserOnline() {
    // When browser reports online, verify reachability with a fast ping
    this.consecutiveFailures = 0;
    this.checkReachability();
  }

  private handleBrowserOffline() {
    this.consecutiveFailures = 3;
    this.setStatus('offline');
  }

  /**
   * Called by API services when an HTTP request succeeds
   */
  public reportApiSuccess() {
    this.consecutiveFailures = 0;
    if (this.status !== 'online') {
      this.setStatus('online');
    }
  }

  /**
   * Called by API services when an HTTP request fails or times out
   */
  public reportApiFailure(isTimeout = false) {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= 2 || !navigator.onLine) {
      this.setStatus('offline');
    } else if (this.consecutiveFailures === 1 || isTimeout) {
      this.setStatus('degraded');
    }
  }

  /**
   * Active Reachability Probe
   */
  public async checkReachability(): Promise<ConnectivityStatus> {
    if (!navigator.onLine) {
      this.setStatus('offline');
      return 'offline';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const startTime = Date.now();

    try {
      // Use lightweight reliable endpoint (favicon or Open-Meteo health)
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=28.61&longitude=77.20&current=temperature_2m', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      this.lastCheckedTimestamp = Date.now();
      this.consecutiveFailures = 0;

      if (latencyMs > 2500) {
        this.setStatus('degraded');
        return 'degraded';
      }

      this.setStatus('online');
      return 'online';
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.consecutiveFailures++;

      if (this.consecutiveFailures >= 2 || !navigator.onLine) {
        this.setStatus('offline');
        return 'offline';
      } else {
        this.setStatus('degraded');
        return 'degraded';
      }
    }
  }

  private startHeartbeat() {
    if (this.heartbeatIntervalId) clearInterval(this.heartbeatIntervalId);

    // Heartbeat check every 25 seconds
    this.heartbeatIntervalId = setInterval(() => {
      // If simulated, don't auto-probe
      if (!this.simulatedStatus) {
        this.checkReachability();
      }
    }, 25000);
  }
}

export const connectivityManager = new ConnectivityManager();

/**
 * React Hook for real-time connectivity status
 */
export function useConnectivity() {
  const [status, setStatus] = useState<ConnectivityStatus>(() => connectivityManager.getEffectiveStatus());
  const [isSimulated, setIsSimulated] = useState<boolean>(() => connectivityManager.isSimulated());

  useEffect(() => {
    const unsub = connectivityManager.subscribe((newStatus) => {
      setStatus(newStatus);
      setIsSimulated(connectivityManager.isSimulated());
    });
    return unsub;
  }, []);

  return {
    status,
    isOnline: status === 'online',
    isDegraded: status === 'degraded',
    isOffline: status === 'offline',
    isSimulated,
    setSimulatedStatus: (s: ConnectivityStatus | null) => connectivityManager.setSimulatedStatus(s),
    checkReachability: () => connectivityManager.checkReachability()
  };
}
