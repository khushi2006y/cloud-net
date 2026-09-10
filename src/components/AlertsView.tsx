import React, { useState } from 'react';
import { WeatherEvent, EventCategory } from '../types/weather';
import { CATEGORY_CONFIG } from '../data/initialEvents';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  PhoneCall, 
  Radio, 
  Clock, 
  MapPin, 
  ExternalLink, 
  Filter,
  CheckCircle2,
  Info
} from 'lucide-react';
import { formatEvidenceConfidence } from './EventMarker';

interface AlertsViewProps {
  events: WeatherEvent[];
  onSelectEvent: (event: WeatherEvent) => void;
  onOpenDetails?: (event: WeatherEvent) => void;
  onOpenReportModal: () => void;
  onOpenHelplinesModal: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  events,
  onSelectEvent,
  onOpenDetails,
  onOpenReportModal,
  onOpenHelplinesModal
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'extreme' | 'severe'>('all');

  // Filter for genuine alert-grade incidents (severe, extreme, or disaster categories)
  const criticalEvents = events.filter(e => {
    const isSevere = e.severity === 'severe' || e.severity === 'extreme';
    const isDisasterCat = e.category === 'flooding' || e.category === 'thunderstorm' || e.category === 'heatwave' || e.category === 'strong wind';
    
    // Contradicted events are excluded from public warnings
    if (e.verificationStatus === 'contradicted' || e.isContradictory) return false;

    if (selectedSeverity === 'extreme') return e.severity === 'extreme';
    if (selectedSeverity === 'severe') return e.severity === 'severe';
    return isSevere || (isDisasterCat && (e.confidenceScore ?? 0) >= 60);
  });

  const getSafetyRecommendation = (category: EventCategory): string => {
    switch (category) {
      case 'flooding':
        return 'Seek higher ground immediately. Avoid walking, cycling, or driving through waterlogged underpasses.';
      case 'thunderstorm':
        return 'Stay indoors. Unplug sensitive electrical devices and stay away from open fields, metallic fences, and isolated trees.';
      case 'heatwave':
        return 'Avoid direct midday sun exposure between 12:00 PM and 3:30 PM. Maintain continuous hydration with electrolytes.';
      case 'strong wind':
        return 'Secure loose rooftop objects and outdoor furniture. Park vehicles away from aged trees and temporary hoarding structures.';
      default:
        return 'Monitor official district administration advisories and stay tuned to verified meteorological feeds.';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="glass-card p-6 rounded-3xl border border-rose-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              National Meteorological Incident Alerts
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Real-time public safety notifications generated from multi-source observational telemetry and verified crowdsourced incident reports.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={onOpenHelplinesModal}
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Emergency 112</span>
          </button>
          <button
            onClick={onOpenReportModal}
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition cursor-pointer"
          >
            <span>Report Incident</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-bold text-slate-600">Filter Severity:</span>
          <button
            onClick={() => setSelectedSeverity('all')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
              selectedSeverity === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Active ({criticalEvents.length})
          </button>
          <button
            onClick={() => setSelectedSeverity('extreme')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
              selectedSeverity === 'extreme'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            Extreme Only
          </button>
          <button
            onClick={() => setSelectedSeverity('severe')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
              selectedSeverity === 'severe'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            Severe
          </button>
        </div>
      </div>

      {/* Alerts Grid */}
      {criticalEvents.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white/70 border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">No Active High-Severity Alerts</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            All regional atmospheric telemetry sensors and verified observation feeds report conditions within standard safety limits.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {criticalEvents.map((alert) => {
            const config = CATEGORY_CONFIG[alert.category] || CATEGORY_CONFIG.clear;
            const confidenceStr = formatEvidenceConfidence(alert.confidenceScore ?? 50, alert.verificationStatus);
            const isExtreme = alert.severity === 'extreme';

            return (
              <div
                key={alert.id}
                className={`glass-card rounded-3xl p-5 border flex flex-col justify-between transition-all duration-200 hover:shadow-lg ${
                  isExtreme ? 'border-rose-300 bg-rose-50/20' : 'border-amber-200 bg-amber-50/15'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center space-x-1.5"
                      style={{ background: `${config.bgHex}`, color: config.color, border: `1px solid ${config.color}30` }}
                    >
                      <span>{config.emoji}</span>
                      <span>{config.label}</span>
                    </span>

                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      isExtreme ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {alert.severity} WARNING
                    </span>
                  </div>

                  {/* Title & Location */}
                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                    {alert.title}
                  </h4>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{alert.city}, {alert.state}</span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {alert.description}
                  </p>

                  {/* Evidence Confidence Strip */}
                  <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between">
                    <span className="font-bold text-slate-800">{confidenceStr}</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      {alert.source}
                    </span>
                  </div>

                  {/* Telemetry snippet if available */}
                  {alert.telemetry && (
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-white border border-slate-200/70 text-[11px] text-slate-700 font-medium">
                      <div>🌧️ Rain: <strong>{alert.telemetry.precipitationMm?.toFixed(1) ?? '0.0'} mm</strong></div>
                      <div>💨 Wind: <strong>{alert.telemetry.windSpeedKmh?.toFixed(1) ?? '--'} km/h</strong></div>
                    </div>
                  )}

                  {/* Recommended Action */}
                  <div className="mt-3 p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 leading-snug">
                    <div className="font-bold mb-0.5 flex items-center space-x-1 text-amber-800">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Public Safety Guidance:</span>
                    </div>
                    <span>{getSafetyRecommendation(alert.category)}</span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(alert.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>

                  <button
                    onClick={() => {
                      onSelectEvent(alert);
                      if (onOpenDetails) onOpenDetails(alert);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer flex items-center space-x-1"
                  >
                    <span>View Dossier</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
