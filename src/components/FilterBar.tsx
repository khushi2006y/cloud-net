import React, { useMemo } from 'react';
import { 
  Search, 
  RotateCcw, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Radio, 
  Users,
  Filter,
  Landmark
} from 'lucide-react';
import { Twitter } from './icons/TwitterIcon';
import { FilterState, EventCategory, ReportSource, VerificationStatus, WeatherMood } from '../types/weather';
import { CATEGORY_CONFIG, INDIAN_STATES, MAJOR_INDIAN_DISTRICTS, DistrictNode } from '../data/initialEvents';

interface FilterBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  totalMatches: number;
  onCategorySelected?: (category: EventCategory) => void;
  onSearchWeather?: (query: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ 
  filter, 
  setFilter, 
  totalMatches,
  onCategorySelected,
  onSearchWeather
}) => {
  
  const handleCategoryToggle = (category: EventCategory) => {
    setFilter(prev => {
      const exists = prev.categories.includes(category);
      if (exists) {
        return { ...prev, categories: prev.categories.filter(c => c !== category) };
      } else {
        return { ...prev, categories: [...prev.categories, category] };
      }
    });

    if (onCategorySelected) {
      onCategorySelected(category);
    }
  };

  const handleSourceToggle = (source: ReportSource) => {
    setFilter(prev => {
      const exists = prev.sources.includes(source);
      if (exists) {
        return { ...prev, sources: prev.sources.filter(s => s !== source) };
      } else {
        return { ...prev, sources: [...prev.sources, source] };
      }
    });
  };

  const handleStatusToggle = (status: VerificationStatus) => {
    setFilter(prev => {
      const exists = prev.verificationStatuses.includes(status);
      if (exists) {
        return { ...prev, verificationStatuses: prev.verificationStatuses.filter(s => s !== status) };
      } else {
        return { ...prev, verificationStatuses: [...prev.verificationStatuses, status] };
      }
    });
  };

  const resetFilters = () => {
    setFilter({
      searchQuery: '',
      categories: [],
      sources: [],
      verificationStatuses: [],
      stateFilter: 'All States',
      cityFilter: '',
      dateRange: 'all',
      severityLevels: []
    });
  };

  const availableDistricts = useMemo(() => {
    if (!filter.stateFilter || filter.stateFilter === 'All States') {
      return MAJOR_INDIAN_DISTRICTS;
    }
    return MAJOR_INDIAN_DISTRICTS.filter((d: DistrictNode) => d.state.toLowerCase() === filter.stateFilter.toLowerCase());
  }, [filter.stateFilter]);

  const hasActiveFilters =
    filter.searchQuery ||
    filter.categories.length > 0 ||
    filter.sources.length > 0 ||
    filter.verificationStatuses.length > 0 ||
    filter.stateFilter !== 'All States' ||
    Boolean(filter.cityFilter) ||
    filter.dateRange !== 'all';

  const categories: EventCategory[] = [
    'clear',
    'rainfall',
    'thunderstorm',
    'flooding',
    'heatwave',
    'fog',
    'dust storm',
    'strong wind'
  ];

  return (
    <div className="glass-card p-4 rounded-2xl mb-6 space-y-3.5">
      
      {/* Row 1: Search, State, District, Date Preset & Matches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
        
        {/* Search Input */}
        <div className="md:col-span-3 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search keywords, #hashtag, or city..."
            value={filter.searchQuery}
            onChange={(e) => setFilter(prev => ({ ...prev, searchQuery: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filter.searchQuery.trim() && onSearchWeather) {
                onSearchWeather(filter.searchQuery.trim());
              }
            }}
            className="w-full glass-input pl-10 pr-20 py-2 rounded-xl text-xs placeholder-slate-400 font-medium"
          />
          {filter.searchQuery.trim().length >= 2 && onSearchWeather && (
            <button
              type="button"
              onClick={() => onSearchWeather(filter.searchQuery.trim())}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold shadow-xs transition-all cursor-pointer flex items-center space-x-0.5"
              title="Fetch live weather telemetry for this city"
            >
              <span>Weather</span>
              <span>➔</span>
            </button>
          )}
        </div>

        {/* State Filter Dropdown */}
        <div className="md:col-span-3 relative">
          <MapPin className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={filter.stateFilter}
            onChange={(e) => {
              const newState = e.target.value;
              setFilter(prev => ({ 
                ...prev, 
                stateFilter: newState,
                cityFilter: '' // Reset district when state changes
              }));
            }}
            className="w-full glass-input pl-10 pr-8 py-2 rounded-xl text-xs appearance-none cursor-pointer font-medium text-slate-700"
          >
            {INDIAN_STATES.map(st => (
              <option key={st} value={st} className="bg-white text-slate-900">
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter Dropdown */}
        <div className="md:col-span-2 relative">
          <Landmark className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={filter.cityFilter || ''}
            onChange={(e) => setFilter(prev => ({ ...prev, cityFilter: e.target.value }))}
            className="w-full glass-input pl-10 pr-8 py-2 rounded-xl text-xs appearance-none cursor-pointer font-medium text-slate-700"
          >
            <option value="">All Districts ({availableDistricts.length})</option>
            {availableDistricts.map((d: DistrictNode) => (
              <option key={`${d.name}-${d.state}`} value={d.name} className="bg-white text-slate-900">
                {d.name} {d.isMetro ? '★' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Selector */}
        <div className="md:col-span-2 relative">
          <Calendar className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={filter.dateRange}
            onChange={(e) => setFilter(prev => ({ ...prev, dateRange: e.target.value as any }))}
            className="w-full glass-input pl-10 pr-8 py-2 rounded-xl text-xs appearance-none cursor-pointer font-medium text-slate-700"
          >
            <option value="all">All Dates</option>
            <option value="today">Today Only</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>

        {/* Matches & Reset Button */}
        <div className="md:col-span-2 flex items-center justify-between space-x-2">
          <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-3 py-2 rounded-xl border border-sky-200 w-full text-center truncate">
            <strong>{totalMatches}</strong> found
          </span>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              title="Reset All Filters"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors flex-shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>


      {/* Row 2: 7 Category Filter Buttons with Emojis */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100">
        <span className="text-xs font-bold text-slate-500 mr-2 flex items-center">
          <Filter className="w-3.5 h-3.5 mr-1" /> Category:
        </span>
        
        {categories.map(catKey => {
          const config = CATEGORY_CONFIG[catKey];
          const isSelected = filter.categories.includes(catKey);

          return (
            <button
              key={catKey}
              onClick={() => handleCategoryToggle(catKey)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm scale-105'
                  : 'bg-white/90 hover:bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>{config.emoji}</span>
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Row 3: Verification Status & Multi-Source Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
        
        {/* Verification Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-semibold mr-1 flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-slate-500" /> Status:
          </span>

          {(['verified', 'corroborated', 'provisional', 'unverified', 'stale', 'contradicted'] as VerificationStatus[]).map(status => {
            const isSelected = filter.verificationStatuses.includes(status);
            return (
              <button
                key={status}
                onClick={() => handleStatusToggle(status)}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  isSelected
                    ? status === 'verified'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : status === 'corroborated'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : status === 'provisional'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : status === 'stale'
                      ? 'bg-slate-600 text-white shadow-xs'
                      : status === 'contradicted'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Source Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 font-semibold mr-1">Source:</span>

          <button
            onClick={() => handleSourceToggle('sachet')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter.sources.includes('sachet')
                ? 'bg-red-700 text-white font-semibold'
                : 'bg-white text-slate-700 border border-red-200 hover:bg-red-50'
            }`}
            title="SACHET — NDMA National Disaster Alert Portal"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 mr-0.5"></span>
            <span>SACHET (NDMA)</span>
          </button>

          <button
            onClick={() => handleSourceToggle('incois')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter.sources.includes('incois')
                ? 'bg-cyan-800 text-white font-semibold'
                : 'bg-white text-slate-700 border border-cyan-200 hover:bg-cyan-50'
            }`}
            title="INCOIS — Indian National Centre for Ocean Information Services"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-500 mr-0.5"></span>
            <span>INCOIS Marine</span>
          </button>

          <button
            onClick={() => handleSourceToggle('imd')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter.sources.includes('imd')
                ? 'bg-blue-700 text-white font-semibold'
                : 'bg-white text-slate-700 border border-blue-200 hover:bg-blue-50'
            }`}
            title="India Meteorological Department"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-0.5"></span>
            <span>IMD Official</span>
          </button>

          <button
            onClick={() => handleSourceToggle('skymet')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter.sources.includes('skymet')
                ? 'bg-amber-600 text-white font-semibold'
                : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-50'
            }`}
            title="Skymet Weather Private Network"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-0.5"></span>
            <span>Skymet</span>
          </button>

          <button
            onClick={() => handleSourceToggle('api')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter.sources.includes('api')
                ? 'bg-teal-700 text-white font-semibold'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
            title="Open-Meteo Synoptic IoT Station Network"
          >
            <Radio className="w-3 h-3" />
            <span>Open-Meteo</span>
          </button>

          <button
            onClick={() => handleSourceToggle('citizen')}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter.sources.includes('citizen')
                ? 'bg-purple-700 text-white font-semibold'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
            title="Citizen Crowdsourced Field Reports"
          >
            <Users className="w-3 h-3" />
            <span>Citizen Reports</span>
          </button>
        </div>

      </div>

    </div>
  );
};
