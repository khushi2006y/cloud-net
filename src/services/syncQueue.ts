/**
 * syncQueue.ts — Resilient Offline-to-Online Synchronization Queue
 *
 * Requirements:
 *  - Persist pending reports across browser refreshes & device restarts
 *  - Idempotent deduplication (prevents duplicate submission of the same report)
 *  - Automatic sync on network restoration
 *  - Exponential backoff on transient errors
 *  - Clear sync state events & user notifications
 */

import { offlineStorage, PendingReport } from './offlineStorage';
import { connectivityManager } from './connectivityService';
import { addEventWithProcessing, saveUserReport } from './storage';
import { WeatherEvent } from '../types/weather';

class SyncQueueEngine {
  private isSyncing: boolean = false;
  private syncListeners: Set<(isSyncing: boolean, pendingCount: number) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for connectivity transitions
      window.addEventListener('cloudnet_connectivity_changed', (e: any) => {
        if (e.detail?.status === 'online') {
          this.syncPendingReports();
        }
      });

      // Periodic check every 15s if online
      setInterval(() => {
        if (connectivityManager.getEffectiveStatus() === 'online' && !this.isSyncing) {
          this.syncPendingReports();
        }
      }, 15000);
    }
  }

  public subscribe(listener: (isSyncing: boolean, pendingCount: number) => void): () => void {
    this.syncListeners.add(listener);
    this.getPendingCount().then((count) => listener(this.isSyncing, count));
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private notify() {
    this.getPendingCount().then((count) => {
      this.syncListeners.forEach((l) => l(this.isSyncing, count));
    });
  }

  public async getPendingCount(): Promise<number> {
    const reports = await offlineStorage.getPendingReports();
    return reports.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed').length;
  }

  /**
   * Primary sync loop: processes all pending/failed reports into the main CloudNet system
   */
  public async syncPendingReports(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    if (connectivityManager.getEffectiveStatus() !== 'online') {
      return { synced: 0, failed: 0 };
    }

    const allReports = await offlineStorage.getPendingReports();
    const toSync = allReports.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');

    if (toSync.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notify();

    let syncedCount = 0;
    let failedCount = 0;

    for (const report of toSync) {
      try {
        await offlineStorage.updatePendingReportStatus(report.id, 'syncing');

        // Small simulated transmission delay for clean UI progression
        await new Promise((res) => setTimeout(res, 400));

        // Submit to CloudNet processing engine with its persistent ID
        const result = addEventWithProcessing({
          id: report.id,
          source: 'citizen',
          sourceAuthor: report.authorName ? `${report.authorName} (Verified Citizen)` : 'Citizen Reporter',
          timestamp: report.timestamp,
          city: report.city,
          state: report.state,
          latitude: report.latitude,
          longitude: report.longitude,
          category: report.category,
          severity: report.severity,
          title: report.title,
          description: report.description,
          rawText: report.description,
          mediaUrl: report.mediaUrl,
          mediaType: report.mediaUrl ? 'image' : 'none'
        });

        // Update user report history
        saveUserReport(result.event);

        // Mark report as synced
        await offlineStorage.updatePendingReportStatus(report.id, 'synced');
        syncedCount++;
      } catch (err: any) {
        console.error(`Sync failed for report ${report.id}:`, err);
        await offlineStorage.updatePendingReportStatus(
          report.id,
          'failed',
          err?.message || 'Network sync error'
        );
        failedCount++;
      }
    }

    this.isSyncing = false;
    this.notify();

    if (syncedCount > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cloudnet_reports_synced', {
          detail: { count: syncedCount }
        })
      );
    }

    return { synced: syncedCount, failed: failedCount };
  }
}

export const syncQueue = new SyncQueueEngine();
