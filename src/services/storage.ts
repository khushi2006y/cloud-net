/**
 * storage.ts — Centralised Event Store
 *
 * Provides a high-speed in-memory cache backed by localStorage for the
 * weather event dataset. All events originate from live sources:
 *   - Open-Meteo API (real-time sensor telemetry)
 *   - Citizen crowdsource submissions (form)
 *   - Simulated / testbed ingestion (SimulationControls)
 *
 * NO hardcoded seed data is loaded. On cold-start (empty store),
 * the application shows a loading skeleton while App.tsx triggers
 * a live Open-Meteo sync to populate the dataset.
 */

import { WeatherEvent, VerificationStatus } from '../types/weather';
import { evaluateEventRules } from './processingEngine';
import { globalSpatialGrid } from './spatialIndex';

const STORAGE_KEY = 'cloudnet_weather_events_v2';
const ADMIN_AUTH_KEY = 'cloudnet_admin_auth_v1';

// In-memory high-speed cache for Big Data scale
let inMemoryEventsCache: WeatherEvent[] | null = null;

// ─── Core CRUD ────────────────────────────────────────────────────────────────

export function getStoredEvents(): WeatherEvent[] {
  // Serve from in-memory cache if available
  if (inMemoryEventsCache && inMemoryEventsCache.length > 0) {
    return inMemoryEventsCache;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      inMemoryEventsCache = [];
      return [];
    }
    const parsed: WeatherEvent[] = JSON.parse(data);
    
    // Automatic Real-Data Sanitation: Clean out any legacy dummy/mock/spam events
    const cleanLiveEvents: WeatherEvent[] = [];
    const seenCityApi = new Set<string>();

    for (const e of parsed) {
      const isDummy = 
        e.id.includes('evt-bigdata-') ||
        e.id.startsWith('temp-city-') ||
        (e.sourceAuthor && (e.sourceAuthor.startsWith('User_') || e.sourceAuthor.startsWith('SpamBot_') || e.sourceAuthor.startsWith('TrollAccount_'))) ||
        e.title?.startsWith('Social report:') ||
        e.title?.startsWith('Special Promo:') ||
        e.verificationStatus === 'duplicate';

      if (isDummy) continue;

      // Deduplicate API city synops so each city has strictly 1 live event
      if (e.source === 'api') {
        const cityKey = e.city.toLowerCase().trim();
        if (seenCityApi.has(cityKey)) continue;
        seenCityApi.add(cityKey);
      }

      cleanLiveEvents.push(e);
    }

    inMemoryEventsCache = cleanLiveEvents;
    globalSpatialGrid.clear();
    globalSpatialGrid.insertBatch(cleanLiveEvents);
    
    // If dummy data was pruned, update localStorage immediately
    if (cleanLiveEvents.length !== parsed.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanLiveEvents));
      } catch {}
    }

    return cleanLiveEvents;
  } catch (e) {
    console.error('Failed to parse stored events, starting fresh:', e);
    inMemoryEventsCache = [];
    globalSpatialGrid.clear();
    return [];
  }
}

