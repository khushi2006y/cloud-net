import React, { useState, useMemo } from 'react';
import { MAJOR_INDIAN_DISTRICTS, CATEGORY_CONFIG, INDIAN_STATES, DistrictNode } from '../data/initialEvents';
import { WeatherEvent, WeatherMood } from '../types/weather';
import { MapPin, Building, Landmark, Search, Filter, Compass } from 'lucide-react';

interface CityGlanceBarProps {
  events: WeatherEvent[];
  onSelectCity: (cityName: string) => void;
  onMoodChange?: (mood: WeatherMood) => void;
}

export const CityGlanceBar: React.FC<CityGlanceBarProps> = ({
  events,
  onSelectCity,
  onMoodChange
}) => {
  const [viewScope, setViewScope] = useState<'all' | 'metros' | 'districts'>('districts');
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [districtSearch, setDistrictSearch] = useState<string>('');

  // Filter districts based on scope, state, and search query
  const filteredDistricts = useMemo(() => {
    return MAJOR_INDIAN_DISTRICTS.filter((d: DistrictNode) => {
      // Scope filter
      if (viewScope === 'metros' && !d.isMetro) return false;
      if (viewScope === 'districts' && d.isMetro && selectedState === 'All States') return false;

      // State filter
      if (selectedState !== 'All States' && d.state.toLowerCase() !== selectedState.toLowerCase()) {
        return false;
      }

      // Search query
      if (districtSearch.trim()) {
        const q = districtSearch.toLowerCase().trim();
        const matchName = d.name.toLowerCase().includes(q);
        const matchState = d.state.toLowerCase().includes(q);
        if (!matchName && !matchState) return false;
      }

      return true;
    });
  }, [viewScope, selectedState, districtSearch]);

  const getDistrictStatus = (cityName: string, stateName: string) => {
    const matched = events.find(e => 
      e.city.toLowerCase() === cityName.toLowerCase() ||
      (e.state.toLowerCase() === stateName.toLowerCase() && e.city.toLowerCase().includes(cityName.toLowerCase()))
    );

    if (matched) {
      const config = CATEGORY_CONFIG[matched.category];
      return {
        hasEvent: true,
        emoji: config.emoji,
        label: config.label,
        category: matched.category,
        severity: matched.severity,
        temp: matched.telemetry?.temperatureC !== undefined 
          ? matched.telemetry.temperatureC 
          : (matched.category === 'heatwave' ? 44.5 : matched.category === 'rainfall' ? 26.2 : 28.0),
        wind: matched.telemetry?.windSpeedKmh || 22
      };
    }

    return {
      hasEvent: false,
      emoji: '☀️',
      label: 'Fair Weather',
      category: 'default' as WeatherMood,
      severity: 'normal',
      temp: 29.0,
      wind: 12
    };
  };

  const handleDistrictClick = (cityName: string, category: WeatherMood) => {
    onSelectCity(cityName);
    if (onMoodChange) {
      onMoodChange(category);
    }
  };

  return (
    <div className="w-full mb-6 space-y-2.5">
      
      {/* Control Header: Toggle Scope + State Filter + Quick Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
        
        {/* Left: Scope Segmented Toggle */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
          <button
            onClick={() => setViewScope('districts')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewScope === 'districts'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Major Districts ({MAJOR_INDIAN_DISTRICTS.filter((d: DistrictNode) => !d.isMetro).length})</span>
          </button>

          <button
            onClick={() => setViewScope('metros')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewScope === 'metros'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Top Metros ({MAJOR_INDIAN_DISTRICTS.filter((d: DistrictNode) => d.isMetro).length})</span>
          </button>

          <button
            onClick={() => setViewScope('all')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewScope === 'all'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>All Nodes ({MAJOR_INDIAN_DISTRICTS.length})</span>
          </button>
        </div>

        {/* Right: State Selector Dropdown & Quick District Search */}
        <div className="flex items-center space-x-2 flex-wrap">
          
          {/* Quick District Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find district / city..."
              value={districtSearch}
              onChange={(e) => setDistrictSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white/85 border border-slate-200 shadow-xs focus:outline-none focus:border-sky-500 w-36 sm:w-44 placeholder-slate-400 font-medium"
            />
            {districtSearch && (
              <button
                onClick={() => setDistrictSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* State Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="pl-3 pr-7 py-1.5 text-xs rounded-xl bg-white/85 border border-slate-200 shadow-xs focus:outline-none focus:border-sky-500 font-semibold text-slate-700 appearance-none cursor-pointer"
            >
              {INDIAN_STATES.map(st => (
                <option key={st} value={st}>
                  {st === 'All States' ? '🌍 All States & UTs' : `📍 ${st}`}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

        </div>

      </div>

      {/* Horizontal Scrolling Chips Row */}
      <div className="w-full overflow-x-auto scrollbar-none pb-1">
        <div className="flex items-center space-x-2.5 min-w-max">
          
          {/* Active Header Tag */}
          <div className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 shadow-xs text-xs font-bold text-sky-900 flex-shrink-0">
            <MapPin className="w-3.5 h-3.5 text-sky-600" />
            <span>
              {selectedState !== 'All States' ? `${selectedState} Districts` : viewScope === 'metros' ? 'Metro Stations' : 'Major Districts'}:
            </span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-sky-200/80 text-[10px] text-sky-900 font-extrabold">
              {filteredDistricts.length}
            </span>
          </div>

          {/* District Chips */}
          {filteredDistricts.map((district: DistrictNode) => {
            const status = getDistrictStatus(district.name, district.state);
            const hasAlert = status.hasEvent && status.category !== 'default';

            return (
              <button
                key={`${district.name}-${district.state}`}
                onClick={() => handleDistrictClick(district.name, status.category)}
                className={`flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl backdrop-blur-md border transition-all cursor-pointer shadow-xs hover:shadow-md group flex-shrink-0 ${
                  hasAlert
                    ? 'bg-white/95 border-amber-300 hover:border-amber-400 hover:bg-amber-50/40'
                    : 'bg-white/80 hover:bg-white border-slate-200/80 hover:border-sky-300'
                }`}
                title={`Click to focus ${district.name}, ${district.state} on Map`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">
                  {status.emoji}
                </span>

                <div className="flex flex-col text-left">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-sky-700">
                      {district.name}
                    </span>
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {district.state.length > 8 ? district.state.substring(0, 3).toUpperCase() : district.state}
                    </span>
                  </div>
                  
                  <span className="text-[10px] text-slate-500 font-medium">
                    {status.label}
                  </span>
                </div>

                <div className="flex items-center space-x-1 pl-1.5 border-l border-slate-100 font-mono text-xs">
                  <span className={`font-bold ${
                    status.temp >= 40 
                      ? 'text-orange-600' 
                      : status.temp <= 15 
                      ? 'text-cyan-600' 
                      : 'text-slate-800'
                  }`}>
                    {Math.round(status.temp)}°C
                  </span>
                </div>
              </button>
            );
          })}

          {filteredDistricts.length === 0 && (
            <div className="text-xs text-slate-500 italic px-4 py-2 bg-white/60 rounded-xl border border-dashed border-slate-300">
              No districts match your search &ldquo;{districtSearch}&rdquo; in {selectedState}. Try selecting &ldquo;All States&rdquo; or clearing the search.
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
