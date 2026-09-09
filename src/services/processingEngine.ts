import { WeatherEvent, EventCategory, ProcessingRuleResult, VerificationStatus, SourceTrustLevel } from '../types/weather';

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

// Category keyword dictionary for NLP classification across 7 IMD categories
export const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
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
  let bestCategory: EventCategory = 'rainfall';
  let maxScore = -1;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat as EventCategory;
    }
  }

  if (totalMatches === 0 || maxScore === 0) {
    return { category: 'rainfall', confidence: 45, matchedKeywords: [] };
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
 * Evaluates source trustworthiness and reputation scoring
 */
export function evaluateSourceTrust(
  source: 'twitter' | 'api' | 'citizen',
  author: string,
  isOfficialSource?: boolean,
  hasMedia?: boolean
): { trustLevel: SourceTrustLevel; credibilityScore: number } {
  const authorLower = author.toLowerCase();

  // Official IMD or Automated Synoptic API Stations
  if (isOfficialSource || source === 'api' || authorLower.includes('imd') || authorLower.includes('metdept') || authorLower.includes('mausam')) {
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
 * Comprehensive automated verification, fake detection, and duplicate evaluation
 */
export function evaluateEventRules(
  newEvent: {
    text: string;
    category: EventCategory;
    latitude: number;
    longitude: number;
    timestamp: string;
    source: 'twitter' | 'api' | 'citizen';
    sourceAuthor?: string;
    isOfficialSource?: boolean;
    hasMedia?: boolean;
    temperatureC?: number;
  },
  existingEvents: WeatherEvent[]
): ProcessingRuleResult {
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
    return {
      isDuplicate: false,
      isFlagged: true,
      flagReason: aiFakeDetection.indicators.join('; '),
      suggestedCategory,
      confidence: Math.max(10, 100 - aiFakeDetection.suspicionScore),
      initialStatus: 'flagged',
      credibilityScore: Math.max(5, 100 - aiFakeDetection.suspicionScore),
      sourceTrustLevel: 'suspicious',
      aiFakeDetection,
      matchedKeywords
    };
  }

  // 4. Duplicate Detection Engine (Spatiotemporal Clustering: 18km / 4 Hours)
  const newTimestamp = new Date(newEvent.timestamp).getTime();
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

  for (const existing of existingEvents) {
    if (existing.verificationStatus === 'flagged') continue;

    const existingTimestamp = new Date(existing.timestamp).getTime();
    const timeDiffMs = Math.abs(newTimestamp - existingTimestamp);

    if (timeDiffMs <= FOUR_HOURS_MS) {
      const distanceKm = calculateDistanceKm(
        newEvent.latitude,
        newEvent.longitude,
        existing.latitude,
        existing.longitude
      );

      // Check spatial distance (< 18km) and category or high text similarity (> 0.45)
      const textSimilarity = calculateTextSimilarity(newEvent.text, existing.description);
      const isSameCategory = existing.category === newEvent.category || existing.category === suggestedCategory;

      if (distanceKm <= 18 && (isSameCategory || textSimilarity > 0.45)) {
        return {
          isDuplicate: true,
          matchedEventId: existing.id,
          isFlagged: false,
          suggestedCategory,
          confidence: 88,
          initialStatus: 'duplicate',
          credibilityScore: sourceTrust.credibilityScore,
          sourceTrustLevel: sourceTrust.trustLevel,
          aiFakeDetection,
          matchedKeywords
        };
      }
    }
  }

  // 5. Final Status & Confidence Calculation
  let initialStatus: VerificationStatus = 'unverified';
  let overallConfidence = Math.round((nlpConfidence * 0.4) + (sourceTrust.credibilityScore * 0.6));

  if (sourceTrust.trustLevel === 'official') {
    initialStatus = 'verified';
    overallConfidence = Math.max(95, overallConfidence);
  } else if (sourceTrust.trustLevel === 'trusted_media') {
    initialStatus = 'verified';
    overallConfidence = Math.max(88, overallConfidence);
  } else if (sourceTrust.trustLevel === 'verified_citizen' && nlpConfidence >= 75) {
    initialStatus = 'verified';
    overallConfidence = Math.max(85, overallConfidence);
  }

  return {
    isDuplicate: false,
    isFlagged: false,
    suggestedCategory,
    confidence: overallConfidence,
    initialStatus,
    credibilityScore: sourceTrust.credibilityScore,
    sourceTrustLevel: sourceTrust.trustLevel,
    aiFakeDetection,
    matchedKeywords
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
