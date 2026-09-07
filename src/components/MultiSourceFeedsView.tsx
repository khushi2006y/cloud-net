import React from 'react';
import { 
  Radio, 
  Users, 
  Database,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Twitter } from './icons/TwitterIcon';
import { WeatherEvent } from '../types/weather';

interface MultiSourceFeedsViewProps {
  events: WeatherEvent[];
  onTriggerApiFetch: () => void;
  onTriggerTweet: () => void;
}

export const MultiSourceFeedsView: React.FC<MultiSourceFeedsViewProps> = ({
  events,
  onTriggerApiFetch,
  onTriggerTweet
}) => {
  const twitterEvents = events.filter(e => e.source === 'twitter');
  const apiEvents = events.filter(e => e.source === 'api');
  const citizenEvents = events.filter(e => e.source === 'citizen');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">
              Multi-Source Ingestion Streams & Telemetry Pipelines
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ETL pipeline collecting unstructured weather reports from Twitter #IMD, Open-Meteo API & citizen submissions.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold">
          <button
            onClick={onTriggerTweet}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <Twitter className="w-3.5 h-3.5 text-sky-500" />
            <span>Poll Twitter #IMD</span>
          </button>

          <button
            onClick={onTriggerApiFetch}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <Radio className="w-3.5 h-3.5 text-teal-600" />
            <span>Sync Open-Meteo</span>
          </button>
        </div>
      </div>

      {/* 3 Pipeline Stream Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pipeline 1: Twitter / X Stream */}
        <div className="glass-card p-5 rounded-3xl flex flex-col h-[520px] shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-sky-100 text-sky-600">
                <Twitter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Twitter / X Stream</h3>
                <span className="text-[10px] text-sky-700 font-mono font-semibold">#IMD #WeatherAlert</span>
              </div>
            </div>
            <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {twitterEvents.length} posts
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1 divide-y divide-slate-50">
            {twitterEvents.map(t => (
              <div key={t.id} className="p-3 rounded-2xl bg-white border border-slate-100 text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-700">{t.sourceAuthor}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(t.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">{t.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>📍 {t.city}, {t.state}</span>
                  <span className="text-sky-700 font-mono font-bold">Confidence: {t.confidenceScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline 2: Open-Meteo Public API */}
        <div className="glass-card p-5 rounded-3xl flex flex-col h-[520px] shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Open-Meteo Synoptic API</h3>
                <span className="text-[10px] text-teal-700 font-mono font-semibold">api.open-meteo.com</span>
              </div>
            </div>
            <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {apiEvents.length} synops
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1 divide-y divide-slate-50">
            {apiEvents.map(a => (
              <div key={a.id} className="p-3 rounded-2xl bg-white border border-slate-100 text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-800">{a.sourceAuthor}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Auto-Verified
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] font-mono bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {a.rawText}
                </p>
                {a.telemetry && (
                  <div className="grid grid-cols-3 gap-1.5 text-xs text-center font-mono font-bold pt-1">
                    <div className="bg-slate-50 p-1.5 rounded-lg text-slate-800">{a.telemetry.temperatureC}°C</div>
                    <div className="bg-slate-50 p-1.5 rounded-lg text-sky-700">{a.telemetry.precipitationMm}mm</div>
                    <div className="bg-slate-50 p-1.5 rounded-lg text-teal-700">{a.telemetry.windSpeedKmh}km/h</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline 3: Citizen Crowdsourced Portal */}
        <div className="glass-card p-5 rounded-3xl flex flex-col h-[520px] shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Citizen Crowd Reports</h3>
                <span className="text-[10px] text-purple-700 font-mono font-semibold">GPS Telemetry</span>
              </div>
            </div>
            <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {citizenEvents.length} reports
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1 divide-y divide-slate-50">
            {citizenEvents.map(c => (
              <div key={c.id} className="p-3 rounded-2xl bg-white border border-slate-100 text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-800">{c.sourceAuthor}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    c.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                    c.verificationStatus === 'duplicate' ? 'bg-purple-100 text-purple-800' :
                    c.verificationStatus === 'flagged' ? 'bg-rose-100 text-rose-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {c.verificationStatus}
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">{c.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>📍 {c.city}, {c.state}</span>
                  <span className="font-mono text-slate-400 font-medium">GPS: {c.latitude.toFixed(2)}, {c.longitude.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
