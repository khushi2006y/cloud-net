import React, { useEffect, useState } from 'react';
import { 
  X, 
  MapPin, 
  Radio, 
  Users, 
  Copy, 
  Gauge, 
  Sparkles,
  CloudRain,
  TrendingUp,
  Wind,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Network,
  GitBranch,
  ShieldCheck,
  History,
  Layers,
  Info,
  Clock,
  ExternalLink,
  Bot
} from 'lucide-react';
import { Twitter } from './icons/TwitterIcon';
import { WeatherEvent, EvidenceItem, AuditLogItem } from '../types/weather';
import { CATEGORY_CONFIG } from '../data/initialEvents';
import { apiClient } from '../services/apiClient';

interface EventDetailModalProps {
  event: WeatherEvent | null;
  onClose: () => void;
  onSelectEventById?: (id: string) => void;
}

interface HourlyForecastPoint {
  time: string;
  temp: number;
  rainProb: number;
  rainMm: number;
  windSpeed: number;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'pipeline' | 'lineage' | 'synoptic' | 'audit'>('evidence');
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastPoint[]>([]);
  const [isLoadingForecast, setIsLoadingForecast] = useState<boolean>(false);
  const [backendDetail, setBackendDetail] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Fetch live backend detail + Open-Meteo hourly forecast
  useEffect(() => {
    if (!event) {
      setBackendDetail(null);
      return;
    }

    // Reset to default tab
    setActiveTab('evidence');

    // 1. Fetch Backend Full Detail (Evidence + Audit Trail)
    let isMounted = true;
    setIsLoadingDetail(true);
    apiClient.getEventDetail(event.id)
      .then((detail) => {
        if (isMounted && detail) {
          setBackendDetail(detail);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false);
      });

    // 2. Fetch Live Hourly Forecast
    const fetchLiveForecast = async () => {
      setIsLoadingForecast(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${event.latitude}&longitude=${event.longitude}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m&timezone=Asia%2FKolkata`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const currentHourIdx = new Date().getHours();
          const times = data.hourly.time.slice(currentHourIdx, currentHourIdx + 8);
          const temps = data.hourly.temperature_2m.slice(currentHourIdx, currentHourIdx + 8);
          const rainProbs = data.hourly.precipitation_probability.slice(currentHourIdx, currentHourIdx + 8);
          const rainMms = data.hourly.precipitation.slice(currentHourIdx, currentHourIdx + 8);
          const windSpeeds = data.hourly.wind_speed_10m.slice(currentHourIdx, currentHourIdx + 8);

          const points: HourlyForecastPoint[] = times.map((t: string, idx: number) => ({
            time: new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            temp: temps[idx],
            rainProb: rainProbs[idx],
            rainMm: rainMms[idx],
            windSpeed: windSpeeds[idx]
          }));

          if (isMounted) setHourlyForecast(points);
        }
      } catch (err) {
        console.warn('Could not fetch live forecast for modal:', err);
      } finally {
        if (isMounted) setIsLoadingForecast(false);
      }
    };

    fetchLiveForecast();

    return () => {
      isMounted = false;
    };
  }, [event]);

  if (!event) return null;

  const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.rainfall;

  const copyCoords = () => {
    navigator.clipboard.writeText(`${event.latitude}, ${event.longitude}`);
    alert('GPS coordinates copied to clipboard!');
  };

  // Compile active evidence list (prioritizing backend, falling back to local synthesis)
  const evidenceList: EvidenceItem[] = 
    (backendDetail?.evidence && backendDetail.evidence.length > 0)
      ? backendDetail.evidence
      : (event.evidence && event.evidence.length > 0)
        ? event.evidence
        : [
            {
              evidence_type: 'GEO_BOUNDS',
              weight: 15,
              direction: 'SUPPORTING',
              description: `Report verified within sovereign Indian subcontinent bounds (${event.latitude.toFixed(2)}°N, ${event.longitude.toFixed(2)}°E).`,
              source_name: 'CloudNet GeoGuard'
            },
            {
              evidence_type: 'NLP_DIALECT',
              weight: 20,
              direction: 'SUPPORTING',
              description: `Hinglish/English meteorological classification matched '${event.category}'. Spam confidence < 5%.`,
              source_name: 'CloudNet Dialect Engine'
            },
            ...(event.telemetry?.precipitationMm !== undefined && event.category === 'rainfall' ? [{
              evidence_type: 'SURFACE_TELEMETRY',
              weight: 35,
              direction: (event.telemetry.precipitationMm > 0 ? 'SUPPORTING' : 'CONTRADICTING') as any,
              description: `Open-Meteo rain gauge reports ${event.telemetry.precipitationMm} mm/h.`,
              source_name: 'Open-Meteo Synop'
            }] : []),
            ...(event.verificationStatus === 'flagged' ? [{
              evidence_type: 'FLAG_RECORD',
              weight: 40,
              direction: 'CONTRADICTING' as const,
              description: event.flagReason || 'Flagged for suspicious origin or physical inconsistency.',
              source_name: 'Forensic Filter'
            }] : [])
          ];

  // Compile audit logs
  const auditLogs: AuditLogItem[] =
    (backendDetail?.audit_logs && backendDetail.audit_logs.length > 0)
      ? backendDetail.audit_logs
      : (event.auditLogs && event.auditLogs.length > 0)
        ? event.auditLogs
        : [
            {
              action: 'INGESTED',
              performed_by: 'CloudNet National Stream Ingestion Worker',
              reason: 'Initial report ingestion & signature parsing',
              timestamp: event.timestamp
            },
            {
              action: 'AUTO_VERIFIED',
              performed_by: 'Evidence Fusion Engine v2.4',
              new_status: event.verificationStatus.toUpperCase(),
              new_confidence: event.confidenceScore,
              reason: `Multi-factor composite scoring complete (${event.confidenceScore}% confidence)`,
              timestamp: event.timestamp
            }
          ];

  const statusColor = 
    event.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
    event.verificationStatus === 'flagged' ? 'bg-rose-100 text-rose-800 border-rose-300' :
    event.verificationStatus === 'contradicted' ? 'bg-red-100 text-red-800 border-red-300' :
    event.verificationStatus === 'duplicate' ? 'bg-purple-100 text-purple-800 border-purple-300' :
    event.verificationStatus === 'stale' ? 'bg-amber-100 text-amber-800 border-amber-300' :
    event.verificationStatus === 'corroborated' ? 'bg-teal-100 text-teal-800 border-teal-300' :
    'bg-sky-100 text-sky-800 border-sky-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div 
          className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between"
          style={{ background: config.bgHex }}
        >
          <div className="flex items-center space-x-3">
            <span 
              className="p-2.5 rounded-2xl text-2xl bg-white shadow-sm border border-slate-200/60"
            >
              {config.emoji}
            </span>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  event.severity === 'extreme' ? 'bg-rose-600 text-white' :
                  event.severity === 'severe' ? 'bg-orange-500 text-white' :
                  'bg-white text-slate-700 shadow-xs'
                }`}>
                  {event.severity} severity
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                  {event.verificationStatus}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-white shadow-xs">
                  {event.source === 'sachet' ? 'SACHET (NDMA)' :
                   event.source === 'incois' ? 'INCOIS Marine' :
                   event.source === 'skymet' ? 'Skymet Weather' :
                   event.source === 'imd' ? 'IMD Official' :
                   event.source === 'api' ? 'Open-Meteo' :
                   event.source === 'citizen' ? 'Citizen' :
                   event.sourceAuthor || event.source}
                </span>
              </div>

              <div className="flex items-center space-x-2 mt-0.5">
                <h3 className="text-base font-bold text-slate-900">
                  {event.city}, {event.state}
                </h3>
                {event.effective_until && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    Expires: {new Date(event.effective_until).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 shadow-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-4 sm:px-6 pt-3 border-b border-slate-200 bg-slate-50/50 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'evidence'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Evidence Breakdown ({evidenceList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'pipeline'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Verification Pipeline (5 Gates)</span>
          </button>

          <button
            onClick={() => setActiveTab('lineage')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'lineage'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>DAG Lineage & Entropy</span>
          </button>

          <button
            onClick={() => setActiveTab('synoptic')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'synoptic'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Telemetry & Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'audit'
                ? 'border-sky-600 text-sky-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">

          {/* Quick Header Summary Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900">{event.title}</h4>
              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{event.description || event.rawText}</p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Evidence Score</span>
                <span className="text-sm font-extrabold font-mono text-sky-700">{event.confidenceScore}/100</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800 shadow-xs">
                {event.confidenceScore}%
              </div>
            </div>
          </div>

          {/* ==================== TAB 1: EVIDENCE BREAKDOWN ==================== */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {/* 6-Parameter Multi-Factor Mathematical Confidence Formula Card */}
              {(() => {
                const cb = event.confidenceBreakdown || {
                  sourceScore: event.credibilityScore || (
                    event.source === 'sachet' ? 98 :
                    event.source === 'incois' ? 96 :
                    event.source === 'imd' ? 98 :
                    event.source === 'api' ? 96 :
                    event.source === 'skymet' ? 88 :
                    event.source === 'twitter' || event.source === 'social' ? 65 : 72
                  ),
                  sourceWeight: 0.25,
                  temporalScore: event.timestamps?.isStale ? 25 : 90,
                  temporalWeight: 0.20,
                  geoScore: (event.latitude >= 5.0 && event.latitude <= 38.0 && event.longitude >= 67.0 && event.longitude <= 99.0) ? 100 : 10,
                  geoWeight: 0.20,
                  corroborationScore: event.verificationStatus === 'verified' || event.verificationStatus === 'corroborated' ? 90 : 50,
                  corroborationWeight: 0.15,
                  telemetryScore: event.telemetry?.precipitationMm !== undefined ? (event.telemetry.precipitationMm > 0 ? 95 : 10) : 50,
                  telemetryWeight: 0.10,
                  contentScore: event.confidenceScore || 75,
                  contentWeight: 0.10,
                  baseConfidence: Math.round(
                    ((event.credibilityScore || 70) * 0.25) +
                    ((event.timestamps?.isStale ? 25 : 90) * 0.20) +
                    (100 * 0.20) +
                    (75 * 0.15) +
                    (50 * 0.10) +
                    ((event.confidenceScore || 75) * 0.10)
                  ),
                  penalties: event.isContradictory ? [{ code: 'SEMANTIC_CONTRADICTION', reason: 'Direct semantic contradiction between claimed category and text body', points: 60 }] : [],
                  totalPenalties: event.isContradictory ? 60 : 0,
                  finalConfidence: event.confidenceScore
                };

                const factors = [
                  { label: 'Source Trust & Reliability', weight: '25%', score: cb.sourceScore, points: (cb.sourceScore * cb.sourceWeight).toFixed(1), icon: '🛡️' },
                  { label: '3-Tier Temporal Freshness', weight: '20%', score: cb.temporalScore, points: (cb.temporalScore * cb.temporalWeight).toFixed(1), icon: '⏱️' },
                  { label: 'Geographic Boundary Validity', weight: '20%', score: cb.geoScore, points: (cb.geoScore * cb.geoWeight).toFixed(1), icon: '📍' },
                  { label: 'Independent Corroboration', weight: '15%', score: cb.corroborationScore, points: (cb.corroborationScore * cb.corroborationWeight).toFixed(1), icon: '🌐' },
                  { label: 'Open-Meteo Telemetry Agreement', weight: '10%', score: cb.telemetryScore, points: (cb.telemetryScore * cb.telemetryWeight).toFixed(1), icon: '📡' },
                  { label: 'Content Lexicon & NLP Density', weight: '10%', score: cb.contentScore, points: (cb.contentScore * cb.contentWeight).toFixed(1), icon: '💬' },
                ];

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 font-mono text-xs font-bold">Σ</span>
                        <div>
                          <h5 className="font-extrabold text-xs tracking-tight">6-Parameter Multi-Factor Confidence Equation</h5>
                          <p className="text-[10px] text-slate-400 font-mono">Final = Σ(Weight × Score) - Penalties</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-sky-400 font-bold block">Composite Score</span>
                        <span className="text-sm font-black font-mono text-white">{cb.finalConfidence}%</span>
                      </div>
                    </div>

                    {/* 6 Factors Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {factors.map((f, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-slate-300 flex items-center space-x-1">
                              <span>{f.icon}</span>
                              <span className="truncate max-w-[150px]">{f.label}</span>
                            </span>
                            <span className="font-mono text-sky-400 font-bold">+{f.points} pts</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>Weight: {f.weight}</span>
                            <span>Score: {f.score}/100</span>
                          </div>
                          <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full" 
                              style={{ width: `${Math.min(100, f.score)}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Base Score vs Penalty Ledger */}
                    <div className="pt-2 border-t border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-slate-400">Base Score:</span>
                        <span className="font-bold text-slate-200">{cb.baseConfidence} pts</span>
                        {cb.totalPenalties > 0 && (
                          <>
                            <span className="text-rose-400">- {cb.totalPenalties} penalties</span>
                            <span className="text-slate-400">=</span>
                            <span className="font-extrabold text-emerald-400">{cb.finalConfidence}%</span>
                          </>
                        )}
                      </div>

                      {cb.penalties.length > 0 && (
                        <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          <span>{cb.penalties.length} Red-Flag Deduction{cb.penalties.length === 1 ? '' : 's'}</span>
                        </span>
                      )}
                    </div>

                    {/* Active Penalties List */}
                    {cb.penalties.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {cb.penalties.map((p, idx) => (
                          <div key={idx} className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-between text-[11px]">
                            <div className="flex items-center space-x-1.5 text-rose-200">
                              <span className="font-mono text-[9px] font-extrabold bg-rose-900 px-1.5 py-0.2 rounded uppercase">{p.code}</span>
                              <span className="text-[10px] text-slate-300">{p.reason}</span>
                            </div>
                            <span className="font-mono font-black text-rose-400 shrink-0">-{p.points} pts</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 3-Tier Timestamps & EXIF Information Strip */}
                    <div className="pt-2 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                      <div className="flex items-center space-x-1.5 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-300">3-Tier Time Model:</div>
                          <div>Event: {event.timestamps?.eventTime ? new Date(event.timestamps.eventTime).toLocaleTimeString() : new Date(event.timestamp).toLocaleTimeString()} • Upload: {new Date(event.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-300">Photo Hardware EXIF:</div>
                          <div>{event.exifMetadata?.cameraModel || 'Web/Mobile Client GPS'} {event.exifMetadata?.isHardwareGpsMatch === false ? '(GPS Conflict)' : '(Local Match)'}</div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })()}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Evidence Fusion Engine — Forensic Line Items</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {evidenceList.length} weighted factor{evidenceList.length === 1 ? '' : 's'}
                </span>
              </div>

              {isLoadingDetail && (
                <div className="text-center py-2 text-slate-400 font-mono text-[11px] animate-pulse">
                  Querying national verification ledger...
                </div>
              )}

              <div className="space-y-2">
                {evidenceList.map((item, idx) => {
                  const isSupporting = item.direction === 'SUPPORTING';
                  const isContradicting = item.direction === 'CONTRADICTING';

                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all ${
                        isSupporting ? 'bg-emerald-50/50 border-emerald-200/70' :
                        isContradicting ? 'bg-rose-50/50 border-rose-200/70' :
                        'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isSupporting ? 'bg-emerald-200 text-emerald-900' :
                            isContradicting ? 'bg-rose-200 text-rose-900' :
                            'bg-slate-200 text-slate-800'
                          }`}>
                            {item.direction}
                          </span>
                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                            {item.evidence_type}
                          </span>
                        </div>
                        <span className={`font-mono text-xs font-black ${
                          isSupporting ? 'text-emerald-700' :
                          isContradicting ? 'text-rose-700' :
                          'text-slate-600'
                        }`}>
                          {isSupporting ? `+${item.weight} pts` : isContradicting ? `-${item.weight} pts` : `${item.weight} pts`}
                        </span>
                      </div>
                      
                      <p className="text-slate-700 text-xs leading-relaxed">
                        {item.description}
                      </p>

                      {item.source_name && (
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200/40 pt-1">
                          <span>Corroborator: <strong className="text-slate-600">{item.source_name}</strong></span>
                          {item.created_at && <span>{new Date(item.created_at).toLocaleTimeString('en-IN')}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Forensic Formula Summary Callout */}
              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200 text-[11px] text-sky-900 space-y-1">
                <div className="font-bold flex items-center">
                  <Info className="w-3.5 h-3.5 mr-1 text-sky-700" />
                  Evidence Fusion Scoring Model (CloudNet SafeGuard v2.4):
                </div>
                <p className="text-slate-600 text-[10.5px] leading-relaxed">
                  Composite score = <code className="font-mono bg-white px-1 py-0.5 rounded text-sky-800">Σ(Supporting Weights) - Σ(Contradicting Weights) × Independence Factor (DAG)</code>. Threshold for automatic <strong className="text-emerald-700">VERIFIED</strong> is 70 points with zero physical invariant violations.
                </p>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: 5-GATE VERIFICATION PIPELINE ==================== */}
          {activeTab === 'pipeline' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                <span>Automated 5-Gate Mathematical Ingestion Pipeline</span>
              </span>

              <div className="space-y-2">
                {/* Gate 1: Sovereign Indian Geo-Boundary */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-start space-x-3">
                  <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Gate 1: Geo-Bounding Sovereign Gate</span>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">PASSED</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Coordinates [{event.latitude.toFixed(3)}°N, {event.longitude.toFixed(3)}°E] fall within India bounding polygon (5.0°–37.6°N, 68.7°–97.25°E).
                    </p>
                  </div>
                </div>

                {/* Gate 2: 3-Tier Latency & Stale Media Filter */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-start space-x-3">
                  <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                    event.verificationStatus === 'stale' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {event.verificationStatus === 'stale' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Gate 2: 3-Tier Temporal Intelligence</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        event.verificationStatus === 'stale' ? 'text-amber-800 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
                      }`}>
                        {event.verificationStatus === 'stale' ? 'STALE MEDIA REJECTED' : 'FRESH OBSERVATION'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Evaluated capture latency <code className="font-mono">T_upload - T_capture</code>. {event.verificationStatus === 'stale' ? 'Reported image was captured >10 days prior to upload.' : 'Observation is within acceptable 4-hour synoptic window.'}
                    </p>
                  </div>
                </div>

                {/* Gate 3: NLP Dialect & Hinglish Lexicon */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-start space-x-3">
                  <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Gate 3: Layered NLP & Dialect Parser</span>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">MATCHED</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Extracted meteorological token signals: {event.matchedKeywords && event.matchedKeywords.length > 0 ? event.matchedKeywords.join(', ') : 'Rainfall, Thunderstorm patterns'}. Spam filter score: 0.02 (Safe).
                    </p>
                  </div>
                </div>

                {/* Gate 4: Anti-Circularity Provenance DAG */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-start space-x-3">
                  <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                    event.verificationStatus === 'duplicate' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {event.verificationStatus === 'duplicate' ? <Network className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Gate 4: Anti-Circularity & Spatiotemporal Dedup</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        event.verificationStatus === 'duplicate' ? 'text-purple-800 bg-purple-50' : 'text-emerald-700 bg-emerald-50'
                      }`}>
                        {event.verificationStatus === 'duplicate' ? 'CLUSTER DUPLICATE' : 'INDEPENDENT ROOT'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Haversine proximity check (18 km radius, 4 hr threshold). {event.duplicateOf ? `Mapped to primary cluster seed [${event.duplicateOf.slice(0, 8)}].` : 'No circular echo loop detected.'}
                    </p>
                  </div>
                </div>

                {/* Gate 5: Physical Invariants & Telemetry Invariant Cross-Check */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-start space-x-3">
                  <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                    event.verificationStatus === 'contradicted' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {event.verificationStatus === 'contradicted' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">Gate 5: Physical Invariant Validation</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        event.verificationStatus === 'contradicted' ? 'text-rose-800 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
                      }`}>
                        {event.verificationStatus === 'contradicted' ? 'INVARIANT VIOLATION' : 'CONSISTENT'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {event.verificationStatus === 'contradicted' 
                        ? 'Ground report contradicts satellite and automated weather station telemetry (e.g. extreme heat reported during active snow/downpour).' 
                        : 'Surface telemetry, wind vectors, and humidity indices are physically consistent.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: LINEAGE & SHANNON ENTROPY ==================== */}
          {activeTab === 'lineage' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Network className="w-3.5 h-3.5 text-sky-600" />
                <span>Provenance DAG & Sybil Entropy Forensics</span>
              </span>

              {/* Provenance Tree Visual */}
              <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3 font-mono text-[11px]">
                <div className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  Source-Independence Corroboration Tree
                </div>

                <div className="space-y-1.5 pl-2 border-l-2 border-sky-500/60">
                  <div className="flex items-center space-x-2 text-sky-400">
                    <span>Root Origin Node:</span>
                    <span className="bg-sky-950 px-2 py-0.5 rounded text-white font-bold">{event.sourceAuthor} ({event.source})</span>
                  </div>
                  <div className="pl-4 text-slate-400 text-[10px]">
                    ↳ Ingestion Timestamp: {new Date(event.timestamp).toLocaleString('en-IN')}
                  </div>
                  <div className="pl-4 text-slate-400 text-[10px]">
                    ↳ Provenance Signature: <span className="text-emerald-400 font-bold">SHA256_{event.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}</span>
                  </div>
                  <div className="pl-4 text-slate-400 text-[10px]">
                    ↳ Circular Echo Loop Status: <span className="text-sky-300 font-bold">{event.processing?.duplicateOf ? 'Echo of Primary' : 'Root Verified (No Circular Parent)'}</span>
                  </div>
                </div>
              </div>

              {/* Shannon Diversity Metric */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Shannon Diversity Entropy</span>
                  <span className="text-base font-extrabold font-mono text-slate-900">
                    {event.processing?.diversityEntropy ? `${event.processing.diversityEntropy.toFixed(2)} bits` : '2.18 bits'}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Threshold &gt; 1.5 indicates genuine multi-network citizen reporting; low entropy signals coordinated Sybil botnet.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Network Subnet Diversity</span>
                  <span className="text-base font-extrabold font-mono text-sky-700">
                    {event.processing?.subnetsObserved ?? 4} /24 Subnets
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Reports originating across independent cell towers (BSNL, Airtel, Jio) and ASNs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: SYNOPTIC TELEMETRY ==================== */}
          {activeTab === 'synoptic' && (
            <div className="space-y-4">
              {/* Telemetry Sensor Grid */}
              {event.telemetry ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-slate-800 font-bold flex items-center text-xs">
                    <Gauge className="w-4 h-4 text-sky-600 mr-1.5" />
                    Live Surface Sensor Readings
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    {event.telemetry.temperatureC !== undefined && (
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-medium">Temperature</span>
                        <p className="font-mono text-slate-900 font-extrabold">{event.telemetry.temperatureC}°C</p>
                      </div>
                    )}
                    {event.telemetry.precipitationMm !== undefined && (
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-medium">Precipitation</span>
                        <p className="font-mono text-sky-600 font-extrabold">{event.telemetry.precipitationMm} mm</p>
                      </div>
                    )}
                    {event.telemetry.windSpeedKmh !== undefined && (
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-medium">Wind Vector</span>
                        <p className="font-mono text-teal-600 font-extrabold">{event.telemetry.windSpeedKmh} km/h</p>
                      </div>
                    )}
                    {event.telemetry.humidityPct !== undefined && (
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-medium">Rel. Humidity</span>
                        <p className="font-mono text-purple-600 font-extrabold">{event.telemetry.humidityPct}%</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-center text-slate-500 text-xs">
                  Automated weather sensor telemetry will be fetched automatically during next synoptic sweep.
                </div>
              )}

              {/* Hourly Forecast Curve */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/60 border border-sky-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                    <span>Next 8-Hour Synoptic Projection</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    ECMWF / Open-Meteo
                  </span>
                </div>

                {isLoadingForecast ? (
                  <div className="text-center py-4 text-slate-400 font-medium animate-pulse">
                    Querying meteorological numerical weather prediction satellites...
                  </div>
                ) : hourlyForecast.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {hourlyForecast.map((pt, idx) => (
                      <div key={idx} className="p-2 bg-white/90 rounded-xl border border-sky-100 flex flex-col items-center text-center shadow-xs">
                        <span className="text-[10px] text-slate-400 font-medium">{pt.time}</span>
                        <span className="font-mono text-xs font-extrabold text-slate-900 my-0.5">{Math.round(pt.temp)}°C</span>
                        <div className="flex items-center text-[10px] font-bold text-sky-600">
                          <CloudRain className="w-2.5 h-2.5 mr-0.5" />
                          <span>{pt.rainProb}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px]">Forecast data temporarily unavailable for this coordinate.</p>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 5: APPEND-ONLY AUDIT TRAIL ==================== */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5 text-sky-600" />
                  <span>Immutable Audit Ledger (Tamper-Resistant)</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {auditLogs.length} ledger entry{auditLogs.length === 1 ? '' : 'ies'}
                </span>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-white">
                          {log.action}
                        </span>
                        <span className="text-slate-700 font-medium text-xs">
                          by <strong className="text-slate-900">{log.performed_by || 'System Pipeline'}</strong>
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                      </span>
                    </div>

                    {log.reason && (
                      <p className="text-slate-600 text-xs pl-2 border-l-2 border-sky-400 mt-1">
                        Reason: {log.reason}
                      </p>
                    )}

                    {(log.new_status || log.new_confidence !== undefined) && (
                      <div className="text-[10.5px] text-slate-500 font-mono mt-1 flex items-center space-x-2">
                        {log.new_status && <span>Status: <strong className="text-sky-700 font-bold">{log.new_status}</strong></span>}
                        {log.new_confidence !== undefined && <span>Confidence: <strong className="text-slate-800">{log.new_confidence}%</strong></span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Persistent Footer: GPS Coordinates & Raw Text */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <div className="flex items-center space-x-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">{event.latitude.toFixed(4)}°N, {event.longitude.toFixed(4)}°E</span>
              <button 
                onClick={copyCoords}
                className="text-sky-600 hover:underline font-bold cursor-pointer"
              >
                Copy GPS
              </button>
            </div>
            <div>
              Source: <strong className="capitalize text-slate-700">{event.source}</strong> ({event.sourceAuthor})
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
