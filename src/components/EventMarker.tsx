import React from 'react';
import L from 'leaflet';
import { WeatherEvent, DisplayPolicy } from '../types/weather';
import { CATEGORY_CONFIG } from '../data/initialEvents';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Layers, 
  Radio, 
  ShieldAlert, 
  ShieldCheck, 
  X,
  ExternalLink,
  Info
} from 'lucide-react';

/**
 * Computes data freshness: events older than 3 hours are STALE.
 */
export function getDataFreshness(timestamp: string): 'CURRENT' | 'STALE' {
  const ts = new Date(timestamp).getTime();
  if (isNaN(ts)) return 'CURRENT';
  const ageHours = (Date.now() - ts) / (1000 * 60 * 60);
  return ageHours > 3 ? 'STALE' : 'CURRENT';
}

/**
 * Resolves the effective display policy for an event, falling back to legacy fields if necessary.
 */
export function resolveDisplayPolicy(event: WeatherEvent): DisplayPolicy {
  if (event.display_policy) return event.display_policy;
  if (event.displayPolicy) return event.displayPolicy;

  // Stale check
  if (getDataFreshness(event.timestamp) === 'STALE') {
    return 'SHOW_STALE';
  }

  // Contradicted check
  if (event.verificationStatus === 'contradicted' || event.isContradictory) {
    return 'SHOW_CONTRADICTED';
  }

  // Duplicate check
  if (event.verificationStatus === 'duplicate') {
    return 'ATTACH_DUPLICATE';
  }

  // Corroborated check
  if (event.verificationStatus === 'corroborated' || (event.isImdCorroborated && (event.independent_sources ?? 1) >= 2)) {
    return 'SHOW_CORROBORATED';
  }

  // Verified check
  if (event.verificationStatus === 'verified' && (event.confidenceScore ?? 0) >= 70) {
    return 'SHOW_VERIFIED';
  }

  // Provisional check
  if (event.verificationStatus === 'unverified' && (event.confidenceScore ?? 0) >= 40) {
    return 'SHOW_PROVISIONAL';
  }

  return 'HIDE_UNVERIFIED';
}

/**
 * Maps verification status and confidence to strict display wording.
 * Ban: "% true", "100% accurate", "AI verified truth".
 */
export function formatEvidenceConfidence(confidence: number, status: string): string {
  const rounded = Math.min(100, Math.max(0, Math.round(confidence)));
  const statusWord = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return `Evidence Confidence: ${rounded}/100 (${statusWord})`;
}

/**
 * Creates a Leaflet DivIcon tailored to the event's display policy.
 */
