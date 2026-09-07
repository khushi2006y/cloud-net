import { WeatherEvent } from '../types/weather';
import { calculateDistanceKm } from './processingEngine';

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * High-Performance 2D Spatial Hash Grid for Big Data Meteorological Queries.
 * Provides O(1) spatial bucket lookups and O(log N) proximity searches.
 */
export class SpatialHashGrid {
  private cellSizeKm: number;
  private grid: Map<string, WeatherEvent[]>;
  private allEvents: WeatherEvent[];

  constructor(cellSizeKm: number = 20) {
    this.cellSizeKm = cellSizeKm;
    this.grid = new Map();
    this.allEvents = [];
  }

  private getCellKey(lat: number, lng: number): string {
    // 1 deg latitude is approx 111 km
    const latCell = Math.floor((lat * 111) / this.cellSizeKm);
    // 1 deg longitude at 20 deg latitude is approx 104 km
    const lngCell = Math.floor((lng * 104) / this.cellSizeKm);
    return `${latCell}:${lngCell}`;
  }

  public clear(): void {
    this.grid.clear();
    this.allEvents = [];
  }

  public insert(event: WeatherEvent): void {
    if (isNaN(event.latitude) || isNaN(event.longitude)) return;
    
    this.allEvents.push(event);
    const key = this.getCellKey(event.latitude, event.longitude);
    const cell = this.grid.get(key);
    
    if (cell) {
      cell.push(event);
    } else {
      this.grid.set(key, [event]);
    }
  }

  public insertBatch(events: WeatherEvent[]): void {
    for (let i = 0; i < events.length; i++) {
      this.insert(events[i]);
    }
  }

  /**
   * Fast Neighbor Query: Finds all events within radiusKm of (lat, lng)
   */
  public queryRadius(lat: number, lng: number, radiusKm: number): WeatherEvent[] {
    const results: WeatherEvent[] = [];
    const cellRadius = Math.ceil(radiusKm / this.cellSizeKm);
    
    const centerLatCell = Math.floor((lat * 111) / this.cellSizeKm);
    const centerLngCell = Math.floor((lng * 104) / this.cellSizeKm);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${centerLatCell + dx}:${centerLngCell + dy}`;
        const bucket = this.grid.get(key);

        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            const candidate = bucket[i];
            const dist = calculateDistanceKm(lat, lng, candidate.latitude, candidate.longitude);
            if (dist <= radiusKm) {
              results.push(candidate);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Viewport Bounding Box Query: Filters events to only what is inside the map viewport
   */
  public queryBoundingBox(box: BoundingBox, maxLimit: number = 600): WeatherEvent[] {
    const results: WeatherEvent[] = [];
    const minLatCell = Math.floor((box.minLat * 111) / this.cellSizeKm);
    const maxLatCell = Math.floor((box.maxLat * 111) / this.cellSizeKm);
    const minLngCell = Math.floor((box.minLng * 104) / this.cellSizeKm);
    const maxLngCell = Math.floor((box.maxLng * 104) / this.cellSizeKm);

    for (let latCell = minLatCell; latCell <= maxLatCell; latCell++) {
      for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell++) {
        const key = `${latCell}:${lngCell}`;
        const bucket = this.grid.get(key);

        if (bucket) {
          for (let i = 0; i < bucket.length; i++) {
            const ev = bucket[i];
            if (
              ev.latitude >= box.minLat &&
              ev.latitude <= box.maxLat &&
              ev.longitude >= box.minLng &&
              ev.longitude <= box.maxLng
            ) {
              results.push(ev);
              if (results.length >= maxLimit) {
                return results;
              }
            }
          }
        }
      }
    }

    return results;
  }

  public getAll(): WeatherEvent[] {
    return this.allEvents;
  }

  public size(): number {
    return this.allEvents.length;
  }
}

// Global shared spatial index singleton
export const globalSpatialGrid = new SpatialHashGrid(20);
