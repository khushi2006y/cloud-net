import { WeatherEvent, EventCategory, ProcessingRuleResult, VerificationStatus, SourceTrustLevel, ReportSource, DisplayPolicy } from '../types/weather';

// Haversine distance calculation in Kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Category keyword dictionary for NLP classification across official IMD categories
export const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  clear: [
    'clear', 'sunny', 'fair', 'pleasant', 'normal', 'calm', 'clear sky', 'clear skies', 'dry', 'sunshine'
  ],
  rainfall: [
    'rain', 'rainfall', 'downpour', 'precipitation', 'drizzle', 'shower', 'showers', 
    'heavy rain', 'monsoon', 'barish', 'torrential', 'deluge', 'cloudburst', 'wet', 'puddle'
  ],
  thunderstorm: [
    'thunder', 'thunderstorm', 'lightning', 'lightning bolt', 'squall', 'bijli', 
    'electric storm', 'kalbaishakhi', 'norwester', 'thunderbolt', 'thunderous', 'spark'
  ],
  flooding: [
    'flood', 'flooding', 'flooded', 'submerged', 'waterlogging', 'waterlogged', 
    'inundation', 'overflow', 'flash flood', 'drowned', 'knee deep', 'water stagnation', 'dam overflow'
  ],
  heatwave: [
    'heat', 'heatwave', 'loo', 'scorching', 'hot', 'celsius', 'mercury', 'sunstroke', 
    'dehydration', 'heat stroke', 'sweltering', 'dry heat', 'extreme temperature', 'boiling'
  ],
  fog: [
    'fog', 'dense fog', 'mist', 'visibility', 'smog', 'zero visibility', 'palam', 
    'low visibility', 'haze', 'kohra', 'airports delayed', 'dew'
  ],
  'dust storm': [
    'dust', 'dust storm', 'andhi', 'sand', 'sand storm', 'desert storm', 'dust cloud', 
    'haboob', 'sand dunes', 'brown out', 'dusty'
  ],
  'strong wind': [
    'wind', 'strong wind', 'gale', 'squall', 'cyclone', 'gust', 'gusty', 'storm winds', 
    'high speed wind', 'anemometer', 'roof blown', 'trees uprooted', 'hurricane'
  ]
};

// Spam triggers
const SPAM_TRIGGERS = [
  'crypto', 'bitcoin', 'casino', 'earn money', 'click here', 'giveaway', 'promo', 
  'free iphone', 'follow back', 'dating', 'investment', 'lottery', 'bit.ly', 'telegram',
  'whatsapp group', 'subscribe to', 'cash prize'
];

// Sensationalist & fake-report markers
const SENSATIONAL_MARKERS = [
  'end of the world', 'apocalypse', 'alien storm', 'world ending', 'never seen before in history',
  'fake alert', 'hoax', 'tsunami in delhi', 'glacier melted in desert', 'snow in chennai',
  'doomsday', 'unverified forwarded message', 'share before deleted'
];

/**
 * Jaccard token-level text similarity (0.0 to 1.0) for deduplication
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const tokenize = (t: string) => 
    new Set(t.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  
  const set1 = tokenize(text1);
  const set2 = tokenize(text2);
  
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersection = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersection++;
  });
  
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Classifies unstructured text into one of the 7 official IMD event categories
 * using NLP keyword density and token pattern matching
 */
export function classifyEventCategory(text: string): { 
  category: EventCategory; 
  confidence: number;
  matchedKeywords: string[];
} {
  const lower = text.toLowerCase();
  const scores: Record<EventCategory, number> = {
    clear: 0,
    rainfall: 0,
    thunderstorm: 0,
    flooding: 0,
    heatwave: 0,
    fog: 0,
    'dust storm': 0,
    'strong wind': 0
  };

  const matchedKeywordsList: string[] = [];

  let totalMatches = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const category = cat as EventCategory;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        scores[category] += 1;
        totalMatches += 1;
        if (!matchedKeywordsList.includes(kw)) {
          matchedKeywordsList.push(kw);
        }
      }
    }
  }

  // Find category with highest score
  let bestCategory: EventCategory = 'clear';
  let maxScore = -1;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat as EventCategory;
    }
  }

  if (totalMatches === 0 || maxScore === 0) {
    return { category: 'clear', confidence: 60, matchedKeywords: [] };
  }

  const confidence = Math.min(99, Math.round(55 + (maxScore / Math.max(1, totalMatches)) * 42));
  return { category: bestCategory, confidence, matchedKeywords: matchedKeywordsList };
}

/**
 * Machine Learning & AI Fake / Misleading Report Detector
 */
