import { WeatherEvent, VerificationStatus } from '../types/weather';
import { INITIAL_WEATHER_EVENTS } from '../data/initialEvents';
import { evaluateEventRules } from './processingEngine';
import { globalSpatialGrid } from './spatialIndex';

const STORAGE_KEY = 'blure_weather_events_v1';
const ADMIN_AUTH_KEY = 'blure_admin_auth_v1';

// In-memory high-speed cache for Big Data scale
let inMemoryEventsCache: WeatherEvent[] | null = null;

export function getStoredEvents(): WeatherEvent[] {
  if (inMemoryEventsCache && inMemoryEventsCache.length > 0) {
    return inMemoryEventsCache;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_WEATHER_EVENTS));
      inMemoryEventsCache = INITIAL_WEATHER_EVENTS;
      globalSpatialGrid.insertBatch(INITIAL_WEATHER_EVENTS);
      return INITIAL_WEATHER_EVENTS;
    }
    const parsed = JSON.parse(data);
    inMemoryEventsCache = parsed;
    globalSpatialGrid.clear();
    globalSpatialGrid.insertBatch(parsed);
    return parsed;
  } catch (e) {
    console.error('Failed to parse stored events, resetting to defaults:', e);
    inMemoryEventsCache = INITIAL_WEATHER_EVENTS;
    globalSpatialGrid.clear();
    globalSpatialGrid.insertBatch(INITIAL_WEATHER_EVENTS);
    return INITIAL_WEATHER_EVENTS;
  }
}

export function saveEvents(events: WeatherEvent[]): void {
  inMemoryEventsCache = events;
  globalSpatialGrid.clear();
  globalSpatialGrid.insertBatch(events);

  try {
    // If dataset exceeds 4MB, store newest 1000 items in localStorage and keep full in memory/index
    const serializable = events.length > 1000 ? events.slice(0, 1000) : events;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (e) {
    console.warn('LocalStorage limit reached; persisting top slice and caching full in memory:', e);
  }

  // Trigger storage event for cross-component reactive sync
  window.dispatchEvent(new CustomEvent('blure_events_updated', { detail: events }));
}

export function batchAddEvents(newEvents: WeatherEvent[]): WeatherEvent[] {
  const current = getStoredEvents();
  const merged = [...newEvents, ...current];
  saveEvents(merged);
  return merged;
}

export function addEventWithProcessing(
  rawEvent: Omit<WeatherEvent, 'id' | 'verificationStatus' | 'confidenceScore'> & {
    id?: string;
  }
): { event: WeatherEvent; isDuplicate: boolean; isFlagged: boolean; flagReason?: string } {
  const currentEvents = getStoredEvents();
  
  const ruleResult = evaluateEventRules(
    {
      text: `${rawEvent.title} ${rawEvent.description} ${rawEvent.rawText || ''}`,
      category: rawEvent.category,
      latitude: rawEvent.latitude,
      longitude: rawEvent.longitude,
      timestamp: rawEvent.timestamp,
      source: rawEvent.source,
      isOfficialSource: rawEvent.isOfficialSource
    },
    currentEvents
  );

  const newId = rawEvent.id || `evt-${rawEvent.source.slice(0, 3)}-${Date.now()}`;
  
  const fullEvent: WeatherEvent = {
    ...rawEvent,
    id: newId,
    verificationStatus: ruleResult.initialStatus,
    confidenceScore: ruleResult.confidence,
    aiClassificationCategory: ruleResult.suggestedCategory,
    aiClassificationConfidence: ruleResult.confidence,
    flagReason: ruleResult.flagReason,
    mergedWithId: ruleResult.matchedEventId,
    duplicateCount: ruleResult.isDuplicate ? 1 : 0
  };

  // If duplicate, also increment duplicate count on the parent event
  let updatedList = [fullEvent, ...currentEvents];
  if (ruleResult.isDuplicate && ruleResult.matchedEventId) {
    updatedList = updatedList.map(e => {
      if (e.id === ruleResult.matchedEventId) {
        return {
          ...e,
          duplicateCount: (e.duplicateCount || 0) + 1
        };
      }
      return e;
    });
  }

  saveEvents(updatedList);
  return {
    event: fullEvent,
    isDuplicate: ruleResult.isDuplicate,
    isFlagged: ruleResult.isFlagged,
    flagReason: ruleResult.flagReason
  };
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
        confidenceScore: newStatus === 'verified' ? Math.max(e.confidenceScore, 95) : 
                         newStatus === 'flagged' ? 10 : e.confidenceScore
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

export function resetToSeedData(): WeatherEvent[] {
  localStorage.removeItem(STORAGE_KEY);
  inMemoryEventsCache = INITIAL_WEATHER_EVENTS;
  saveEvents(INITIAL_WEATHER_EVENTS);
  return INITIAL_WEATHER_EVENTS;
}

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

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `cloudnet_imd_weather_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportEventsAsJson(events: WeatherEvent[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `cloudnet_imd_weather_dataset_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