export function createEventIcon(
  event: WeatherEvent,
  isSelected: boolean,
  pulseEnabled: boolean
): L.DivIcon {
  const policy = resolveDisplayPolicy(event);
  const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.clear || CATEGORY_CONFIG.rainfall;
  const isSevere = event.severity === 'severe' || event.severity === 'extreme';
  const isSimulated = event.is_simulated ?? false;

  let containerClass = '';
  let pinStyle = '';
  let badgeHtml = '';
  let ringHtml = '';

  switch (policy) {
    case 'SHOW_CORROBORATED':
      containerClass = 'corroborated-pin';
      pinStyle = `background: #ffffff; border: 3px double #0284c7; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);`;
      badgeHtml = `
        <span class="absolute -top-1.5 -right-1 bg-sky-600 text-white text-[8px] font-black px-1 py-0.2 rounded-full uppercase tracking-tighter shadow-xs">
          2+ Src
        </span>
      `;
      if (pulseEnabled) {
        ringHtml = `<div class="pulse-ring-light absolute rounded-full border-2 border-sky-400" style="width: 46px; height: 46px; background-color: #38bdf8; opacity: 0.35;"></div>`;
      }
      break;

    case 'SHOW_VERIFIED':
      containerClass = 'verified-pin';
      pinStyle = `background: #ffffff; border: 2.5px solid ${config.color}; box-shadow: 0 4px 14px rgba(0,0,0,0.14);`;
      if (pulseEnabled && isSevere) {
        ringHtml = `<div class="pulse-ring-light absolute rounded-full" style="width: 46px; height: 46px; background-color: ${config.color}; opacity: 0.4;"></div>`;
      }
      break;

    case 'SHOW_PROVISIONAL':
      containerClass = 'provisional-pin opacity-90';
      pinStyle = `background: #f8fafc; border: 2px dashed ${config.color}; box-shadow: 0 2px 8px rgba(0,0,0,0.08);`;
      badgeHtml = `
        <span class="absolute -top-1.5 -right-1 bg-amber-500 text-white text-[7px] font-bold px-1 rounded-full uppercase tracking-tight">
          Prov
        </span>
      `;
      break;

    case 'HIDE_UNVERIFIED':
      containerClass = 'unverified-pin opacity-75';
      pinStyle = `background: #fffbeb; border: 2px dashed #f59e0b; box-shadow: 0 2px 6px rgba(245, 158, 11, 0.2);`;
      badgeHtml = `
        <span class="absolute -top-1.5 -right-1 bg-amber-600 text-white text-[7px] font-bold px-1 rounded-full uppercase">
          Unver
        </span>
      `;
      break;

    case 'SHOW_CONTRADICTED':
      containerClass = 'contradicted-pin';
      pinStyle = `background: #fef2f2; border: 2.5px solid #ef4444; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);`;
      badgeHtml = `
        <span class="absolute -top-2 -right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-md animate-pulse">
          ⚠
        </span>
      `;
      break;

    case 'SHOW_STALE':
      containerClass = 'stale-pin grayscale opacity-60';
      pinStyle = `background: #f1f5f9; border: 2px dashed #94a3b8; box-shadow: none;`;
      badgeHtml = `
        <span class="absolute -top-1.5 -right-1 bg-slate-500 text-white text-[7px] font-bold px-1 rounded-full uppercase">
          Stale
        </span>
      `;
      break;

    case 'ATTACH_DUPLICATE':
    default:
      pinStyle = `background: #ffffff; border: 2px solid ${config.color};`;
      break;
  }

  const simBadgeHtml = isSimulated
    ? `<span class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-700 text-amber-100 text-[6.5px] font-black px-1 py-0.2 rounded uppercase whitespace-nowrap shadow-xs z-20">SIMULATION</span>`
    : '';

  const markerHtml = `
    <div class="relative flex items-center justify-center cursor-pointer group ${containerClass}" style="width: 44px; height: 44px;">
      ${ringHtml}
      <div class="custom-weather-pin relative z-10 flex items-center justify-center rounded-2xl transition-all duration-200 ${
        isSelected ? 'scale-125 ring-4 ring-sky-400' : 'hover:scale-110'
      }" style="width: 36px; height: 36px; ${pinStyle}">
        <span style="font-size: 18px;">
          ${config.emoji}
        </span>
      </div>
      ${badgeHtml}
      ${simBadgeHtml}
    </div>
  `;

  return L.divIcon({
    html: markerHtml,
    className: 'cloudnet-weather-pin-container',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  });
}

/**
 * Builds the authoritative standardized Leaflet popup DOM element adhering strictly to the 9 ordered fields:
 * 1. Event Type
 * 2. Location
 * 3. Event Time
 * 4. Evidence Confidence: N/100
 * 5. Verification Status
 * 6. Independent Source Count
 * 7. Supporting Evidence
 * 8. Contradicting Evidence
 * 9. Data Freshness
 */