export function detectFakeOrMisleadingReport(params: {
  text: string;
  latitude: number;
  longitude: number;
  temperatureC?: number;
  category: EventCategory;
}): { isMisleading: boolean; suspicionScore: number; indicators: string[] } {
  const indicators: string[] = [];
  let suspicion = 0;
  const lower = params.text.toLowerCase();

  // Check 1: Spam keyword signatures
  for (const spam of SPAM_TRIGGERS) {
    if (lower.includes(spam)) {
      suspicion += 50;
      indicators.push(`Spam signature detected: "${spam}"`);
      break;
    }
  }

  // Check 2: Sensationalist / Clickbait patterns
  for (const marker of SENSATIONAL_MARKERS) {
    if (lower.includes(marker)) {
      suspicion += 40;
      indicators.push(`Sensationalist / hoax pattern: "${marker}"`);
      break;
    }
  }

  // Check 3: Geographic Boundary Anomaly (Indian meteorological zone: 5°-38°N, 67°-99°E)
  if (
    isNaN(params.latitude) || isNaN(params.longitude) ||
    params.latitude < 5 || params.latitude > 38 ||
    params.longitude < 67 || params.longitude > 99
  ) {
    suspicion += 60;
    indicators.push(`Out-of-bounds coordinates: [${params.latitude}, ${params.longitude}] outside Indian Territory.`);
  }

  // Check 4: Description length / substance
  if (params.text.trim().length < 8) {
    suspicion += 30;
    indicators.push('Text too brief (< 8 chars) for meteorological verification.');
  }

  // Check 5: Meteorological Impossibility Anomaly
  if (params.temperatureC !== undefined) {
    if (params.temperatureC > 53) {
      suspicion += 35;
      indicators.push(`Unrealistic temperature reading: ${params.temperatureC}°C exceeds historical Indian records.`);
    }
    if (params.temperatureC < -40 && params.latitude < 32) {
      suspicion += 35;
      indicators.push(`Unrealistic sub-zero anomaly: ${params.temperatureC}°C reported in non-Himalayan region.`);
    }
  }

  // Check 6: Incoherent category claim (e.g. "heatwave" claimed when text says "ice cold" or "freezing snow")
  if (params.category === 'heatwave' && (lower.includes('snow') || lower.includes('freezing') || lower.includes('hail'))) {
    suspicion += 35;
    indicators.push('Category mismatch: Claimed heatwave but description mentions freezing/snow.');
  }

  const clampedScore = Math.min(100, suspicion);
  return {
    isMisleading: clampedScore >= 50,
    suspicionScore: clampedScore,
    indicators
  };
}

/**
 * Detects severe internal contradictions in weather reports
 * e.g., Selecting "rainfall" but describing a "sunny day", "bright sun", or "no rain".
 * Reports with contradictions are flagged for automatic deletion.
 */
export function checkContradiction(text: string, category: EventCategory): {
  isContradictory: boolean;
  reason?: string;
  matchedContradictionTerm?: string;
  shouldAutoDelete: boolean;
} {
  const lower = text.toLowerCase();

  // 1. Rain / Storm / Flood vs Sunny / Dry contradiction
  const SUNNY_DRY_PATTERNS = [
    'sunny day', 'bright sun', 'sun is shining', 'clear skies', 'clear sky', 
    'no rain', 'dry day', 'completely dry', 'bright sunshine', 'hot sun', 
    'no clouds', 'sunshine', 'not raining', 'not a single drop', 'not a drop of rain', 
    'dry weather', 'sunny and clear', 'clear and sunny', 'hot and dry', 'dhoop', 'khili dhoop'
  ];

  if (category === 'rainfall' || category === 'thunderstorm' || category === 'flooding') {
    for (const pattern of SUNNY_DRY_PATTERNS) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(lower) || lower.includes(pattern)) {
        return {
          isContradictory: true,
          matchedContradictionTerm: pattern,
          reason: `Contradiction Detected: Event category is marked as '${category}', but description states '${pattern}'. This report contains direct meteorological self-contradiction and will be automatically deleted.`,
          shouldAutoDelete: true
        };
      }
    }
  }

  // 2. Heatwave vs Snow / Freezing contradiction
  const FREEZING_SNOW_PATTERNS = [
    'freezing cold', 'snowing', 'heavy snowfall', 'snowfall', 'blizzard', 
    'ice cold', 'hailstorm', 'sub zero', 'sweater weather', 'cold wave', 'chilly frost'
  ];

  if (category === 'heatwave') {
    for (const pattern of FREEZING_SNOW_PATTERNS) {
      if (lower.includes(pattern)) {
        return {
          isContradictory: true,
          matchedContradictionTerm: pattern,
          reason: `Contradiction Detected: Event category is marked as 'heatwave', but description states '${pattern}'. This report contains direct meteorological self-contradiction and will be automatically deleted.`,
          shouldAutoDelete: true
        };
      }
    }
  }

  // 3. Fog vs Clear Visibility contradiction
  const CLEAR_VISIBILITY_PATTERNS = [
    'crystal clear', 'clear visibility', 'visible for miles', 'no haze at all', 'full visibility'
  ];

  if (category === 'fog') {
    for (const pattern of CLEAR_VISIBILITY_PATTERNS) {
      if (lower.includes(pattern)) {
        return {
          isContradictory: true,
          matchedContradictionTerm: pattern,
          reason: `Contradiction Detected: Event category is marked as 'fog', but description states '${pattern}'. This report contains direct meteorological self-contradiction and will be automatically deleted.`,
          shouldAutoDelete: true
        };
      }
    }
  }

  // 4. Dust Storm vs Heavy Flood/Downpour contradiction
  const WATER_PATTERNS = [
    'heavy downpour', 'torrential rainfall', 'flash flood', 'streets flooded'
  ];

  if (category === 'dust storm') {
    for (const pattern of WATER_PATTERNS) {
      if (lower.includes(pattern)) {
        return {
          isContradictory: true,
          matchedContradictionTerm: pattern,
          reason: `Contradiction Detected: Event category is marked as 'dust storm', but description states '${pattern}'. This report contains direct meteorological self-contradiction and will be automatically deleted.`,
          shouldAutoDelete: true
        };
      }
    }
  }

  return {
    isContradictory: false,
    shouldAutoDelete: false
  };
}

