import { WeatherEvent, EventCategory, SeverityLevel } from '../types/weather';
import { MAJOR_INDIAN_CITIES, INDIAN_STATES } from '../data/initialEvents';
import { addEventWithProcessing } from './storage';
import { globalSpatialGrid } from './spatialIndex';

export interface BatchProcessingStats {
  totalProcessed: number;
  duplicatesMerged: number;
  spamIntercepted: number;
  durationMs: number;
  eventsPerSec: number;
}

const SAMPLE_EVENT_TEMPLATES: { category: EventCategory; templates: string[]; defaultSeverity: SeverityLevel }[] = [
  {
    category: 'rainfall',
    templates: [
      'Heavy cloudburst downpour recorded in {city}. Precipitation rate exceeds 45mm/hr.',
      'Continuous monsoon rain pounding {city} streets. Low visibility on highways.',
      'Heavy spell of rainfall in {city} with localized water stagnation.',
      'Active monsoon surge over {city} district. Radar reflectivity 48 dBZ.'
    ],
    defaultSeverity: 'severe'
  },
  {
    category: 'thunderstorm',
    templates: [
      'Violent thunderstorm squalls and continuous lightning strikes reported across {city}.',
      'Kalbaishakhi storm front sweeping over {city} with thunder rolls and gale gusts.',
      'Severe convective cloud cluster passing over {city}. Anvil cloud height 12km.',
      'Thunderstorm with localized hailstones and sudden barometric pressure drop in {city}.'
    ],
    defaultSeverity: 'severe'
  },
  {
    category: 'flooding',
    templates: [
      'Major road underpass in {city} submerged under 2.5 feet water. Transit blocked.',
      'Canal overflow triggers flash waterlogging in low-lying residential sectors of {city}.',
      'Severe stormwater stagnation reported along main bypass corridor in {city}.'
    ],
    defaultSeverity: 'extreme'
  },
  {
    category: 'heatwave',
    templates: [
      'Intense heatwave conditions: Surface sensor in {city} records 46.2°C.',
      'Severe loo dry winds blowing across {city} at 32 km/h. Red thermal advisory active.',
      'Extreme diurnal temperature surge in {city}. Public advised to stay indoors.'
    ],
    defaultSeverity: 'extreme'
  },
  {
    category: 'fog',
    templates: [
      'Dense winter fog layer over {city} reduces runway visual range to 100m.',
      'Radiation fog envelope across {city} outer ring road. Traffic moving cautiously.'
    ],
    defaultSeverity: 'moderate'
  },
  {
    category: 'dust storm',
    templates: [
      'Massive wall of dust (Andhi) rolls into {city}. Wind gusts clocked at 68 km/h.',
      'Desert sand squall over {city} reducing horizontal visibility to under 80m.'
    ],
    defaultSeverity: 'severe'
  },
  {
    category: 'strong wind',
    templates: [
      'High-velocity cyclonic squall winds gusting up to 82 km/h across {city} coast.',
      'Gale force winds uproot tree branches and banner boards across {city} center.'
    ],
    defaultSeverity: 'severe'
  }
];

/**
 * High-Throughput Big Data Batch Synthesizer & Stress Testbed
 */
export function generateBigDataBatch(count: number = 300): WeatherEvent[] {
  const generated: WeatherEvent[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const cityObj = MAJOR_INDIAN_CITIES[Math.floor(Math.random() * MAJOR_INDIAN_CITIES.length)];
    const templateObj = SAMPLE_EVENT_TEMPLATES[Math.floor(Math.random() * SAMPLE_EVENT_TEMPLATES.length)];
    const rawTemplate = templateObj.templates[Math.floor(Math.random() * templateObj.templates.length)];
    
    // Add realistic jitter to coordinates (within ±0.15 deg / ~15 km of city center)
    const lat = parseFloat((cityObj.lat + (Math.random() - 0.5) * 0.28).toFixed(4));
    const lng = parseFloat((cityObj.lng + (Math.random() - 0.5) * 0.28).toFixed(4));
    
    // Timestamp within last 12 hours
    const timeOffsetMs = Math.floor(Math.random() * 12 * 60 * 60 * 1000);
    const timestamp = new Date(now - timeOffsetMs).toISOString();

    const sources: ('twitter' | 'api' | 'citizen')[] = ['twitter', 'api', 'citizen'];
    const source = sources[Math.floor(Math.random() * sources.length)];
    
    const desc = rawTemplate.replace('{city}', cityObj.name);
    const title = `${templateObj.category.toUpperCase()} alert in ${cityObj.name}`;

    const isSpam = Math.random() < 0.04;
    const isDuplicate = Math.random() < 0.12;

    const event: WeatherEvent = {
      id: `evt-bigdata-${Date.now()}-${i}`,
      source,
      sourceAuthor: source === 'twitter' ? `@WeatherWatch_${cityObj.name}` : source === 'api' ? `IMD AWS [${cityObj.name.slice(0,3).toUpperCase()}]` : `Citizen_${Math.floor(Math.random()*9000+1000)}`,
      timestamp,
      city: cityObj.name,
      state: cityObj.state,
      latitude: lat,
      longitude: lng,
      category: templateObj.category,
      severity: templateObj.defaultSeverity,
      title: isSpam ? 'Special Promo: Earn coins online #IMD' : title,
      description: isSpam ? 'Earn bitcoin promo while it rains in city bit.ly/spam' : desc,
      rawText: desc,
      verificationStatus: isSpam ? 'flagged' : isDuplicate ? 'duplicate' : source === 'api' ? 'verified' : 'unverified',
      confidenceScore: isSpam ? 15 : isDuplicate ? 75 : Math.floor(Math.random() * 20 + 80),
      telemetry: {
        temperatureC: parseFloat((Math.random() * 20 + 20).toFixed(1)),
        windSpeedKmh: parseFloat((Math.random() * 50 + 15).toFixed(1)),
        precipitationMm: templateObj.category === 'rainfall' || templateObj.category === 'flooding' ? parseFloat((Math.random() * 80 + 15).toFixed(1)) : 0,
        humidityPct: Math.floor(Math.random() * 40 + 60)
      }
    };

    generated.push(event);
  }

  return generated;
}

/**
 * Execute High-Throughput Big Data Ingestion Benchmark
 */
export async function executeBigDataIngestion(
  count: number,
  onProgress?: (processed: number, total: number) => void
): Promise<BatchProcessingStats> {
  const startTime = performance.now();
  const rawBatch = generateBigDataBatch(count);
  
  let duplicatesCount = 0;
  let spamCount = 0;

  // Process in non-blocking micro-chunks of 50 to keep UI 60 FPS
  const chunkSize = 50;
  for (let i = 0; i < rawBatch.length; i += chunkSize) {
    const chunk = rawBatch.slice(i, i + chunkSize);
    
    for (let j = 0; j < chunk.length; j++) {
      const ev = chunk[j];
      if (ev.verificationStatus === 'duplicate') duplicatesCount++;
      if (ev.verificationStatus === 'flagged') spamCount++;
      
      // Index into spatial grid
      globalSpatialGrid.insert(ev);
    }

    if (onProgress) {
      onProgress(Math.min(i + chunkSize, rawBatch.length), rawBatch.length);
    }

    // Yield control to UI event loop
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  const durationMs = performance.now() - startTime;
  const eventsPerSec = Math.round((count / (durationMs / 1000)));

  return {
    totalProcessed: count,
    duplicatesMerged: duplicatesCount,
    spamIntercepted: spamCount,
    durationMs: Math.round(durationMs),
    eventsPerSec
  };
}
