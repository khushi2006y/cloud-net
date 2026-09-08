/**
 * initialEvents.ts — UI Configuration Constants
 *
 * Contains CATEGORY_CONFIG (display metadata for the 7 IMD weather categories)
 * and MOOD_THEMES (ambient atmosphere themes for the dashboard).
 *
 * ⚠️  All hardcoded seed weather events have been removed.
 *     The platform exclusively uses live data from:
 *      - Open-Meteo API  (https://open-meteo.com)
 *      - Open-Meteo Geocoding API
 *      - Nominatim / OpenStreetMap
 *      - Citizen crowdsource reports (form submissions)
 *
 * Geographic lookup constants (cities, districts, states) have been
 * moved to src/config/india.ts.
 */

import { WeatherEvent, CategoryMeta, EventCategory, WeatherMood, MoodTheme } from '../types/weather';

// Re-export geographic config for backwards compatibility with any remaining
// consumers that have not yet been updated to import from config/india directly.
export { MAJOR_INDIAN_CITIES, MAJOR_INDIAN_DISTRICTS, INDIAN_STATES } from '../config/india';
export type { CityNode, DistrictNode } from '../config/india';

// ─── Category Display Configuration ─────────────────────────────────────────

export const CATEGORY_CONFIG: Record<EventCategory, CategoryMeta> = {
  rainfall: {
    id: 'rainfall',
    label: 'Heavy Rainfall',
    emoji: '🌧️',
    color: '#0284c7',
    bgHex: '#e0f2fe',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeBorder: 'border-sky-300',
    iconName: 'CloudRain',
    description: 'Continuous downpour >65mm in 24h'
  },
  thunderstorm: {
    id: 'thunderstorm',
    label: 'Thunderstorm',
    emoji: '⚡',
    color: '#7c3aed',
    bgHex: '#f3e8ff',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeBorder: 'border-purple-300',
    iconName: 'Zap',
    description: 'Convective lightning storms and thunder squalls'
  },
  flooding: {
    id: 'flooding',
    label: 'Urban Flooding',
    emoji: '🌊',
    color: '#0369a1',
    bgHex: '#e0f2fe',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-200',
    badgeBorder: 'border-blue-300',
    iconName: 'Waves',
    description: 'Road waterlogging and overflowing drains'
  },
  heatwave: {
    id: 'heatwave',
    label: 'Severe Heatwave',
    emoji: '🔥',
    color: '#ea580c',
    bgHex: '#ffedd5',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-200',
    badgeBorder: 'border-orange-300',
    iconName: 'Sun',
    description: 'Temperatures >4.5°C above normal average'
  },
  fog: {
    id: 'fog',
    label: 'Dense Fog',
    emoji: '🌫️',
    color: '#475569',
    bgHex: '#f1f5f9',
    badgeBg: 'bg-slate-200 text-slate-800 border-slate-300',
    badgeBorder: 'border-slate-300',
    iconName: 'CloudFog',
    description: 'Visibility <200m causing transit slowdowns'
  },
  'dust storm': {
    id: 'dust storm',
    label: 'Dust Storm (Andhi)',
    emoji: '🌪️',
    color: '#ca8a04',
    bgHex: '#fef9c3',
    badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    badgeBorder: 'border-yellow-300',
    iconName: 'Wind',
    description: 'Convective dust storms reducing visibility'
  },
  'strong wind': {
    id: 'strong wind',
    label: 'Strong Winds',
    emoji: '💨',
    color: '#0d9488',
    bgHex: '#ccfbf1',
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-200',
    badgeBorder: 'border-teal-300',
    iconName: 'Tornado',
    description: 'High velocity squalls exceeding 55 km/h'
  }
};

// ─── Dashboard Mood / Atmosphere Themes ──────────────────────────────────────