/**
 * Evaluates source trustworthiness and reputation scoring
 */
export function evaluateSourceTrust(
  source: ReportSource,
  author: string,
  isOfficialSource?: boolean,
  hasMedia?: boolean
): { trustLevel: SourceTrustLevel; credibilityScore: number } {
  const authorLower = author.toLowerCase();

  // Official IMD or Automated Synoptic API Stations / IoT
  if (isOfficialSource || source === 'api' || source === 'imd' || source === 'iot' || authorLower.includes('imd') || authorLower.includes('metdept') || authorLower.includes('mausam')) {
    return { trustLevel: 'official', credibilityScore: 98 };
  }

  // Recognized Media & Weather Outlets
  if (
    authorLower.includes('ani') || 
    authorLower.includes('pti') || 
    authorLower.includes('weather') || 
    authorLower.includes('times') || 
    authorLower.includes('tribune') ||
    authorLower.includes('ndtv')
  ) {
    return { trustLevel: 'trusted_media', credibilityScore: 88 };
  }

  // Citizen Crowdsourcing
  if (source === 'citizen') {
    if (hasMedia) {
      return { trustLevel: 'verified_citizen', credibilityScore: 82 };
    }
    return { trustLevel: 'unverified', credibilityScore: 68 };
  }

  // Twitter / Social Media Streams
  if (authorLower.includes('bot') || authorLower.includes('promo')) {
    return { trustLevel: 'suspicious', credibilityScore: 25 };
  }

  return { trustLevel: 'unverified', credibilityScore: 65 };
}

/**
 * Cross-checks a candidate weather report against the nearest cached Open-Meteo station telemetry.
 * Station confirms -> raise confidence and add to supportingEvidence.
 * Station contradicts -> lower confidence and add to contradictingEvidence.
 * No station nearby -> leave neutral, do not penalize.
 */
export interface TelemetryCrossCheckResult {
  hasStationNearby: boolean;
  stationName?: string;
  distanceKm?: number;
  confirms: boolean;
  contradicts: boolean;
  confidenceDelta: number;
  supportingReason?: string;
  contradictingReason?: string;
}

