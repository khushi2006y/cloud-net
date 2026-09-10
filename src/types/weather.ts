export type EventCategory = 
  | 'clear'
  | 'rainfall'
  | 'thunderstorm'
  | 'flooding'
  | 'heatwave'
  | 'fog'
  | 'dust storm'
  | 'strong wind';

export type ReportSource = 'twitter' | 'api' | 'citizen' | 'imd' | 'iot' | 'social';

export type VerificationStatus = 
  | 'verified' 
  | 'unverified' 
  | 'flagged' 
  | 'duplicate'
  | 'provisional'
  | 'corroborated'
  | 'contradicted'
  | 'stale';

export type DisplayPolicy = 
  | 'SHOW_VERIFIED'
  | 'SHOW_CORROBORATED'
  | 'SHOW_PROVISIONAL'
  | 'HIDE_UNVERIFIED'
  | 'SHOW_CONTRADICTED'
  | 'ATTACH_DUPLICATE'
  | 'SHOW_STALE';

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

export interface EvidenceItem {
  id?: string;
  evidence_type: string;
  weight: number;
  direction: 'SUPPORTING' | 'CONTRADICTING' | 'NEUTRAL';
  description: string;
  source_id?: string;
  source_name?: string;
  data_payload?: Record<string, any>;
  created_at?: string;
}

export interface AuditLogItem {
  id?: string;
  action: string;
  performed_by?: string;
  reason?: string;
  old_status?: string;
  new_status?: string;
  old_confidence?: number;
  new_confidence?: number;
  timestamp: string;
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
  
  // Processing & Verification Intelligence (Paragraph 3 Machine Learning & AI)
  verificationStatus: VerificationStatus;
  confidenceScore: number; // 0 to 100
  credibilityScore?: number; // 0 to 100
  sourceTrustLevel?: SourceTrustLevel;
  aiClassificationCategory?: EventCategory;
  aiClassificationConfidence?: number;
  matchedKeywords?: string[];
  aiFakeDetection?: {
    isMisleading: boolean;
    suspicionScore: number; // 0 to 100
    indicators: string[];
  };
  isContradictory?: boolean;
  isImdCorroborated?: boolean;
  imdCrossCheckResult?: {
    isMatched: boolean;
    imdCategory?: EventCategory;
    note: string;
  };
  flagReason?: string;
  mergedWithId?: string; // If marked as duplicate, points to primary event ID
  duplicateOf?: string;
  duplicateCount?: number;
  
  // National Backend Intelligence Extensions
  evidence?: EvidenceItem[];
  auditLogs?: AuditLogItem[];
  timestamps?: {
    eventTime?: string;
    captureTime?: string;
    uploadTime?: string;
    isStale?: boolean;
    freshnessGrade?: string;
  };
  processing?: {
    duplicateOf?: string;
    isSynthesizedCluster?: boolean;
    independenceScore?: number;
    diversityEntropy?: number;
    subnetsObserved?: number;
  };

  // Telemetry (from Open-Meteo API when available)
  telemetry?: {
    temperatureC?: number;
    apparentTempC?: number;
    windSpeedKmh?: number;
    precipitationMm?: number;
    humidityPct?: number;
    pressureHpa?: number;
    weatherCode?: number;
  };

  // Authoritative Backend Display & Truth Fields (Part 1 & 2)
  display_policy?: DisplayPolicy;
  displayPolicy?: DisplayPolicy;
  event_id?: string;
  event_type?: string;
  confidence?: number;
  status?: VerificationStatus;
  independent_sources?: number;
  independentSources?: number;
  supporting_evidence?: string[];
  supportingEvidence?: string[];
  contradicting_evidence?: string[];
  contradictingEvidence?: string[];
  freshness?: 'CURRENT' | 'STALE';
  duplicate_count?: number;
  is_simulated?: boolean;
  isSimulated?: boolean;
}

export type SourceTrustLevel = 'official' | 'trusted_media' | 'verified_citizen' | 'unverified' | 'suspicious';

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
  isContradictory: boolean;
  shouldAutoDelete: boolean;
  autoDeleteReason?: string;
  isImdCorroborated?: boolean;
  suggestedCategory: EventCategory;
  confidence: number;
  initialStatus: VerificationStatus;
  credibilityScore: number;
  sourceTrustLevel: SourceTrustLevel;
  aiFakeDetection: {
    isMisleading: boolean;
    suspicionScore: number;
    indicators: string[];
  };
  matchedKeywords: string[];
  displayPolicy?: DisplayPolicy;
  supportingEvidence?: string[];
  contradictingEvidence?: string[];
}
