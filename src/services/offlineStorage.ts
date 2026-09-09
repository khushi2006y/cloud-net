/**
 * offlineStorage.ts — IndexedDB-Backed Disaster Resilience Store
 *
 * Implements structured, lightweight local caching for emergency offline operation:
 *  - OfflineSnapshot (hyperlocal weather, local alerts, emergency contacts, safe zones)
 *  - PendingReport queue (offline crowdsource submissions awaiting reconnect)
 *  - Emergency facilities (hospitals, flood shelters, police, rescue stations)
 *
 * Guaranteed fallback to localStorage if IndexedDB is restricted.
 */

import { WeatherEvent, EventCategory, SeverityLevel } from '../types/weather';

export interface EmergencyContact {
  name: string;
  number: string;
  desc: string;
  category: 'unified' | 'rescue' | 'medical' | 'disaster' | 'local';
}

export interface EmergencyFacility {
  id: string;
  name: string;
  type: 'hospital' | 'shelter' | 'police' | 'fire' | 'relief_camp';
  latitude: number;
  longitude: number;
  address: string;
  contactPhone?: string;
  capacity?: number;
  status: 'operational' | 'congested' | 'evacuating';
  distanceKm?: number;
}

export interface OfflineSnapshot {
  id?: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    locality?: string;
    radiusKm: number;
  };
  weather: WeatherEvent[];
  events: WeatherEvent[];
  alerts: Array<{
    id: string;
    category: string;
    title: string;
    severity: string;
    description: string;
    timestamp: string;
    instructions: string[];
  }>;
  emergencyContacts: EmergencyContact[];
  emergencyFacilities: EmergencyFacility[];
  lastSyncedAt: string;
  version: number;
}

export interface PendingReport {
  id: string;
  latitude: number;
  longitude: number;
  category: EventCategory;
  severity: SeverityLevel;
  title: string;
  description: string;
  timestamp: string;
  city: string;
  state: string;
  authorName: string;
  mediaUrl?: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastAttempt?: string;
  error?: string;
  idempotencyKey: string;
}

const DB_NAME = 'cloudnet_offline_emergency_db';
const DB_VERSION = 1;
const SNAPSHOT_KEY = 'active_emergency_snapshot';
const LOCALSTORAGE_SNAPSHOT_KEY = 'cloudnet_offline_snapshot_fallback_v1';
const LOCALSTORAGE_PENDING_KEY = 'cloudnet_pending_reports_fallback_v1';

// Pan-India verified helplines default seed
export const DEFAULT_EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: 'National Emergency Response (Police / Fire / Medical)', number: '112', desc: 'Pan-India 24/7 unified emergency dispatch', category: 'unified' },
  { name: 'NDRF Disaster Helpline (HQ)', number: '1078', desc: 'National Disaster Response Force water rescue & evacuation', category: 'rescue' },
  { name: 'Emergency Ambulance & Critical Care', number: '108', desc: 'Toll-free emergency medical response', category: 'medical' },
  { name: 'IMD Severe Weather Advisory Helpline', number: '1800-180-1717', desc: 'Toll-free meteorological storm warnings', category: 'disaster' },
  { name: 'State Disaster Management Control Room', number: '1070', desc: 'State-level disaster relief coordination', category: 'disaster' },
  { name: 'District Disaster Management Room', number: '1077', desc: 'Local district magistrate emergency operations', category: 'local' }
];

class OfflineStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('snapshots')) {
            db.createObjectStore('snapshots', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('pending_reports')) {
            const reportStore = db.createObjectStore('pending_reports', { keyPath: 'id' });
            reportStore.createIndex('syncStatus', 'syncStatus', { unique: false });
            reportStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('IndexedDB open error, falling back to LocalStorage:', req.error);
          reject(req.error);
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  // ─── Offline Snapshot Methods ───────────────────────────────────────────────

  public async saveOfflineSnapshot(snapshot: OfflineSnapshot): Promise<void> {
    const record = { ...snapshot, id: SNAPSHOT_KEY };

    // Always mirror to localStorage as resilient secondary fallback
    try {
      localStorage.setItem(LOCALSTORAGE_SNAPSHOT_KEY, JSON.stringify(record));
    } catch (e) {
      console.warn('LocalStorage snapshot write limit:', e);
    }

    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('snapshots', 'readwrite');
        const store = tx.objectStore('snapshots');
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      });
    } catch (err) {
      console.warn('IndexedDB snapshot write error, using fallback:', err);
    }
  }

  public async getOfflineSnapshot(): Promise<OfflineSnapshot | null> {
    try {
      const db = await this.initDB();
      const snapshotFromIdb = await new Promise<OfflineSnapshot | null>((resolve) => {
        const tx = db.transaction('snapshots', 'readonly');
        const store = tx.objectStore('snapshots');
        const getReq = store.get(SNAPSHOT_KEY);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      });

      if (snapshotFromIdb) return snapshotFromIdb;
    } catch (err) {
      // Fallback
    }

    try {
      const raw = localStorage.getItem(LOCALSTORAGE_SNAPSHOT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}

    return null;
  }

  // ─── Pending Reports Methods (Offline Citizen Reporting Queue) ─────────────

  public async queuePendingReport(report: PendingReport): Promise<void> {
    // 1. Mirror in localStorage
    try {
      const currentRaw = localStorage.getItem(LOCALSTORAGE_PENDING_KEY);
      const list: PendingReport[] = currentRaw ? JSON.parse(currentRaw) : [];
      const updated = [report, ...list.filter((r) => r.id !== report.id)];
      localStorage.setItem(LOCALSTORAGE_PENDING_KEY, JSON.stringify(updated));
    } catch {}

    // 2. Write to IndexedDB
    try {
      const db = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('pending_reports', 'readwrite');
        const store = tx.objectStore('pending_reports');
        const req = store.put(report);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('IndexedDB write error for pending report:', err);
    }

    // Trigger local update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cloudnet_pending_reports_changed'));
    }
  }

  public async getPendingReports(): Promise<PendingReport[]> {
    try {
      const db = await this.initDB();
      const reports = await new Promise<PendingReport[]>((resolve) => {
        const tx = db.transaction('pending_reports', 'readonly');
        const store = tx.objectStore('pending_reports');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      if (reports && reports.length > 0) {
        return reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch (err) {}

    try {
      const raw = localStorage.getItem(LOCALSTORAGE_PENDING_KEY);
      if (raw) {
        const parsed: PendingReport[] = JSON.parse(raw);
        return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch {}

    return [];
  }

  public async updatePendingReportStatus(
    id: string,
    status: 'pending' | 'syncing' | 'synced' | 'failed',
    errorMsg?: string
  ): Promise<void> {
    const all = await this.getPendingReports();
    const target = all.find((r) => r.id === id);
    if (!target) return;

    target.syncStatus = status;
    if (errorMsg) target.error = errorMsg;
    if (status === 'syncing') target.lastAttempt = new Date().toISOString();
    if (status === 'failed') target.retryCount = (target.retryCount || 0) + 1;

    await this.queuePendingReport(target);
  }

  public async removePendingReport(id: string): Promise<void> {
    try {
      const currentRaw = localStorage.getItem(LOCALSTORAGE_PENDING_KEY);
      if (currentRaw) {
        const list: PendingReport[] = JSON.parse(currentRaw);
        localStorage.setItem(
          LOCALSTORAGE_PENDING_KEY,
          JSON.stringify(list.filter((r) => r.id !== id))
        );
      }
    } catch {}

    try {
      const db = await this.initDB();
      await new Promise<void>((resolve) => {
        const tx = db.transaction('pending_reports', 'readwrite');
        const store = tx.objectStore('pending_reports');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cloudnet_pending_reports_changed'));
    }
  }

  public async clearAllOfflineData(): Promise<void> {
    try {
      localStorage.removeItem(LOCALSTORAGE_SNAPSHOT_KEY);
      localStorage.removeItem(LOCALSTORAGE_PENDING_KEY);
    } catch {}

    try {
      const db = await this.initDB();
      const tx = db.transaction(['snapshots', 'pending_reports'], 'readwrite');
      tx.objectStore('snapshots').clear();
      tx.objectStore('pending_reports').clear();
    } catch {}
  }
}

export const offlineStorage = new OfflineStorageEngine();