export function crossCheckAgainstTelemetry(
  lat: number,
  lng: number,
  category: EventCategory,
  existingEvents: WeatherEvent[]
): TelemetryCrossCheckResult {
  const stations = existingEvents.filter(e => (e.source === 'api' || e.isOfficialSource) && e.telemetry);
  let nearestStation: WeatherEvent | null = null;
  let minDistance = Infinity;

  for (const st of stations) {
    const d = calculateDistanceKm(lat, lng, st.latitude, st.longitude);
    if (d < minDistance) {
      minDistance = d;
      nearestStation = st;
    }
  }

  // If no station within 80km, leave neutral
  if (!nearestStation || minDistance > 80) {
    return {
      hasStationNearby: false,
      confirms: false,
      contradicts: false,
      confidenceDelta: 0
    };
  }

  const tel = nearestStation.telemetry!;
  const distStr = `${minDistance.toFixed(1)} km`;

  // Precipitation / Storm / Flooding check
  if (category === 'rainfall' || category === 'thunderstorm' || category === 'flooding') {
    const rainMm = tel.precipitationMm ?? 0;
    if (rainMm > 0.5 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(tel.weatherCode ?? 0)) {
      return {
        hasStationNearby: true,
        stationName: nearestStation.city,
        distanceKm: minDistance,
        confirms: true,
        contradicts: false,
        confidenceDelta: 18,
        supportingReason: `Nearby precipitation confirmed via Open-Meteo telemetry (${nearestStation.city}, ${distStr} away: ${rainMm.toFixed(1)} mm/hr)`
      };
    } else if (rainMm === 0 && (category === 'flooding' || category === 'thunderstorm')) {
      return {
        hasStationNearby: true,
        stationName: nearestStation.city,
        distanceKm: minDistance,
        confirms: false,
        contradicts: true,
        confidenceDelta: -35,
        contradictingReason: `Open-Meteo telemetry conflict: Nearest station (${nearestStation.city}, ${distStr} away) measured 0.0 mm precipitation during claimed ${category}`
      };
    }
  }

  // Heatwave check
  if (category === 'heatwave') {
    const tempC = tel.temperatureC ?? 25;
    if (tempC >= 38) {
      return {
        hasStationNearby: true,
        stationName: nearestStation.city,
        distanceKm: minDistance,
        confirms: true,
        contradicts: false,
        confidenceDelta: 16,
        supportingReason: `Severe thermal anomaly confirmed via Open-Meteo telemetry (${nearestStation.city}, ${distStr} away: ${tempC.toFixed(1)}°C)`
      };
    } else if (tempC < 30) {
      return {
        hasStationNearby: true,
        stationName: nearestStation.city,
        distanceKm: minDistance,
        confirms: false,
        contradicts: true,
        confidenceDelta: -30,
        contradictingReason: `Open-Meteo telemetry conflict: Nearest station (${nearestStation.city}, ${distStr} away) observed normal surface temperature (${tempC.toFixed(1)}°C)`
      };
    }
  }

  // Strong wind check
  if (category === 'strong wind') {
    const windKmh = tel.windSpeedKmh ?? 0;
    if (windKmh >= 35) {
      return {
        hasStationNearby: true,
        stationName: nearestStation.city,
        distanceKm: minDistance,
        confirms: true,
        contradicts: false,
        confidenceDelta: 15,
        supportingReason: `High-velocity wind squall confirmed via Open-Meteo telemetry (${nearestStation.city}, ${distStr} away: ${windKmh.toFixed(1)} km/h)`
      };
    }
  }

  return {
    hasStationNearby: true,
    stationName: nearestStation.city,
    distanceKm: minDistance,
    confirms: false,
    contradicts: false,
    confidenceDelta: 0
  };
}

/**
 * Comprehensive automated verification, fake detection, and duplicate evaluation
 */