export function saveEvents(events: WeatherEvent[]): void {
  inMemoryEventsCache = events;
  globalSpatialGrid.clear();
  globalSpatialGrid.insertBatch(events);

  try {
    const serializable = events.length > 1000 ? events.slice(0, 1000) : events;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (e) {
    console.warn('LocalStorage limit reached; persisting top slice and caching full in memory:', e);
  }

  // Trigger storage event for cross-component reactive sync
  window.dispatchEvent(new CustomEvent('cloudnet_events_updated', { detail: events }));
}

export function batchAddEvents(newEvents: WeatherEvent[]): WeatherEvent[] {
  const current = getStoredEvents();
  const eventMap = new Map<string, WeatherEvent>();

  // Add existing clean events
  for (const e of current) {
    const key = e.source === 'api' ? `api-city-${e.city.toLowerCase().trim()}` : e.id;
    eventMap.set(key, e);
  }

  // Upsert new live telemetry (fresh readings replace older city readings)
  for (const ne of newEvents) {
    const key = ne.source === 'api' ? `api-city-${ne.city.toLowerCase().trim()}` : ne.id;
    eventMap.set(key, ne);
  }

  const merged = Array.from(eventMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  saveEvents(merged);
  return merged;
}

export function purgeAllMockAndSyncLive(): void {
  localStorage.removeItem(STORAGE_KEY);
  inMemoryEventsCache = [];
  globalSpatialGrid.clear();
  window.dispatchEvent(new CustomEvent('cloudnet_events_updated', { detail: [] }));
}

export function addEventWithProcessing(
  rawEvent: Omit<WeatherEvent, 'id' | 'verificationStatus' | 'confidenceScore'> & {
    id?: string;
  }
): { 
  event: WeatherEvent; 
  isDuplicate: boolean; 
  isFlagged: boolean; 
  isContradictory?: boolean;
  isDeleted?: boolean;
  deleteReason?: string;
  flagReason?: string; 
} {
  const currentEvents = getStoredEvents();

  const ruleResult = evaluateEventRules(
    {
      text: `${rawEvent.title} ${rawEvent.description} ${rawEvent.rawText || ''}`,
      category: rawEvent.category,
      latitude: rawEvent.latitude,
      longitude: rawEvent.longitude,
      timestamp: rawEvent.timestamp,
      source: rawEvent.source,
      isOfficialSource: rawEvent.isOfficialSource,
      exifMetadata: rawEvent.exifMetadata,
      timestamps: rawEvent.timestamps
    },
    currentEvents
  );

  const newId = rawEvent.id || `evt-${rawEvent.source.slice(0, 3)}-${Date.now()}`;

  const fullEvent: WeatherEvent = {
    ...rawEvent,
    id: newId,
    verificationStatus: ruleResult.initialStatus,
    confidenceScore: ruleResult.confidence,
    credibilityScore: ruleResult.credibilityScore,
    sourceTrustLevel: ruleResult.sourceTrustLevel,
    aiClassificationCategory: ruleResult.suggestedCategory,
    aiClassificationConfidence: ruleResult.confidence,
    matchedKeywords: ruleResult.matchedKeywords,
    aiFakeDetection: ruleResult.aiFakeDetection,
    flagReason: ruleResult.flagReason || ruleResult.autoDeleteReason,
    mergedWithId: ruleResult.matchedEventId,
    duplicateCount: ruleResult.isDuplicate ? 1 : 0,
    displayPolicy: ruleResult.displayPolicy,
    display_policy: ruleResult.displayPolicy,
    supportingEvidence: ruleResult.supportingEvidence,
    supporting_evidence: ruleResult.supportingEvidence,
    contradictingEvidence: ruleResult.contradictingEvidence,
    contradicting_evidence: ruleResult.contradictingEvidence,
    isContradictory: ruleResult.initialStatus === 'contradicted' || ruleResult.displayPolicy === 'SHOW_CONTRADICTED',
    confidenceBreakdown: ruleResult.confidenceBreakdown,
    exifMetadata: ruleResult.exifMetadata || rawEvent.exifMetadata
  };

  // If contradictory, retain in storage as contradicted/quarantined (display_policy = SHOW_CONTRADICTED)
  // so analysts/citizens can audit the contradiction card if they opt into the Flagged Reports Layer
  if (ruleResult.shouldAutoDelete || ruleResult.initialStatus === 'contradicted' || ruleResult.displayPolicy === 'SHOW_CONTRADICTED') {
    const contradictedEvent: WeatherEvent = {
      ...fullEvent,
      verificationStatus: 'contradicted',
      displayPolicy: 'SHOW_CONTRADICTED',
      display_policy: 'SHOW_CONTRADICTED',
      isContradictory: true,
      flagReason: ruleResult.autoDeleteReason || ruleResult.flagReason || 'Atmospheric telemetry contradicts report'
    };
    const updatedList = [contradictedEvent, ...currentEvents];
    saveEvents(updatedList);
    return {
      event: contradictedEvent,
      isDuplicate: false,
      isFlagged: true,
      isContradictory: true,
      isDeleted: false,
      deleteReason: undefined,
      flagReason: contradictedEvent.flagReason
    };
  }

  // If duplicate, also increment duplicate count on the parent event
  let updatedList = [fullEvent, ...currentEvents];
  if (ruleResult.isDuplicate && ruleResult.matchedEventId) {
    updatedList = updatedList.map(e => {
      if (e.id === ruleResult.matchedEventId) {
        return { ...e, duplicateCount: (e.duplicateCount || 0) + 1 };
      }
      return e;
    });
  }

  saveEvents(updatedList);
  return {
    event: fullEvent,
    isDuplicate: ruleResult.isDuplicate,
    isFlagged: ruleResult.isFlagged,
    isContradictory: false,
    isDeleted: false,
    flagReason: ruleResult.flagReason
  };
}

export function mergeDuplicateCluster(parentId: string, duplicateIds: string[]): WeatherEvent[] {
  const currentEvents = getStoredEvents();
  const updated = currentEvents.map(e => {
    if (e.id === parentId) {
      return {
        ...e,
        duplicateCount: (e.duplicateCount || 0) + duplicateIds.length,
        confidenceScore: Math.min(99, e.confidenceScore + 5)
      };
    }
    if (duplicateIds.includes(e.id)) {
      return {
        ...e,
        verificationStatus: 'duplicate' as VerificationStatus,
        mergedWithId: parentId
      };
    }
    return e;
  });

  saveEvents(updated);
  return updated;
}

export function batchVerifyEvents(ids: string[], newStatus: VerificationStatus): WeatherEvent[] {
  const currentEvents = getStoredEvents();
  const updated = currentEvents.map(e => {
    if (ids.includes(e.id)) {
      return {
        ...e,
        verificationStatus: newStatus,
        confidenceScore: newStatus === 'verified' ? Math.max(e.confidenceScore, 95) : e.confidenceScore
      };
    }
    return e;
  });

  saveEvents(updated);
  return updated;
}

export function updateEventStatus(
  id: string,
  newStatus: VerificationStatus,
  flagReason?: string
): WeatherEvent[] {
  const currentEvents = getStoredEvents();
  const updated = currentEvents.map(e => {
    if (e.id === id) {
      return {
        ...e,
        verificationStatus: newStatus,
        flagReason: flagReason || e.flagReason,
        confidenceScore:
          newStatus === 'verified'
            ? Math.max(e.confidenceScore, 95)
            : newStatus === 'flagged'
            ? 10
            : e.confidenceScore
      };
    }
    return e;
  });

  saveEvents(updated);
  return updated;
}

export function deleteEvent(id: string): WeatherEvent[] {
  const currentEvents = getStoredEvents();
  const updated = currentEvents.filter(e => e.id !== id);
  saveEvents(updated);
  return updated;
}

// ─── Dataset Management ───────────────────────────────────────────────────────

/**
 * Clears all stored events and resets the in-memory cache.
 * After calling this, trigger a live Open-Meteo sync to repopulate.
 * (Replaces the old resetToSeedData() which injected hardcoded events.)
 */
export function clearAllEvents(): void {
  inMemoryEventsCache = [];
  globalSpatialGrid.clear();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear localStorage:', e);
  }
  window.dispatchEvent(new CustomEvent('cloudnet_events_updated', { detail: [] }));
}

/**
 * @deprecated Use clearAllEvents() instead.
 * Kept for backward compatibility — clears data instead of seeding hardcoded events.
 */
export function resetToSeedData(): WeatherEvent[] {
  clearAllEvents();
  return [];
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

export function getAdminAuthState(): boolean {
  try {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminAuthState(authed: boolean): void {
  try {
    localStorage.setItem(ADMIN_AUTH_KEY, authed ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to set admin auth in localStorage:', e);
  }
}

// ─── Export Utilities ─────────────────────────────────────────────────────────

export function exportEventsAsCsv(events: WeatherEvent[]): void {
  const headers = [
    'ID',
    'Timestamp',
    'City',
    'State',
    'Latitude',
    'Longitude',
    'Category',
    'Severity',
    'Source',
    'Source Author',
    'Verification Status',
    'Confidence Score',
    'Title',
    'Description',
    'Media URL'
  ];

  const rows = events.map(e => [
    `"${e.id}"`,
    `"${e.timestamp}"`,
    `"${e.city}"`,
    `"${e.state}"`,
    e.latitude,
    e.longitude,
    `"${e.category}"`,
    `"${e.severity}"`,
    `"${e.source}"`,
    `"${e.sourceAuthor}"`,
    `"${e.verificationStatus}"`,
    e.confidenceScore,
    `"${e.title.replace(/"/g, '""')}"`,
    `"${e.description.replace(/"/g, '""')}"`,
    `"${e.mediaUrl || ''}"`
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `cloudnet_imd_weather_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportEventsAsJson(events: WeatherEvent[]): void {
  const dataStr =
    'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `cloudnet_imd_weather_dataset_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── User Report History (My Reports) ────────────────────────────────────────

const USER_REPORTS_KEY = 'cloudnet_user_reports_v1';

export function getUserReports(): WeatherEvent[] {
  try {
    const data = localStorage.getItem(USER_REPORTS_KEY);
    return data ? (JSON.parse(data) as WeatherEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveUserReport(event: WeatherEvent): void {
  try {
    const existing = getUserReports();
    // Prepend so the most recent report appears first
    const updated = [event, ...existing.filter(e => e.id !== event.id)];
    localStorage.setItem(USER_REPORTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save user report to history:', e);
  }
}

export function clearUserReports(): void {
  try {
    localStorage.removeItem(USER_REPORTS_KEY);
  } catch {}
}
