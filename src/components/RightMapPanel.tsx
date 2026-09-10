import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Thermometer, 
  Droplets, 
  Wind, 
  Gauge, 
  Compass, 
  Loader2, 
  X, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  Crosshair, 
  PlusCircle, 
  CheckCircle2, 
  CloudRain, 
  Zap, 
  Sun, 
  Flame, 
  Radio,
  Clock
} from 'lucide-react';
import { WeatherEvent, WeatherMood } from '../types/weather';
import { CATEGORY_CONFIG } from '../data/initialEvents';
import { LiveFeedList } from './LiveFeedList';

interface RightMapPanelProps {
  events: WeatherEvent[];
  selectedEvent: WeatherEvent | null;
  searchedWeather: WeatherEvent | null;
  isSearching: boolean;
  searchError: string | null;
  onSearch: (query: string) => void;
  onSelectEvent: (event: WeatherEvent) => void;
  onOpenDetails: (event: WeatherEvent) => void;
  onOpenReportModalWithLocation?: (loc: { city: string; lat: number; lng: number }) => void;
  onMoodChange?: (mood: WeatherMood) => void;
  onClearSearchedWeather: () => void;
}

export const RightMapPanel: React.FC<RightMapPanelProps> = ({
  events,
  selectedEvent,
  searchedWeather,
  isSearching,
  searchError,
  onSearch,
  onSelectEvent,
  onOpenDetails,
  onOpenReportModalWithLocation,
  onMoodChange,
  onClearSearchedWeather
}) => {
  const [activeTab, setActiveTab] = useState<'weather' | 'feed'>('weather');
  const [query, setQuery] = useState('');

  const POPULAR_QUICK_CITIES = [
    { label: 'Noida', query: 'Noida' },
    { label: 'Delhi', query: 'New Delhi' },
    { label: 'Mumbai', query: 'Mumbai' },
    { label: 'Bengaluru', query: 'Bengaluru' },
    { label: 'Kolkata', query: 'Kolkata' },
    { label: 'Chennai', query: 'Chennai' },
    { label: 'Jaipur', query: 'Jaipur' },
    { label: 'PIN 110001', query: '110001' }
  ];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setActiveTab('weather');
      onSearch(query.trim());
    }
  };

  const handleQuickCityClick = (cityQuery: string) => {
    setQuery(cityQuery);
    setActiveTab('weather');
    onSearch(cityQuery);
  };

  const getWeatherIcon = (category: string, precipMm: number = 0) => {
    if ((category === 'rainfall' || category === 'flooding') && precipMm === 0) {
      return <Sun className="w-8 h-8 text-amber-500" />;
    }
    switch (category) {
      case 'clear':
        return <Sun className="w-8 h-8 text-amber-500" />;
      case 'rainfall':
      case 'flooding':
        return <CloudRain className="w-8 h-8 text-sky-500 animate-bounce" />;
      case 'thunderstorm':
        return <Zap className="w-8 h-8 text-amber-400 animate-pulse" />;
      case 'heatwave':
        return <Flame className="w-8 h-8 text-rose-500 animate-pulse" />;
      case 'strong wind':
        return <Wind className="w-8 h-8 text-teal-400" />;
      default:
        return <Sun className="w-8 h-8 text-amber-500" />;
    }
  };

  const effectiveCategory = searchedWeather
    ? (searchedWeather.category === 'rainfall' || searchedWeather.category === 'flooding') && (searchedWeather.telemetry?.precipitationMm ?? 0) === 0
      ? 'clear'
      : searchedWeather.category
    : 'clear';

  const config = CATEGORY_CONFIG[effectiveCategory] || CATEGORY_CONFIG.clear || CATEGORY_CONFIG.rainfall;

  return (
    <div className="glass-card rounded-3xl overflow-hidden flex flex-col h-[560px] shadow-lg border border-white/80 bg-white/70 backdrop-blur-md">
      
      {/* Top Header & Search Bar */}
      <div className="p-3.5 border-b border-slate-100 bg-white/80 space-y-2.5">
        
        {/* Navigation Switcher Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 p-1 bg-slate-100/90 rounded-2xl">
            <button
              onClick={() => setActiveTab('weather')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'weather'
                  ? 'bg-white text-sky-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>⛅ Search Weather</span>
              {searchedWeather && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-white text-indigo-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-rose-500" />
              <span>Incident Feed</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 font-mono">
                {events.length}
              </span>
            </button>
          </div>

          {searchedWeather && activeTab === 'weather' && (
            <button
              onClick={onClearSearchedWeather}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
              title="Clear searched weather"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Search Input Field */}
        <form onSubmit={handleFormSubmit} className="relative flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search City, Town or PIN (e.g. Mumbai, Noida, 110001)..."
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 rounded-xl pl-9 pr-7 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 transition-all outline-hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs transition-all flex items-center space-x-1 cursor-pointer shrink-0"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Get Weather</span>
            )}
          </button>
        </form>

        {/* Quick Sample City Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">
            Quick:
          </span>
          {POPULAR_QUICK_CITIES.map((c) => (
            <button
              key={c.query}
              onClick={() => handleQuickCityClick(c.query)}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 font-semibold text-[11px] transition-colors whitespace-nowrap cursor-pointer border border-slate-200/60"
            >
              {c.label}
            </button>
          ))}
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* TAB 1: WEATHER SEARCH VIEW */}
        {activeTab === 'weather' && (
          <div className="space-y-4">
            
            {/* Searching Loader State */}
            {isSearching && (
              <div className="p-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-sky-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  Fetching live synoptic weather observation...
                </p>
                <p className="text-[11px] text-slate-400">
                  Connecting to Open-Meteo &amp; IMD geocoding telemetry grids
                </p>
              </div>
            )}

            {/* Error Banner */}
            {!isSearching && searchError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Weather Lookup Note</span>
                </div>
                <p className="text-xs text-rose-700">{searchError}</p>
                <p className="text-[11px] text-rose-500">
                  Tip: Check city spelling or try an Indian 6-digit PIN code (e.g. 110001, 201301).
                </p>
              </div>
            )}

            {/* Weather Result Card */}
            {!isSearching && searchedWeather && (
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50 shadow-sm overflow-hidden animate-fadeIn">
                
                {/* Card Header Banner */}
                <div 
                  className="p-4 border-b border-slate-100 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${config.bgHex}90 0%, #ffffff 100%)` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-4 h-4 text-sky-700 shrink-0" />
                        <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                          {searchedWeather.city}
                        </h3>
                        <span className="text-[11px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {searchedWeather.state}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        GPS: {searchedWeather.latitude.toFixed(3)}°N, {searchedWeather.longitude.toFixed(3)}°E
                      </p>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Live Synop</span>
                    </span>
                  </div>

                  {/* Big Temperature Hero Display */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                        {searchedWeather.telemetry?.temperatureC?.toFixed(1) ?? '28.0'}°C
                      </span>
                      {searchedWeather.telemetry?.apparentTempC !== undefined && (
                        <span className="text-xs font-semibold text-slate-500">
                          Feels like {searchedWeather.telemetry.apparentTempC.toFixed(1)}°C
                        </span>
                      )}
                    </div>
                    <div className="p-2 rounded-2xl bg-white shadow-xs border border-slate-100">
                      {getWeatherIcon(searchedWeather.category, searchedWeather.telemetry?.precipitationMm ?? 0)}
                    </div>
                  </div>

                  {/* Weather Condition Label */}
                  <div className="mt-2 flex items-center space-x-2">
                    <span 
                      className="px-2 py-0.5 rounded-lg text-xs font-bold flex items-center space-x-1"
                      style={{ background: config.bgHex, color: config.color, border: `1px solid ${config.color}40` }}
                    >
                      <span>{config.emoji}</span>
                      <span>{config.label}</span>
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                      effectiveCategory === 'clear' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      searchedWeather.severity === 'extreme' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                      searchedWeather.severity === 'severe' ? 'bg-rose-100 text-rose-900 border border-rose-200' :
                      searchedWeather.severity === 'moderate' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {effectiveCategory === 'clear' ? 'Normal / Fair' : `${searchedWeather.severity} Alert`}
                    </span>
                  </div>
                </div>

                {/* 4-Stat Telemetry Matrix */}
                <div className="p-3.5 grid grid-cols-2 gap-2 bg-white/70">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center space-x-2.5">
                    <Droplets className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">Humidity</span>
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {searchedWeather.telemetry?.humidityPct ?? '--'}%
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center space-x-2.5">
                    <Wind className="w-4 h-4 text-teal-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">Wind Speed</span>
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {searchedWeather.telemetry?.windSpeedKmh?.toFixed(1) ?? '--'} km/h
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center space-x-2.5">
                    <CloudRain className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">Precipitation</span>
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {searchedWeather.telemetry?.precipitationMm?.toFixed(1) ?? '0.0'} mm
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center space-x-2.5">
                    <Gauge className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">Air Pressure</span>
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {searchedWeather.telemetry?.pressureHpa?.toFixed(0) ?? '1013'} hPa
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ground Impact Summary */}
                <div className="px-3.5 pb-2">
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                    {searchedWeather.description}
                  </p>
                </div>

                {/* Quick Action Toolbar */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectEvent(searchedWeather)}
                    className="flex-1 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    title="Pan map to this location"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Center Map</span>
                  </button>

                  {onOpenReportModalWithLocation && (
                    <button
                      onClick={() => onOpenReportModalWithLocation({
                        city: searchedWeather.city,
                        lat: searchedWeather.latitude,
                        lng: searchedWeather.longitude
                      })}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                      title="File an emergency citizen report for this location"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-purple-600" />
                      <span>Report Here</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSearch(searchedWeather.city)}
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="Refresh telemetry"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            )}

            {/* Empty State when no weather is active */}
            {!isSearching && !searchedWeather && !searchError && (
              <div className="text-center p-6 space-y-3 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto shadow-xs">
                  <Compass className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">
                    Live Weather On-Demand
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Type any Indian city, district, town, or 6-digit PIN code in the search bar above to fetch real-time weather and view it directly beside the map.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Try Searching:
                  </span>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {['Noida Sector 62', 'Bandra Mumbai', 'CP Delhi', 'Pune'].map((sample) => (
                      <button
                        key={sample}
                        onClick={() => handleQuickCityClick(sample)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-sky-700 hover:border-sky-300 font-semibold text-xs transition-all shadow-xs cursor-pointer"
                      >
                        {sample} ➔
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: INCIDENT FEED VIEW */}
        {activeTab === 'feed' && (
          <div className="h-full">
            <LiveFeedList
              events={events}
              selectedEvent={selectedEvent}
              onSelectEvent={onSelectEvent}
              onOpenDetails={onOpenDetails}
              onMoodChange={onMoodChange}
            />
          </div>
        )}

      </div>

    </div>
  );
};