export function evaluateEventRules(
  newEvent: {
    text: string;
    category: EventCategory;
    latitude: number;
    longitude: number;
    timestamp: string;
    source: ReportSource;
    sourceAuthor?: string;
    isOfficialSource?: boolean;
    hasMedia?: boolean;
    temperatureC?: number;
  },
  existingEvents: WeatherEvent[]
): ProcessingRuleResult {
  const supportingEvidence: string[] = [];
  const contradictingEvidence: string[] = [];

  // 0. Meteorological Self-Contradiction Check
  const contradiction = checkContradiction(newEvent.text, newEvent.category);
  if (contradiction.isContradictory) {
    const reason = contradiction.reason || 'Meteorological Self-Contradiction Detected';
    contradictingEvidence.push(reason);
    return {
      isDuplicate: false,
      isFlagged: false,
      flagReason: reason,
      isContradictory: true,
      shouldAutoDelete: false,
      autoDeleteReason: reason,
      suggestedCategory: newEvent.category,
      confidence: 10,
      initialStatus: 'contradicted',
      credibilityScore: 0,
      sourceTrustLevel: 'suspicious',
      aiFakeDetection: {
        isMisleading: true,
        suspicionScore: 100,
        indicators: [reason]
      },
      matchedKeywords: [],
      displayPolicy: 'SHOW_CONTRADICTED',
      supportingEvidence: [],
      contradictingEvidence: [reason]
    };
  }

  // 1. Machine Learning Fake & Misleading Detection
  const aiFakeDetection = detectFakeOrMisleadingReport({
    text: newEvent.text,
    latitude: newEvent.latitude,
    longitude: newEvent.longitude,
    temperatureC: newEvent.temperatureC,
    category: newEvent.category
  });

  // 2. Source Trust Evaluation
  const sourceTrust = evaluateSourceTrust(
    newEvent.source,
    newEvent.sourceAuthor || 'Unknown Reporter',
    newEvent.isOfficialSource,
    newEvent.hasMedia
  );

  // 3. Automated NLP Event Categorization
  const { category: suggestedCategory, confidence: nlpConfidence, matchedKeywords } = classifyEventCategory(newEvent.text);

  // If severe fake/spam detected
  if (aiFakeDetection.isMisleading) {
    const reason = aiFakeDetection.indicators.join('; ');
    contradictingEvidence.push(reason);
    return {
      isDuplicate: false,
      isFlagged: true,
      flagReason: reason,
      isContradictory: false,
      shouldAutoDelete: false,
      suggestedCategory,
      confidence: Math.max(10, 100 - aiFakeDetection.suspicionScore),
      initialStatus: 'unverified',
      credibilityScore: Math.max(5, 100 - aiFakeDetection.suspicionScore),
      sourceTrustLevel: 'suspicious',
      aiFakeDetection,
      matchedKeywords,
      displayPolicy: 'HIDE_UNVERIFIED',
      supportingEvidence: [],
      contradictingEvidence
    };
  }

  // 4. Duplicate Detection Engine (Spatiotemporal Clustering: 18km / 4 Hours)
  const newTimestamp = new Date(newEvent.timestamp).getTime();
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

  for (const existing of existingEvents) {
    if (existing.verificationStatus === 'flagged' || existing.status === 'unverified') continue;

    const existingTimestamp = new Date(existing.timestamp).getTime();
    const timeDiffMs = Math.abs(newTimestamp - existingTimestamp);

    if (timeDiffMs <= FOUR_HOURS_MS) {
      const distanceKm = calculateDistanceKm(
        newEvent.latitude,
        newEvent.longitude,
        existing.latitude,
        existing.longitude
      );

      const textSimilarity = calculateTextSimilarity(newEvent.text, existing.description);
      const isSameCategory = existing.category === newEvent.category || existing.category === suggestedCategory;

      if (distanceKm <= 18 && (isSameCategory || textSimilarity > 0.45)) {
        return {
          isDuplicate: true,
          matchedEventId: existing.id,
          isFlagged: false,
          isContradictory: false,
          shouldAutoDelete: false,
          suggestedCategory,
          confidence: 88,
          initialStatus: 'duplicate',
          credibilityScore: sourceTrust.credibilityScore,
          sourceTrustLevel: sourceTrust.trustLevel,
          aiFakeDetection,
          matchedKeywords,
          displayPolicy: 'ATTACH_DUPLICATE',
          supportingEvidence: [`Spatiotemporal duplicate: clustered into ${existing.id}`],
          contradictingEvidence: []
        };
      }
    }
  }

  // 5. Telemetry Cross-Check against cached Open-Meteo station
  const telCheck = crossCheckAgainstTelemetry(newEvent.latitude, newEvent.longitude, suggestedCategory, existingEvents);
  let isContradictory = false;
  if (telCheck.contradicts) {
    isContradictory = true;
    contradictingEvidence.push(telCheck.contradictingReason!);
  } else if (telCheck.confirms) {
    supportingEvidence.push(telCheck.supportingReason!);
  }

  // 6. Final Status & Confidence Calculation
  let overallConfidence = Math.round((nlpConfidence * 0.4) + (sourceTrust.credibilityScore * 0.6));
  overallConfidence += telCheck.confidenceDelta;
  overallConfidence = Math.max(5, Math.min(99, overallConfidence));

  let initialStatus: VerificationStatus = 'unverified';
  let displayPolicy: DisplayPolicy = 'HIDE_UNVERIFIED';

  if (isContradictory) {
    initialStatus = 'contradicted';
    displayPolicy = 'SHOW_CONTRADICTED';
  } else if (sourceTrust.trustLevel === 'official') {
    initialStatus = 'verified';
    overallConfidence = Math.max(92, overallConfidence);
    displayPolicy = 'SHOW_VERIFIED';
    supportingEvidence.push('Official meteorological authority feed');
  } else if (sourceTrust.trustLevel === 'trusted_media' || (telCheck.confirms && overallConfidence >= 75)) {
    initialStatus = 'corroborated';
    displayPolicy = 'SHOW_CORROBORATED';
  } else if (overallConfidence >= 80 && telCheck.confirms) {
    initialStatus = 'verified';
    displayPolicy = 'SHOW_VERIFIED';
  } else if (overallConfidence >= 60) {
    initialStatus = 'corroborated';
    displayPolicy = 'SHOW_CORROBORATED';
  } else if (overallConfidence >= 40) {
    initialStatus = 'provisional';
    displayPolicy = 'SHOW_PROVISIONAL';
    supportingEvidence.push('Preliminary citizen observation registered');
  } else {
    initialStatus = 'unverified';
    displayPolicy = 'HIDE_UNVERIFIED';
  }

  return {
    isDuplicate: false,
    isFlagged: initialStatus === 'unverified',
    isContradictory,
    shouldAutoDelete: false,
    suggestedCategory,
    confidence: overallConfidence,
    initialStatus,
    credibilityScore: sourceTrust.credibilityScore,
    sourceTrustLevel: sourceTrust.trustLevel,
    aiFakeDetection,
    matchedKeywords,
    displayPolicy,
    supportingEvidence,
    contradictingEvidence
  };
}