export const MOOD_THEMES: Record<WeatherMood, MoodTheme> = {
  default: {
    id: 'default',
    label: 'Clear Day',
    emoji: '☀️',
    bgGradient: 'from-sky-50 via-slate-50 to-blue-50/70',
    accentColor: '#0284c7',
    badgeBg: 'bg-white/80',
    badgeText: 'text-slate-800',
    description: 'National overview mode. Tap any map pin to shift the mood.',
    headerSubtitle: 'National Meteorological Monitoring & Verification'
  },
  rainfall: {
    id: 'rainfall',
    label: 'Rainy Atmosphere',
    emoji: '🌧️',
    bgGradient: 'from-blue-100/80 via-sky-50 to-slate-100',
    accentColor: '#0284c7',
    badgeBg: 'bg-sky-100/90',
    badgeText: 'text-sky-900',
    description: 'Monsoon precipitation active. Cool rainy atmosphere.',
    headerSubtitle: 'Rainfall & Monsoon Radar Active'
  },
  thunderstorm: {
    id: 'thunderstorm',
    label: 'Thunderstorm Sky',
    emoji: '⚡',
    bgGradient: 'from-purple-100/90 via-indigo-50 to-slate-100',
    accentColor: '#7c3aed',
    badgeBg: 'bg-purple-100/90',
    badgeText: 'text-purple-900',
    description: 'Convective storm front with lightning alerts.',
    headerSubtitle: 'Thunderstorm & Lightning Tracking Active'
  },
  flooding: {
    id: 'flooding',
    label: 'Flooding Alert',
    emoji: '🌊',
    bgGradient: 'from-cyan-100/80 via-blue-50 to-sky-100/70',
    accentColor: '#0369a1',
    badgeBg: 'bg-cyan-100/90',
    badgeText: 'text-cyan-900',
    description: 'Inundation & waterlogging surveillance mode.',
    headerSubtitle: 'Urban Waterlogging & Flood Warnings Active'
  },
  heatwave: {
    id: 'heatwave',
    label: 'Heatwave Sunlight',
    emoji: '🔥',
    bgGradient: 'from-amber-100/90 via-orange-50 to-yellow-50/80',
    accentColor: '#ea580c',
    badgeBg: 'bg-orange-100/90',
    badgeText: 'text-orange-950',
    description: 'Scorching daytime temperatures & Loo advisory active.',
    headerSubtitle: 'Severe Heatwave Alert Active'
  },
  fog: {
    id: 'fog',
    label: 'Dense Mist / Fog',
    emoji: '🌫️',
    bgGradient: 'from-slate-200/80 via-gray-100 to-slate-100',
    accentColor: '#475569',
    badgeBg: 'bg-slate-200/90',
    badgeText: 'text-slate-800',
    description: 'Low visibility & morning mist conditions.',
    headerSubtitle: 'Dense Fog & Low Visibility Advisory'
  },
  'dust storm': {
    id: 'dust storm',
    label: 'Desert Dust Storm',
    emoji: '🌪️',
    bgGradient: 'from-yellow-100/90 via-amber-50 to-orange-50/70',
    accentColor: '#ca8a04',
    badgeBg: 'bg-yellow-100/90',
    badgeText: 'text-yellow-950',
    description: 'Convective dust wall & reduced horizontal visibility.',
    headerSubtitle: 'Dust Storm (Andhi) Advisory Active'
  },
  'strong wind': {
    id: 'strong wind',
    label: 'High Velocity Winds',
    emoji: '💨',
    bgGradient: 'from-teal-100/80 via-cyan-50 to-emerald-50/70',
    accentColor: '#0d9488',
    badgeBg: 'bg-teal-100/90',
    badgeText: 'text-teal-950',
    description: 'Squall front & gale velocity winds.',
    headerSubtitle: 'High Wind Velocity & Squall Advisory'
  }
};

// ─── Type guard helper ────────────────────────────────────────────────────────

/** Narrows an unknown string into a valid EventCategory */
export function isValidCategory(cat: string): cat is EventCategory {
  return Object.keys(CATEGORY_CONFIG).includes(cat);
}

// ─── Placeholder export for type safety ──────────────────────────────────────

/**
 * Returns an empty array — the platform no longer ships seed event data.
 * All events come from live APIs and citizen submissions.
 * @deprecated Use getStoredEvents() from storage.ts which sources live data.
 */
export const INITIAL_WEATHER_EVENTS: WeatherEvent[] = [];
