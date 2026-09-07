import React from 'react';
import { 
  Search, 
  RotateCcw, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Radio, 
  Users,
  Filter
} from 'lucide-react';
import { Twitter } from './icons/TwitterIcon';
import { FilterState, EventCategory, ReportSource, VerificationStatus, WeatherMood } from '../types/weather';
import { CATEGORY_CONFIG, INDIAN_STATES } from '../data/initialEvents';

interface FilterBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  totalMatches: number;
  onCategorySelected?: (category: EventCategory) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ 
  filter, 
  setFilter, 
  totalMatches,
  onCategorySelected 
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

  const hasActiveFilters =
    filter.searchQuery ||
    filter.categories.length > 0 ||
    filter.sources.length > 0 ||
    filter.verificationStatuses.length > 0 ||
    filter.stateFilter !== 'All States' ||
    filter.dateRange !== 'all';

  const categories: EventCategory[] = [
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
      
      {/* Row 1: Search, State, Date Preset & Matches */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        
        {/* Search Input */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search city, state, keywords, #hashtag..."
            value={filter.searchQuery}
            onChange={(e) => setFilter(prev => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs placeholder-slate-400 font-medium"
          />
        </div>

        {/* State Filter Dropdown */}
        <div className="md:col-span-3 relative">
          <MapPin className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={filter.stateFilter}
            onChange={(e) => setFilter(prev => ({ ...prev, stateFilter: e.target.value }))}
            className="w-full glass-input pl-10 pr-8 py-2 rounded-xl text-xs appearance-none cursor-pointer font-medium text-slate-700"
          >
            {INDIAN_STATES.map(st => (
              <option key={st} value={st} className="bg-white text-slate-900">
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Selector */}
        <div className="md:col-span-3 relative">
          <Calendar className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={filter.dateRange}
            onChange={(e) => setFilter(prev => ({ ...prev, dateRange: e.target.value as any }))}
            className="w-full glass-input pl-10 pr-8 py-2 rounded-xl text-xs appearance-none cursor-pointer font-medium text-slate-700"
          >
            <option value="all">All Recorded Dates</option>
            <option value="today">Today Only</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>

        {/* Matches & Reset Button */}
        <div className="md:col-span-2 flex items-center justify-between space-x-2">
          <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-3 py-2 rounded-xl border border-sky-200 w-full text-center">
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

          {(['verified', 'unverified', 'flagged', 'duplicate'] as VerificationStatus[]).map(status => {
            const isSelected = filter.verificationStatuses.includes(status);
            return (
              <button
                key={status}
                onClick={() => handleStatusToggle(status)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  isSelected
                    ? status === 'verified'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : status === 'flagged'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : status === 'duplicate'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-amber-500 text-white shadow-xs'
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
            onClick={() => handleSourceToggle('twitter')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter.sources.includes('twitter')
                ? 'bg-sky-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Twitter className="w-3 h-3" />
            <span>Twitter #IMD</span>
          </button>

          <button
            onClick={() => handleSourceToggle('api')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter.sources.includes('api')
                ? 'bg-teal-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Weather API</span>
          </button>

          <button
            onClick={() => handleSourceToggle('citizen')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter.sources.includes('citizen')
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Citizen Reports</span>
          </button>
        </div>

      </div>

    </div>
  );
};