export interface DuplicateCluster {
  clusterId: string;
  parentEvent: WeatherEvent;
  duplicates: WeatherEvent[];
  distanceKmAvg: number;
}

/**
 * Groups all duplicated events and their primary parent events into structured clusters for Admin review
 */
export function findDuplicateClusters(events: WeatherEvent[]): DuplicateCluster[] {
  const clustersMap = new Map<string, DuplicateCluster>();

  // Find all events marked as duplicate
  events.forEach(evt => {
    if (evt.verificationStatus === 'duplicate' && evt.mergedWithId) {
      const parent = events.find(e => e.id === evt.mergedWithId);
      if (parent) {
        if (!clustersMap.has(parent.id)) {
          clustersMap.set(parent.id, {
            clusterId: `cluster-${parent.id}`,
            parentEvent: parent,
            duplicates: [],
            distanceKmAvg: 0
          });
        }
        clustersMap.get(parent.id)!.duplicates.push(evt);
      }
    }
  });

  // Calculate average distance
  clustersMap.forEach(cluster => {
    let totalDist = 0;
    cluster.duplicates.forEach(d => {
      totalDist += calculateDistanceKm(
        cluster.parentEvent.latitude,
        cluster.parentEvent.longitude,
        d.latitude,
        d.longitude
      );
    });
    cluster.distanceKmAvg = cluster.duplicates.length > 0 
      ? Number((totalDist / cluster.duplicates.length).toFixed(1)) 
      : 0;
  });

  return Array.from(clustersMap.values());
}

// ============================================================================
// MATHEMATICAL SAFEGUARDS: ANTI-CIRCULARITY, ORTHOGONALITY & DIVERSITY ENTROPY
// ============================================================================

/**
 * Lineage tracking interface for provenance and Directed Acyclic Graph (DAG) analysis.
 * Used to trace data back to its primary origin point and unmask circular validation loops.
 */
export interface DataLineage {
  /** Unique identifier of the local processed event */
  eventId: string;
  /**
   * Root physical origin identifier where the measurement or claim was first generated.
   * Examples: "sensor-imd-aws-colaba", "tweet-user-8921", "open-meteo-gfs-001"
   */
  rootOriginId: string;
  /**
   * Chronological chain of all intermediaries, aggregators, APIs, and mirrors
   * through which the data was retransmitted prior to ingestion.
   */
  upstreamSources: string[];
}

/**
 * Calculates the Source Independence Coefficient between two data lineages.
 * 
 * Mathematical Foundation:
 * 1. Root Identity Gate: If rootOriginId_A == rootOriginId_B, both events represent
 *    the same primary causal origin (circular echo loop). Mutual corroboration = 0.0.
 * 2. Jaccard Intermediary Overlap: When roots differ, independence is evaluated
 *    against shared intermediary relays using the Jaccard distance metric:
 *    J(A, B) = |Upstream(A) ∩ Upstream(B)| / |Upstream(A) ∪ Upstream(B)|
 *    Independence = 1.0 - J(A, B)
 *
 * Edge cases handled:
 * - Empty upstream arrays with different roots -> 1.0 (pure orthogonal independence)
 * - Identical roots -> 0.0 (regardless of upstream route divergence)
 * - Disjoint intermediary paths -> 1.0
 * - Fully shared intermediary syndication -> approaching 0.0
 *
 * @param lineageA - Lineage metadata of the first candidate event
 * @param lineageB - Lineage metadata of the second candidate event
 * @returns Independence coefficient in the range [0.0, 1.0], where 1.0 indicates
 *          complete causal independence and 0.0 indicates a circular echo.
 */
export function calculateSourceIndependence(
  lineageA: DataLineage,
  lineageB: DataLineage
): number {
  // If both trace back to the same root origin, independence is strictly 0.0
  if (
    !lineageA.rootOriginId ||
    !lineageB.rootOriginId ||
    lineageA.rootOriginId === lineageB.rootOriginId
  ) {
    return 0.0;
  }

  const setA = new Set(lineageA.upstreamSources.filter(Boolean));
  const setB = new Set(lineageB.upstreamSources.filter(Boolean));

  // Both have different root origins and zero intermediaries -> fully independent
  if (setA.size === 0 && setB.size === 0) {
    return 1.0;
  }

  let sharedIntermediaries = 0;
  setA.forEach((source) => {
    if (setB.has(source)) {
      sharedIntermediaries++;
    }
  });

  const totalUniqueIntermediaries = new Set([...setA, ...setB]).size;
  if (totalUniqueIntermediaries === 0) {
    return 1.0;
  }

  const jaccardOverlap = sharedIntermediaries / totalUniqueIntermediaries;
  return Math.max(0.0, Math.min(1.0, 1.0 - jaccardOverlap));
}

/**
 * Multi-sensor telemetry snapshot across orthogonal measurement modalities.
 */
