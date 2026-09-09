/**
 * OfflineEmergencyBanner.tsx — Persistent Disaster Status & Emergency Action Header
 *
 * Prominently yet calmly alerts citizens that the device has lost connection,
 * presents the last synchronized meteorological situation, and provides one-tap
 * access to emergency phone numbers, offline reporting, and tactical maps.
 */

import React from 'react';
import { 
  WifiOff, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  PhoneCall, 
  Send, 
  Download, 
  BatteryLow, 
  ShieldAlert, 
  Compass,
  Zap,
  RefreshCw
} from 'lucide-react';
import { ConnectivityStatus } from '../services/connectivityService';
import { OfflineSnapshot } from '../services/offlineStorage';
import { getDataFreshness, formatDateTime } from '../services/dataFreshness';

interface OfflineEmergencyBannerProps {
  status: ConnectivityStatus;
  snapshot: OfflineSnapshot | null;
  onOpenHelplinesModal: () => void;
  onOpenCitizenModal: () => void;
  onOpenPrepareModal: () => void;
  isEmergencyView: boolean;
  onToggleEmergencyView: () => void;
  isLowBandwidth: boolean;
  onToggleLowBandwidth: () => void;
  onCheckReachability: () => void;
}

export const OfflineEmergencyBanner: React.FC<OfflineEmergencyBannerProps> = ({
  status,
  snapshot,
  onOpenHelplinesModal,
  onOpenCitizenModal,
  onOpenPrepareModal,
  isEmergencyView,
  onToggleEmergencyView,
  isLowBandwidth,
  onToggleLowBandwidth,
  onCheckReachability
}) => {
  if (status === 'online') return null;

  const isDegraded = status === 'degraded';
  const lastSyncTime = snapshot?.lastSyncedAt || new Date(Date.now() - 35 * 60 * 1000).toISOString();
  const freshness = getDataFreshness(lastSyncTime);
  const areaName = snapshot?.location.city || 'Local Area';
  const lastKnownCategory = snapshot?.weather?.[0]?.category || snapshot?.events?.[0]?.category || 'Heavy Rainfall / Flood Risk';

  return (
    <div className={`w-full border-b transition-colors shadow-lg relative z-30 ${
      isDegraded 
        ? 'bg-amber-500/95 text-slate-900 border-amber-600' 
        : 'bg-rose-900 text-white border-rose-950'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        
        {/* Main Status Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left info column */}
          <div className="flex items-start space-x-3">
            <div className={`p-2.5 rounded-2xl flex-shrink-0 ${
              isDegraded ? 'bg-amber-600 text-white' : 'bg-rose-800 text-white animate-pulse'
            }`}>
              {isDegraded ? <AlertTriangle className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wider">
                  {isDegraded ? 'DEGRADED CONNECTION (SLOW / UNSTABLE)' : 'OFFLINE EMERGENCY MODE'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  freshness.tier === 'FRESH'
                    ? 'bg-emerald-500 text-white border-emerald-400'
                    : freshness.tier === 'RECENT'
                    ? 'bg-sky-500 text-white border-sky-400'
                    : freshness.tier === 'STALE'
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-rose-500 text-white border-rose-400'
                }`}>
                  {freshness.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-90">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 opacity-80" />
                  <span>Area: <strong>{areaName}</strong></span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 opacity-80" />
                  <span>Last synchronized: <strong>{formatDateTime(lastSyncTime)}</strong> ({freshness.relativeTimeStr})</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span>Situation: <strong>{lastKnownCategory}</strong></span>
                </span>
              </div>

              <p className="text-[11px] opacity-80 italic">
                Notice: Showing cached local information. Data may be outdated because device is disconnected from cellular network.
              </p>
            </div>
          </div>

          {/* Right action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
            
            {/* Quick Emergency Helplines Call button */}
            <button
              onClick={onOpenHelplinesModal}
              className="px-3.5 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-extrabold text-xs shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
              <span>Helplines (112)</span>
            </button>

            {/* Offline Incident Report button */}
            <button
              onClick={onOpenCitizenModal}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Report Incident</span>
            </button>

            {/* Minimal Emergency View Toggle */}
            <button
              onClick={onToggleEmergencyView}
              className={`px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center space-x-1.5 ${
                isEmergencyView
                  ? 'bg-slate-900 text-white border-slate-950 shadow-inner'
                  : 'bg-black/20 hover:bg-black/30 text-white border-white/30'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isEmergencyView ? 'Full Dashboard' : 'Emergency View'}</span>
            </button>

            {/* Low Bandwidth Mode Toggle */}
            <button
              onClick={onToggleLowBandwidth}
              className={`px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center space-x-1.5 ${
                isLowBandwidth
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-black/20 hover:bg-black/30 text-white border-white/30'
              }`}
              title="Disables animations, video, and background network polls to save battery & bandwidth"
            >
              <BatteryLow className="w-3.5 h-3.5" />
              <span>{isLowBandwidth ? 'Low-Bandwidth ON' : 'Low-Bandwidth'}</span>
            </button>

            {/* Prepare Offline Area */}
            <button
              onClick={onOpenPrepareModal}
              className="px-3 py-2 rounded-xl bg-black/20 hover:bg-black/30 text-white border border-white/30 font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer"
              title="Cache nearby disaster zone"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Area Cache</span>
            </button>

            {/* Re-check network button */}
            <button
              onClick={onCheckReachability}
              className="p-2 rounded-xl bg-black/20 hover:bg-black/30 text-white border border-white/30 font-bold text-xs transition-all cursor-pointer"
              title="Check if connection has returned"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};
