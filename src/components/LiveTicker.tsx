import React from 'react';
import { AlertTriangle, CloudRain, Zap, Flame, Wind, Bell, WifiOff } from 'lucide-react';
import { WeatherEvent } from '../types/weather';
import { useConnectivity } from '../services/connectivityService';

interface LiveTickerProps {
  events: WeatherEvent[];
  onSelectEvent: (event: WeatherEvent) => void;
}

export const LiveTicker: React.FC<LiveTickerProps> = ({ events, onSelectEvent }) => {
  const { isOffline, isDegraded } = useConnectivity();
  const severeEvents = events.filter(
    e => (e.severity === 'severe' || e.severity === 'extreme') && e.verificationStatus !== 'flagged'
  ).slice(0, 8);

  if (severeEvents.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-4 relative z-30">
      <div className="w-full bg-white/80 backdrop-blur-xl border border-white/80 rounded-2xl px-4 py-2.5 overflow-hidden shadow-xs flex items-center">
        
        {/* Urgent Alert Pill */}
        <div className={`flex-shrink-0 flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold tracking-wide mr-4 z-10 shadow-xs border ${
          isOffline 
            ? 'bg-amber-100 text-amber-900 border-amber-300' 
            : 'bg-rose-100 text-rose-800 border-rose-200'
        }`}>
          {isOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-700" />
              <span>CACHED ADVISORY</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
              <span>IMD ADVISORY</span>
            </>
          )}
        </div>

        {/* Scrolling Event Ticker */}
        <div className="overflow-hidden whitespace-nowrap flex-1 relative">
          <div className="inline-flex space-x-8 animate-ticker">
            {[...severeEvents, ...severeEvents].map((event, idx) => (
              <button
                key={`${event.id}-ticker-${idx}`}
                onClick={() => onSelectEvent(event)}
                className="inline-flex items-center space-x-2 text-xs text-slate-700 hover:text-sky-700 transition-colors group cursor-pointer"
              >
                <span className="font-bold text-slate-900 group-hover:text-sky-700">
                  {event.city}:
                </span>
                {isOffline && (
                  <span className="text-[9px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1 py-0.2 rounded uppercase">
                    Cached
                  </span>
                )}
                <span className="text-slate-600 group-hover:text-slate-900">
                  {event.title}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {event.severity.toUpperCase()}
                </span>
                <span className="text-slate-300 font-bold">•</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