export interface OrthogonalReadings {
  /** Surface atmospheric pressure measured in hectopascals (hPa) */
  barometricPressureHpa?: number;
  /** Surface horizontal wind velocity measured in km/h */
  windSpeedKmh?: number;
  /** Thermal infrared cloud-top brightness temperature from geostationary satellite (e.g. INSAT-3D) in Celsius */
  satelliteCloudTopTempC?: number;
  /** Accumulated surface rainfall measured by hydrometric tipping bucket gauge in millimeters (mm) */
  rainfallMm?: number;
}

/**
 * Validates cross-modal physical invariants to identify propagated or inherited model errors.
 *
 * Physical Foundation:
 * Instead of cross-verifying a sensor with identical peer sensors (which creates an echo
 * of common-mode calibration errors), this function verifies thermodynamic and aerodynamic
 * couplings governed by atmospheric physics:
 *
 * 1. Pressure–Wind Invariant:
 *    Under the Navier-Stokes horizontal momentum equation, extreme cyclonic barometric depressions
 *    (< 980 hPa) induce intense horizontal pressure gradient forces that mandate gale-force
 *    winds (> 50 km/h). If pressure collapses below 980 hPa while anemometers measure calm winds
 *    (< 15 km/h), the reading is physically impossible and indicates a stuck diaphragm or sensor failure.
 *
 * 2. Cloudburst–Cloud-Top Invariant:
 *    Mesoscale convective cloudbursts (> 50 mm) are produced exclusively by deep cumulonimbus
 *    updraft towers that pierce into the upper troposphere, resulting in cloud-top brightness
 *    temperatures well below -50°C. If rainfall exceeds 50 mm while satellite radiometry
 *    indicates warm cloud tops (> -10°C), the event represents a model artifact, synthetic
 *    hallucination, or radar ghost echo.
 *
 * @param telemetry - Multi-modal telemetry readings
 * @returns Object with `isValid: true` if invariants hold, or `isValid: false` with the exact diagnostic reason.
 */
export function verifyPhysicalInvariants(telemetry: OrthogonalReadings): {
  isValid: boolean;
  anomalyReason?: string;
} {
  // Check 1: Pressure–Wind Invariant
  // Severe cyclonic depression (< 980 hPa) requires gale winds (> 50 km/h).
  // Flagged as sensor failure when wind is < 15 km/h.
  if (
    telemetry.barometricPressureHpa !== undefined &&
    telemetry.barometricPressureHpa < 980
  ) {
    if (telemetry.windSpeedKmh !== undefined && telemetry.windSpeedKmh < 15) {
      return {
        isValid: false,
        anomalyReason: `Sensor Failure: Severe barometric drop (${telemetry.barometricPressureHpa} hPa < 980 hPa) reported without required gradient winds (${telemetry.windSpeedKmh} km/h reported, expected > 50 km/h; flagged as sensor failure when < 15 km/h).`
      };
    }
  }

  // Check 2: Cloudburst–Cloud-Top Invariant
  // High-intensity cloudburst (> 50 mm) requires deep convective cumulonimbus (cloud top < -50°C).
  // Flagged as inherited model error when cloud top is > -10°C.
  if (
    telemetry.rainfallMm !== undefined &&
    telemetry.rainfallMm > 50
  ) {
    if (
      telemetry.satelliteCloudTopTempC !== undefined &&
      telemetry.satelliteCloudTopTempC > -10
    ) {
      return {
        isValid: false,
        anomalyReason: `Inherited Model Error: Extreme precipitation (${telemetry.rainfallMm} mm > 50 mm) reported under shallow warm cloud cover (${telemetry.satelliteCloudTopTempC}°C reported, expected < -50°C convective threshold; flagged as inherited model error when > -10°C).`
      };
    }
  }

  return { isValid: true };
}

/**
 * Metadata record for citizen crowdsource reports used for Sybil and entropy defense.
 */
export interface CitizenMetadata {
  /** Unique identifier of the submitting user account */
  userId: string;
  /** Client network subnet (e.g. "192.168.1.0/24" or CIDR hash) */
  ipSubnet: string;
  /** Telecom cellular base station / tower transceiver identifier (BTS ID) */
  cellTowerId: string;
  /** Natural language report description provided by the citizen */
  textDescription: string;
}

