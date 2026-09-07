import React from 'react';
import { 
  Radio, 
  Users, 
  MapPin, 
  Clock, 
  ChevronRight,
  CloudRain
} from 'lucide-react';
import { Twitter } from './icons/TwitterIcon';
import { WeatherEvent, WeatherMood } from '../types/weather';
import { CATEGORY_CONFIG } from '../data/initialEvents';

interface LiveFeedListProps {
  events: WeatherEvent[];
  selectedEvent: WeatherEvent | null;
  onSelectEvent: (event: WeatherEvent) => void;
  onOpenDetails: (event: WeatherEvent) => void;
  onMoodChange?: (mood: WeatherMood) => void;
}

export const LiveFeedList: React.FC<LiveFeedListProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  onOpenDetails,
  onMoodChange
}) => {

  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'twitter':
        return <Twitter className="w-3.5 h-3.5 text-sky-500" />;
      case 'api':
        return <Radio className="w-3.5 h-3.5 text-teal-600" />;
      case 'citizen':
        return <Users className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return null;
    }
  };

  const handleClickItem = (event: WeatherEvent) => {
    onSelectEvent(event);
    if (onMoodChange) {
      onMoodChange(event.category);
    }
  };

  return (
    <div className="glass-card rounded-3xl overflow-hidden flex flex-col h-[560px] shadow-lg border border-white/80">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/60">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Real-Time Weather Feed
          </h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {events.length} reports
        </span>
      </div>

      {/* Scrollable Event List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <CloudRain className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No matching weather reports</p>
            <p className="text-xs text-slate-400 mt-1">Try selecting another category or state</p>
          </div>
        ) : (
          events.slice(0, 60).map(event => {
            const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.rainfall;
            const isSelected = selectedEvent?.id === event.id;

            return (
              <div
                key={event.id}
                onClick={() => handleClickItem(event)}
                className={`pt-2.5 first:pt-0 p-3.5 rounded-2xl transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-sky-50/90 border-2 border-sky-400 shadow-sm'
                    : 'hover:bg-white/80 border border-transparent hover:border-slate-200'
                }`}
              >
                {/* Category & Status Row */}
                <div className="flex items-center justify-between mb-1.5">
                  <span 
                    className="text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center space-x-1"
                    style={{ background: config.bgHex, color: config.color, border: `1px solid ${config.color}30` }}
                  >
                    <span>{config.emoji}</span>
                    <span>{config.label}</span>
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      event.verificationStatus === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : event.verificationStatus === 'flagged'
                        ? 'bg-rose-100 text-rose-800'
                        : event.verificationStatus === 'duplicate'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {event.verificationStatus}
                    </span>

                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      event.severity === 'extreme' ? 'bg-rose-600 text-white' :
                      event.severity === 'severe' ? 'bg-orange-500 text-white' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {event.severity.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-1">
                  {event.title}
                </h4>

                {/* Description snippet */}
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {event.description}
                </p>

                {/* Metadata & Footer */}
                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center font-bold text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-sky-600 mr-1" />
                      {event.city}, {event.state}
                    </span>

                    <span className="flex items-center text-slate-400 font-medium text-[11px]">
                      <Clock className="w-3 h-3 mr-0.5" />
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700">
                      {getSourceIcon(event.source)}
                      <span className="capitalize">{event.source}</span>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetails(event);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-slate-100 transition-colors"
                      title="Inspect Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