export function createStandardizedPopup(
  event: WeatherEvent,
  onOpenContradiction?: (event: WeatherEvent) => void
): HTMLElement {
  const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.clear || CATEGORY_CONFIG.rainfall;
  const policy = resolveDisplayPolicy(event);
  const freshness = event.freshness || getDataFreshness(event.timestamp);
  const confidence = event.confidenceScore ?? 50;
  const sourcesCount = event.independent_sources ?? (event.isImdCorroborated ? 2 : 1);
  const isSimulated = event.is_simulated ?? false;

  // Format event time
  let eventTimeFormatted = event.timestamp;
  let relativeTimeStr = '';
  try {
    const d = new Date(event.timestamp);
    eventTimeFormatted = d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const diffMin = Math.round((Date.now() - d.getTime()) / (60 * 1000));
    if (diffMin < 1) relativeTimeStr = 'Just now';
    else if (diffMin < 60) relativeTimeStr = `${diffMin}m ago`;
    else relativeTimeStr = `${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago`;
  } catch {
    // fallback
  }

  // Evidence confidence line (strict wording)
  const confidenceFormatted = formatEvidenceConfidence(confidence, event.verificationStatus);

  // Supporting evidence
  const supporting = event.supporting_evidence?.length
    ? event.supporting_evidence
    : event.supportingEvidence?.length
    ? event.supportingEvidence
    : event.telemetry?.precipitationMm && event.telemetry.precipitationMm > 0
    ? [`Open-Meteo telemetry: ${event.telemetry.precipitationMm.toFixed(1)}mm precipitation recorded`]
    : ['Standard observation logged'];

  // Contradicting evidence
  const contradicting = event.contradicting_evidence?.length
    ? event.contradicting_evidence
    : event.contradictingEvidence?.length
    ? event.contradictingEvidence
    : (event.flagReason ? [event.flagReason] : []);

  const popupDiv = document.createElement('div');
  popupDiv.className = 'cloudnet-popup font-sans text-slate-800 text-xs';
  popupDiv.style.minWidth = '290px';
  popupDiv.style.maxWidth = '330px';

  const statusBadgeBg =
    policy === 'SHOW_VERIFIED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
    policy === 'SHOW_CORROBORATED' ? 'bg-sky-100 text-sky-800 border-sky-300' :
    policy === 'SHOW_PROVISIONAL' ? 'bg-amber-100 text-amber-800 border-amber-300' :
    policy === 'SHOW_CONTRADICTED' ? 'bg-rose-100 text-rose-800 border-rose-300' :
    policy === 'SHOW_STALE' ? 'bg-slate-100 text-slate-600 border-slate-300' :
    'bg-amber-50 text-amber-700 border-amber-200';

  const freshnessBadge = freshness === 'CURRENT'
    ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 CURRENT</span>'
    : '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-300">⏳ STALE (&gt;3h)</span>';

  const simBanner = isSimulated
    ? `<div class="mb-2 py-1 px-2 rounded-md bg-amber-600 text-amber-50 text-[10px] font-black uppercase tracking-wider flex items-center justify-between">
        <span>⚠ SIMULATION DATA</span>
        <span class="text-[9px] font-normal opacity-90">Synthetic Test Record</span>
       </div>`
    : '';

  popupDiv.innerHTML = `
    ${simBanner}
    <div class="flex items-center justify-between pb-2 border-b border-slate-200">
      <!-- 1. Event Type -->
      <span class="text-xs font-bold px-2 py-0.5 rounded-lg flex items-center space-x-1" style="background: ${config.bgHex}; color: ${config.color}; border: 1px solid ${config.color}30;">
        <span>${config.emoji}</span>
        <span>${config.label}</span>
      </span>

      <!-- 5. Verification Status -->
      <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusBadgeBg}">
        ${event.verificationStatus}
      </span>
    </div>

    <!-- 2. Location & Title -->
    <div class="mt-2">
      <div class="font-bold text-slate-900 text-sm leading-tight">${event.title}</div>
      <div class="text-[11px] text-slate-500 font-medium flex items-center mt-0.5">
        📍 <span>${event.city}${event.state ? `, ${event.state}` : ''}</span>
      </div>
    </div>

    <!-- 3. Event Time & 9. Data Freshness -->
    <div class="mt-2 flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-100">
      <div class="flex items-center space-x-1 text-slate-600">
        <span>🕒</span>
        <span class="font-semibold text-slate-800">${eventTimeFormatted}</span>
        ${relativeTimeStr ? `<span class="text-slate-400">(${relativeTimeStr})</span>` : ''}
      </div>
      <div>
        ${freshnessBadge}
      </div>
    </div>

    <!-- 4. Evidence Confidence & 6. Independent Source Count -->
    <div class="mt-2 p-2 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-900">${confidenceFormatted}</span>
      </div>
      <div class="text-[10px] text-slate-600 flex items-center space-x-1">
        <span>🔗</span>
        <span>Independent Sources: <strong>${sourcesCount}</strong></span>
      </div>
    </div>

    <!-- 7. Supporting Evidence -->
    <div class="mt-2">
      <div class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">Supporting Evidence:</div>
      <ul class="text-[11px] text-slate-700 list-disc list-inside space-y-0.5 bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100">
        ${supporting.map((s: string) => `<li>${s}</li>`).join('')}
      </ul>
    </div>

    <!-- 8. Contradicting Evidence -->
    ${contradicting.length > 0 ? `
      <div class="mt-2">
        <div class="text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-0.5">Contradicting Evidence:</div>
        <ul class="text-[11px] text-rose-900 list-disc list-inside space-y-0.5 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
          ${contradicting.map((c: string) => `<li>${c}</li>`).join('')}
        </ul>
      </div>
    ` : `
      <div class="mt-2 text-[10px] text-slate-400 italic">
        Contradicting Evidence: None detected
      </div>
    `}

    <!-- Telemetry Strip if Available -->
    ${event.telemetry ? `
      <div class="mt-2 grid grid-cols-2 gap-1 p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] text-slate-700">
        <div>🌡️ Temp: <strong>${event.telemetry.temperatureC?.toFixed(1) ?? '--'}°C</strong></div>
        <div>💧 Hum: <strong>${event.telemetry.humidityPct ?? '--'}%</strong></div>
        <div>🌧️ Rain: <strong>${event.telemetry.precipitationMm?.toFixed(1) ?? '0.0'} mm</strong></div>
        <div>💨 Wind: <strong>${event.telemetry.windSpeedKmh?.toFixed(1) ?? '--'} km/h</strong></div>
      </div>
    ` : ''}

    ${policy === 'SHOW_CONTRADICTED' ? `
      <div class="mt-3">
        <button id="btn-view-contradiction-${event.id}" class="w-full py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition shadow-xs cursor-pointer flex items-center justify-center space-x-1">
          <span>⚠ View Full Contradiction Audit</span>
        </button>
      </div>
    ` : ''}
  `;

  if (policy === 'SHOW_CONTRADICTED' && onOpenContradiction) {
    setTimeout(() => {
      const btn = popupDiv.querySelector(`#btn-view-contradiction-${event.id}`);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          onOpenContradiction(event);
        });
      }
    }, 50);
  }

  return popupDiv;
}