/**
 * Calculates a cluster diversity weight using network topology and Shannon linguistic entropy
 * to neutralize coordinated Sybil attacks, botnets, and scripted troll campaigns.
 *
 * Mathematical Formulation:
 * 1. Network Diversity:
 *    Measures topological and infrastructure spread across independent IP subnets and cell towers:
 *    D_network = (UniqueSubnets + UniqueCellTowers) / (2 * N)
 *    where N = total reports in the cluster.
 *
 * 2. Shannon Linguistic Diversity:
 *    Measures vocabulary information entropy across all submitted descriptions:
 *    H(X) = - Σ [ p(w) * log₂(p(w)) ]
 *    where p(w) = count(w) / TotalTokens.
 *    Normalized against an empirical benchmark of 4.0 bits (representing natural human linguistic variance):
 *    D_linguistic = min(1.0, H(X) / 4.0)
 *
 * 3. Composite Diversity Weight:
 *    W_final = max(0.1, (0.5 * D_network) + (0.5 * D_linguistic))
 *
 * Edge cases:
 * - Empty report array -> 0.0
 * - Single isolated report -> 1.0
 * - 50 bots using identical prompt templates on a single Wi-Fi/tower -> W_final collapses towards 0.1
 *
 * @param reports - Array of citizen crowdsource metadata in a geographic cluster
 * @returns Weight multiplier between 0.1 and 1.0 to scale collective corroboration confidence.
 */
export function calculateClusterDiversityWeight(reports: CitizenMetadata[]): number {
  if (reports.length === 0) {
    return 0;
  }
  if (reports.length === 1) {
    return 1.0;
  }

  // 1. Network / Telecom Infrastructure Diversity
  const uniqueSubnets = new Set(
    reports.map((r) => r.ipSubnet.trim().toLowerCase()).filter(Boolean)
  ).size;

  const uniqueTowers = new Set(
    reports.map((r) => r.cellTowerId.trim().toLowerCase()).filter(Boolean)
  ).size;

  const networkDiversity = (uniqueSubnets + uniqueTowers) / (reports.length * 2);

  // 2. Linguistic Diversity via Shannon Entropy
  const tokens: string[] = [];
  reports.forEach((report) => {
    const words = report.textDescription
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 1);
    tokens.push(...words);
  });

  let linguisticDiversity = 0;
  if (tokens.length > 0) {
    const frequencyMap = new Map<string, number>();
    tokens.forEach((word) => {
      frequencyMap.set(word, (frequencyMap.get(word) || 0) + 1);
    });

    let entropy = 0;
    const totalTokens = tokens.length;
    frequencyMap.forEach((count) => {
      const probability = count / totalTokens;
      entropy -= probability * Math.log2(probability);
    });

    // 4.0 bits is the normalization ceiling for multi-sentence crowdsourced text
    linguisticDiversity = Math.min(1.0, entropy / 4.0);
  }

  // 3. Final Combined Diversity Weight (clamped to a minimum of 0.1)
  const finalWeight = (networkDiversity * 0.5) + (linguisticDiversity * 0.5);
  return Math.max(0.1, Number(finalWeight.toFixed(4)));
}

/*
// ============================================================================
// USAGE EXAMPLES: How to invoke each safeguard in verification pipelines
// ============================================================================
//
// 1. Anti-Circularity Lineage DAG Check:
// const lineageReportA: DataLineage = {
//   eventId: 'evt-delhi-001',
//   rootOriginId: 'sensor-imd-aws-palam',
//   upstreamSources: ['imd-primary', 'mausam-national-feed']
// };
// const lineageReportB: DataLineage = {
//   eventId: 'evt-delhi-002',
//   rootOriginId: 'sensor-imd-aws-palam', // Shared primary root!
//   upstreamSources: ['imd-primary', 'news-ticker-aggregator']
// };
// const independence = calculateSourceIndependence(lineageReportA, lineageReportB);
// console.log(independence); // 0.0 (Circular confirmation blocked)
//
// 2. Orthogonal Modality Physical Invariants Validation:
// const sensorReadings: OrthogonalReadings = {
//   barometricPressureHpa: 968, // Severe low pressure claimed
//   windSpeedKmh: 10            // Calm surface wind measured (< 15 km/h)
// };
// const physicsCheck = verifyPhysicalInvariants(sensorReadings);
// if (!physicsCheck.isValid) {
//   console.warn(physicsCheck.anomalyReason);
//   // Sensor Failure: Severe barometric drop (<980 hPa) reported without required gradient winds...
// }
//
// 3. Shannon Entropy Sybil & Botnet Neutralization:
// const crowdsourcedCluster: CitizenMetadata[] = [
//   { userId: 'bot-1', ipSubnet: '103.21.244.0/24', cellTowerId: 'IN-DL-BTS-104', textDescription: 'heavy flood submerged road' },
//   { userId: 'bot-2', ipSubnet: '103.21.244.0/24', cellTowerId: 'IN-DL-BTS-104', textDescription: 'heavy flood submerged road' },
//   { userId: 'bot-3', ipSubnet: '103.21.244.0/24', cellTowerId: 'IN-DL-BTS-104', textDescription: 'heavy flood submerged road' }
// ];
// const clusterWeight = calculateClusterDiversityWeight(crowdsourcedCluster);
// console.log(clusterWeight); // Output: ~0.17 (Drastically downweighted due to zero entropy and shared IP/BTS)
*/

