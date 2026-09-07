import React from 'react';
import { 
  Database, 
  ShieldCheck, 
  CopyCheck, 
  AlertTriangle, 
  Radio, 
  Users,
  CheckCircle2
} from 'lucide-react';
import { Twitter } from './icons/TwitterIcon';
import { WeatherEvent } from '../types/weather';

interface StatsOverviewProps {
  events: WeatherEvent[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ events }) => {
  const total = events.length;
  const verifiedCount = events.filter(e => e.verificationStatus === 'verified').length;
  const unverifiedCount = events.filter(e => e.verificationStatus === 'unverified').length;
  const flaggedCount = events.filter(e => e.verificationStatus === 'flagged').length;
  const duplicateCount = events.filter(e => e.verificationStatus === 'duplicate').length;

  const twitterCount = events.filter(e => e.source === 'twitter').length;
  const apiCount = events.filter(e => e.source === 'api').length;
  const citizenCount = events.filter(e => e.source === 'citizen').length;

  const severeCount = events.filter(e => e.severity === 'severe' || e.severity === 'extreme').length;
  const verifiedPct = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;
  const affectedStatesCount = new Set(events.map(e => e.state)).size;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Card 1: Total Reports & Sources */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Multi-Source Reports
          </span>
          <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
            <Database className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900 font-sans">{total}</span>
          <span className="text-xs text-emerald-600 font-semibold flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Live Syncing
          </span>
        </div>

        {/* Breakdown by source */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center space-x-1" title="Twitter #IMD Posts">
            <Twitter className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-semibold">{twitterCount}</span>
            <span className="text-slate-400 text-[11px]">Tweets</span>
          </span>
          <span className="flex items-center space-x-1" title="Open-Meteo Weather API Telemetry">
            <Radio className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-semibold">{apiCount}</span>
            <span className="text-slate-400 text-[11px]">APIs</span>
          </span>
          <span className="flex items-center space-x-1" title="Citizen Crowd Reports">
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-semibold">{citizenCount}</span>
            <span className="text-slate-400 text-[11px]">Citizen</span>
          </span>
        </div>
      </div>

      {/* Card 2: AI Verification Quality */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Verified Reports
          </span>
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-emerald-600 font-sans">{verifiedPct}%</span>
          <span className="text-xs text-slate-500 font-medium">
            ({verifiedCount} Confirmed)
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${total ? (verifiedCount / total) * 100 : 0}%` }} 
              className="bg-emerald-500 h-full" 
            />
            <div 
              style={{ width: `${total ? (unverifiedCount / total) * 100 : 0}%` }} 
              className="bg-amber-400 h-full" 
            />
            <div 
              style={{ width: `${total ? (flaggedCount / total) * 100 : 0}%` }} 
              className="bg-rose-400 h-full" 
            />
            <div 
              style={{ width: `${total ? (duplicateCount / total) * 100 : 0}%` }} 
              className="bg-purple-400 h-full" 
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-medium">
            <span className="text-emerald-700 font-semibold">{verifiedCount} Verified</span>
            <span className="text-amber-700">{unverifiedCount} Pending</span>
            <span className="text-rose-700">{flaggedCount} Flagged</span>
          </div>
        </div>
      </div>

      {/* Card 3: AI Dedup & Spam Filter */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            AI Filter Interceptions
          </span>
          <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
            <CopyCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-purple-700 font-sans">
            {duplicateCount + flaggedCount}
          </span>
          <span className="text-xs text-slate-500 font-medium">Cleaned</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>
            <strong className="text-slate-900 font-bold">{duplicateCount}</strong> Duplicates Merged
          </span>
          <span>
            <strong className="text-rose-600 font-bold">{flaggedCount}</strong> Spam Blocked
          </span>
        </div>
      </div>

      {/* Card 4: High Severity Warnings */}
      <div className="glass-card glass-card-hover p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            High Severity Alerts
          </span>
          <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-rose-600 font-sans">{severeCount}</span>
          <span className="text-xs text-slate-500 font-medium">Critical Events</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>Affecting <strong className="text-slate-900 font-bold">{affectedStatesCount}</strong> Indian States</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-200">
            Red / Orange
          </span>
        </div>
      </div>

    </div>
  );
};
