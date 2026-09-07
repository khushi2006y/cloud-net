import { WeatherEvent, EventCategory, ProcessingRuleResult, VerificationStatus } from '../types/weather';

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

// Category keyword dictionary for rule-based NLP classification
const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  rainfall: [
    'rain', 'rainfall', 'downpour', 'precipitation', 'drizzle', 'shower', 'showers', 
    'heavy rain', 'monsoon', 'barish', 'torrential', 'deluge', 'cloudburst', 'wet'
  ],
  thunderstorm: [
    'thunder', 'thunderstorm', 'lightning', 'lightning bolt', 'squall', 'bijli', 
    'electric storm', 'kalbaishakhi', 'norwester', 'thunderbolt', 'thunderous'
  ],
  flooding: [
    'flood', 'flooding', 'flooded', 'submerged', 'waterlogging', 'waterlogged', 
    'inundation', 'overflow', 'flash flood', 'drowned', 'knee deep', 'water stagnation'
  ],
  heatwave: [
    'heat', 'heatwave', 'loo', 'scorching', 'hot', 'celsius', 'mercury', 'sunstroke', 
    'dehydration', 'heat stroke', 'sweltering', 'dry heat', 'extreme temperature'
  ],
  fog: [
    'fog', 'dense fog', 'mist', 'visibility', 'smog', 'zero visibility', 'palam', 
    'low visibility', 'haze', 'kohra', 'airports delayed'
  ],
  'dust storm': [
    'dust', 'dust storm', 'andhi', 'sand', 'sand storm', 'desert storm', 'dust cloud', 
    'haboob', 'sand dunes', 'brown out'
  ],
  'strong wind': [
    'wind', 'strong wind', 'gale', 'squall', 'cyclone', 'gust', 'gusty', 'storm winds', 
    'high speed wind', 'anemometer', 'roof blown', 'trees uprooted'
  ]
};

// Spam & fake detection triggers
const SPAM_TRIGGERS = [
  'crypto', 'bitcoin', 'casino', 'earn money', 'click here', 'giveaway', 'promo', 
  'free iphone', 'follow back', 'dating', 'investment', 'lottery', 'bit.ly', 'telegram'
];

/**
 * Classifies unstructured text into one of the 7 official IMD event categories
 */
export function classifyEventCategory(text: string): { category: EventCategory; confidence: number } {
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

  let totalMatches = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const category = cat as EventCategory;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        scores[category] += 1;
        totalMatches += 1;
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
    return { category: 'rainfall', confidence: 45 };
  }

  const confidence = Math.min(99, Math.round(55 + (maxScore / Math.max(1, totalMatches)) * 40));
  return { category: bestCategory, confidence };
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
    isOfficialSource?: boolean;
  },
  existingEvents: WeatherEvent[]
): ProcessingRuleResult {
  const combinedText = newEvent.text.toLowerCase();
  
  // 1. Fake / Spam Detection
  // Rule A: Spam keyword triggers
  for (const spam of SPAM_TRIGGERS) {
    if (combinedText.includes(spam)) {
      return {
        isDuplicate: false,
        isFlagged: true,
        flagReason: `Spam Signature Detected: Contained banned pattern "${spam}"`,
        suggestedCategory: newEvent.category,
        confidence: 15,
        initialStatus: 'flagged'
      };
    }
  }

  // Rule B: Geo Bounding Box Verification (India territory approx: Lat 6° to 38°N, Lng 68° to 98°E)
  if (
    isNaN(newEvent.latitude) || 
    isNaN(newEvent.longitude) ||
    newEvent.latitude < 5 || newEvent.latitude > 38 ||
    newEvent.longitude < 67 || newEvent.longitude > 99
  ) {
    return {
      isDuplicate: false,
      isFlagged: true,
      flagReason: `Invalid Geographic Coordinates: GPS (${newEvent.latitude}, ${newEvent.longitude}) is outside Indian meteorological zone.`,
      suggestedCategory: newEvent.category,
      confidence: 20,
      initialStatus: 'flagged'
    };
  }

  // Rule C: Text validity
  if (newEvent.text.trim().length < 8) {
    return {
      isDuplicate: false,
      isFlagged: true,
      flagReason: 'Insufficient Information: Description text is too short (< 8 chars) to verify weather anomaly.',
      suggestedCategory: newEvent.category,
      confidence: 30,
      initialStatus: 'flagged'
    };
  }

  // 2. Duplicate Detection Engine
  // Checks if any existing event within 20km radius & same category occurred in the last 4 hours
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

      // If within 18 km and matching category
      if (distanceKm <= 18 && existing.category === newEvent.category) {
        return {
          isDuplicate: true,
          matchedEventId: existing.id,
          isFlagged: false,
          suggestedCategory: newEvent.category,
          confidence: 85,
          initialStatus: 'duplicate'
        };
      }
    }
  }

  // 3. AI Categorization check
  const { category: suggestedCategory, confidence: nlpConfidence } = classifyEventCategory(newEvent.text);

  // 4. Source Trust Logic
  let initialStatus: VerificationStatus = 'unverified';
  let baseConfidence = nlpConfidence;

  if (newEvent.isOfficialSource || newEvent.source === 'api') {
    initialStatus = 'verified';
    baseConfidence = Math.max(95, baseConfidence);
  } else if (newEvent.source === 'citizen') {
    initialStatus = 'unverified';
    baseConfidence = Math.max(65, Math.min(88, baseConfidence));
  } else if (newEvent.source === 'twitter') {
    if (combinedText.includes('#imd') || combinedText.includes('@indiametdept')) {
      baseConfidence = Math.min(92, baseConfidence + 10);
    }
  }

  return {
    isDuplicate: false,
    isFlagged: false,
    suggestedCategory,
    confidence: baseConfidence,
    initialStatus
  };
}
