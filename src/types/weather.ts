export type EventCategory = 
  | 'rainfall'
  | 'thunderstorm'
  | 'flooding'
  | 'heatwave'
  | 'fog'
  | 'dust storm'
  | 'strong wind';

export type ReportSource = 'twitter' | 'api' | 'citizen';

export type VerificationStatus = 'verified' | 'unverified' | 'flagged' | 'duplicate';

export type SeverityLevel = 'low' | 'moderate' | 'severe' | 'extreme';

export type WeatherMood = 'default' | EventCategory;

export interface MoodTheme {
  id: WeatherMood;
  label: string;
  emoji: string;
  bgGradient: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  headerSubtitle: string;
}

export interface WeatherEvent {
  id: string;
  source: ReportSource;
  sourceAuthor: string;
  sourceHandle?: string;
  isOfficialSource?: boolean;
  
  // Temporal & Spatial Metadata
  timestamp: string; // ISO 8601 string
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  
  // Categorization & Content
  category: EventCategory;
  severity: SeverityLevel;
  title: string;
  description: string;
  rawText?: string;
  hashtags?: string[];
  
  // Media Attachments
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'none';
  
  // Processing & Verification Intelligence
  verificationStatus: VerificationStatus;
  confidenceScore: number; // 0 to 100
  aiClassificationCategory?: EventCategory;
  aiClassificationConfidence?: number;
  flagReason?: string;
  mergedWithId?: string; // If marked as duplicate, points to primary event ID
  duplicateCount?: number;
  
  // Telemetry (from Open-Meteo API when available)
  telemetry?: {
    temperatureC?: number;
    windSpeedKmh?: number;
    precipitationMm?: number;
    humidityPct?: number;
    pressureHpa?: number;
  };
}

export interface FilterState {
  searchQuery: string;
  categories: EventCategory[];
  sources: ReportSource[];
  verificationStatuses: VerificationStatus[];
  stateFilter: string;
  cityFilter: string;
  dateRange: 'today' | '24h' | '7d' | 'all';
  severityLevels: SeverityLevel[];
}

export interface CategoryMeta {
  id: EventCategory;
  label: string;
  emoji: string;
  color: string;
  bgHex: string;
  badgeBg: string;
  badgeBorder: string;
  iconName: string;
  description: string;
}

export interface AdminUser {
  username: string;
  isAuthenticated: boolean;
}

export interface ProcessingRuleResult {
  isDuplicate: boolean;
  matchedEventId?: string;
  isFlagged: boolean;
  flagReason?: string;
  suggestedCategory: EventCategory;
  confidence: number;
  initialStatus: VerificationStatus;
}