/**
 * ⚠ Contradiction Card Component
 * Rendered when inspecting a contradicted incident report.
 * Provides clear audit reason, supporting vs contradicting telemetry, and explicit disclaimer.
 */
export const ContradictionCard: React.FC<{
  event: WeatherEvent;
  onClose: () => void;
}> = ({ event, onClose }) => {
  const confidence = event.confidenceScore ?? 0;
  const supporting = event.supporting_evidence?.length
    ? event.supporting_evidence
    : event.supportingEvidence?.length
    ? event.supportingEvidence
    : ['Citizen visual report submitted'];

  const contradicting = event.contradicting_evidence?.length
    ? event.contradicting_evidence
    : event.contradictingEvidence?.length
    ? event.contradictingEvidence
    : [event.flagReason || 'Atmospheric telemetry contradicts report claim'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-rose-300 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">⚠ Contradicted Incident Audit</h3>
              <p className="text-rose-100 text-xs">CloudNet Truth Verification Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status and Confidence */}
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-800 uppercase tracking-wider">Evaluation Verdict</div>
              <div className="text-sm font-extrabold text-rose-950">CONTRADICTED REPORT</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-rose-800">Confidence Metric</div>
              <div className="text-xs font-extrabold text-slate-800">
                {formatEvidenceConfidence(confidence, 'Contradicted')}
              </div>
            </div>
          </div>

          {/* Event Summary */}
          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900 text-base">{event.title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
            <div className="text-xs text-slate-500 pt-1 flex items-center space-x-3">
              <span>📍 {event.city}, {event.state}</span>
              <span>🕒 {new Date(event.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
            </div>
          </div>

          {/* Telemetry Snapshot */}
          {event.telemetry && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Radio className="w-3.5 h-3.5 text-sky-600" />
                <span>Station Telemetry at Coordinate:</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-1.5 rounded bg-white border border-slate-100">
                  <div className="text-[10px] text-slate-400">Rain</div>
                  <div className="font-bold text-slate-800">{event.telemetry.precipitationMm?.toFixed(1) ?? '0.0'} mm</div>
                </div>
                <div className="p-1.5 rounded bg-white border border-slate-100">
                  <div className="text-[10px] text-slate-400">Temp</div>
                  <div className="font-bold text-slate-800">{event.telemetry.temperatureC?.toFixed(1) ?? '--'}°C</div>
                </div>
                <div className="p-1.5 rounded bg-white border border-slate-100">
                  <div className="text-[10px] text-slate-400">Humidity</div>
                  <div className="font-bold text-slate-800">{event.telemetry.humidityPct ?? '--'}%</div>
                </div>
                <div className="p-1.5 rounded bg-white border border-slate-100">
                  <div className="text-[10px] text-slate-400">Wind</div>
                  <div className="font-bold text-slate-800">{event.telemetry.windSpeedKmh?.toFixed(1) ?? '--'} km/h</div>
                </div>
              </div>
            </div>
          )}

          {/* Evidence Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <div className="text-xs font-bold text-emerald-800 flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Claimed Evidence</span>
              </div>
              <ul className="text-xs text-slate-700 list-disc list-inside space-y-1">
                {supporting.map((s: string, i: number) => (
                  <li key={i} className="leading-snug">{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5">
              <div className="text-xs font-bold text-rose-800 flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Refuting Telemetry</span>
              </div>
              <ul className="text-xs text-rose-900 list-disc list-inside space-y-1">
                {contradicting.map((c: string, i: number) => (
                  <li key={i} className="leading-snug font-medium">{c}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Truth-Aware Map Policy Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 leading-relaxed space-y-1">
            <div className="font-bold flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-amber-700" />
              <span>Truth-Aware Map Policy Notice</span>
            </div>
            <p>
              This report has been refuted by observational telemetry and is <strong>not considered active weather truth</strong>.
              It is quarantined from citizen emergency maps to prevent panic and misinformation.
            </p>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition shadow-xs"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
