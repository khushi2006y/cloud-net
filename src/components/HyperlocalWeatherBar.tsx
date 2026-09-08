import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Search, 
  Crosshair, 
  Power, 
  ShieldCheck, 
  X, 
  Loader2, 
  Wind, 
  Droplets, 
  Gauge, 
  Sparkles, 
  Navigation, 
  Compass,
  AlertCircle
} from 'lucide-react';
import { WeatherEvent, WeatherMood } from '../types/weather';
import { 
  searchSmallAreas, 
  reverseGeocodeCoords, 
  fetchLiveCoordinatesWeather, 
  SmallAreaLocation 
} from '../services/weatherApi';
import { CATEGORY_CONFIG } from '../data/initialEvents';

interface HyperlocalWeatherBarProps {
  activeHyperlocalEvent: WeatherEvent | null;
  onSelectHyperlocalEvent: (event: WeatherEvent) => void;
  onClearHyperlocalEvent: () => void;
  onMoodChange?: (mood: WeatherMood) => void;
  showToast: (msg: string) => void;
}

export const HyperlocalWeatherBar: React.FC<HyperlocalWeatherBarProps> = ({
  activeHyperlocalEvent,
  onSelectHyperlocalEvent,
  onClearHyperlocalEvent,
  onMoodChange,
  showToast
}) => {
  const [isMyAreaEnabled, setIsMyAreaEnabled] = useState<boolean>(() => {
    return localStorage.getItem('cloudnet_my_area_enabled') === 'true';
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SmallAreaLocation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [myAreaName, setMyAreaName] = useState<string>(() => {
    return localStorage.getItem('cloudnet_my_area_name') || '';
  });

  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for small areas
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchSmallAreas(searchQuery);
        setSearchResults(results);
        setIsDropdownOpen(results.length > 0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Request & Fetch device location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setIsPermissionModalOpen(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resolved = await reverseGeocodeCoords(latitude, longitude);
          const weatherEvent = await fetchLiveCoordinatesWeather(
            latitude, 
            longitude, 
            resolved.name, 
            resolved.state
          );

          if (weatherEvent) {
            onSelectHyperlocalEvent(weatherEvent);
            if (onMoodChange) {
              onMoodChange(weatherEvent.category);
            }
            setIsMyAreaEnabled(true);
            setMyAreaName(resolved.name);
            localStorage.setItem('cloudnet_my_area_enabled', 'true');
            localStorage.setItem('cloudnet_my_area_name', resolved.name);
            showToast(`📍 My Area Active: Live weather loaded for ${resolved.name}`);
          } else {
            showToast('Unable to fetch live telemetry for your location.');
          }
        } catch (err) {
          console.error('Location weather fetch error:', err);
          showToast('Could not load weather for your coordinates.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation denied or failed:', err);
        setIsMyAreaEnabled(false);
        localStorage.setItem('cloudnet_my_area_enabled', 'false');
        if (err.code === err.PERMISSION_DENIED) {
          showToast('Location permission was denied. You can still search any area manually.');
        } else {
          showToast('Unable to retrieve your location. Check your GPS signal.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // User clicks the My Area toggle button
  const handleToggleMyArea = () => {
    if (isMyAreaEnabled) {
      // Turn OFF immediately
      setIsMyAreaEnabled(false);
      localStorage.setItem('cloudnet_my_area_enabled', 'false');
      onClearHyperlocalEvent();
      showToast('My Area Weather turned OFF. Location access cleared.');
    } else {
      // Prompt permission modal first
      setIsPermissionModalOpen(true);
    }
  };

  // User selects a small area from search
  const handleSelectArea = async (loc: SmallAreaLocation) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    setIsLocating(true);

    try {
      const weatherEvent = await fetchLiveCoordinatesWeather(
        loc.latitude,
        loc.longitude,
        loc.name,
        loc.state || loc.country || 'India'
      );

      if (weatherEvent) {
        onSelectHyperlocalEvent(weatherEvent);
        if (onMoodChange) {
          onMoodChange(weatherEvent.category);
        }
        showToast(`📍 Loaded small-area live weather for ${loc.name}`);
      } else {
        showToast(`Failed to load weather for ${loc.name}`);
      }
    } catch (e) {
      showToast(`Error fetching weather for ${loc.name}`);
    } finally {
      setIsLocating(false);
    }
  };

  const isHyperlocalActive = !!activeHyperlocalEvent;
  const config = activeHyperlocalEvent 
    ? CATEGORY_CONFIG[activeHyperlocalEvent.category] || CATEGORY_CONFIG.rainfall 
    : null;

  return (
    <div className="w-full mb-6 space-y-3">
      {/* Top Bar: My Area Toggle + Small Area Search Input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/85 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-3 shadow-xs">
        
        {/* Left Section: My Area Quick Toggle Switch with Status */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              isMyAreaEnabled 
                ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/20' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
            </div>
            
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                <span>My Area Weather</span>
                {isMyAreaEnabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </span>
              <span className="text-[10px] text-slate-500">
                {isLocating 
                  ? 'Detecting GPS...' 
                  : isMyAreaEnabled 
                  ? `Active${myAreaName ? `: ${myAreaName}` : ''}` 
                  : 'Off (Click to turn ON)'}
              </span>
            </div>
          </div>

          {/* ON / OFF Switch Button */}
          <button
            onClick={handleToggleMyArea}
            disabled={isLocating}
            title={isMyAreaEnabled ? 'Click to turn off location weather' : 'Click to enable location weather'}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isMyAreaEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isMyAreaEnabled ? 'Turn OFF' : 'Turn ON'}</span>
          </button>
        </div>

        {/* Right Section: Small Area & Pin Code Search (Option B) */}
        <div ref={searchBoxRef} className="relative flex-1 max-w-full sm:max-w-md">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-sky-600 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search small area, neighborhood, suburb or PIN code..."
              className="w-full bg-slate-50/90 hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 transition-all outline-hidden"
            />
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin absolute right-3" />
            ) : searchQuery ? (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Select Small Area / Locality:</span>
                <span className="text-sky-600">{searchResults.length} matches</span>
              </div>
              {searchResults.map((loc) => (
                <button
                  key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
                  onClick={() => handleSelectArea(loc)}
                  className="w-full text-left px-3.5 py-2 hover:bg-sky-50/80 transition-colors flex items-center justify-between group cursor-pointer border-b border-slate-100/60 last:border-0"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-sky-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-sky-700">
                        {loc.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {[loc.district, loc.state, loc.country].filter(Boolean).join(', ')}
                        {loc.postcode ? ` • PIN ${loc.postcode}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 pl-2 flex-shrink-0">
                    {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Active Hyperlocal Microclimate Spotlight Card */}
      {isHyperlocalActive && activeHyperlocalEvent && config && (
        <div className="relative overflow-hidden bg-gradient-to-r from-white/95 via-sky-50/80 to-white/95 backdrop-blur-xl border-2 border-sky-300/80 rounded-2xl p-4 shadow-md transition-all animate-fadeIn">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            
            {/* Left: Badge, Area Name, Condition */}
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-sky-200 shadow-sm flex items-center justify-center text-2xl flex-shrink-0">
                {config.emoji}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200 flex items-center space-x-1">
                    <Navigation className="w-2.5 h-2.5 text-sky-600" />
                    <span>Hyperlocal Area Weather</span>
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    [{activeHyperlocalEvent.latitude.toFixed(3)}°N, {activeHyperlocalEvent.longitude.toFixed(3)}°E]
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 flex items-center space-x-2">
                  <span>{activeHyperlocalEvent.city}</span>
                  {activeHyperlocalEvent.state && (
                    <span className="text-xs font-medium text-slate-500">• {activeHyperlocalEvent.state}</span>
                  )}
                </h3>

                <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                  {activeHyperlocalEvent.description}
                </p>
              </div>
            </div>

            {/* Middle: Live Sensor Telemetry */}
            {activeHyperlocalEvent.telemetry && (
              <div className="flex items-center space-x-4 bg-white/80 border border-slate-200/80 rounded-xl px-3.5 py-2 shadow-xs">
                
                {/* Temperature */}
                <div className="text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Temp</div>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {Math.round(activeHyperlocalEvent.telemetry.temperatureC ?? 0)}°C
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-200"></div>

                {/* Rain */}
                <div className="text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center justify-center space-x-0.5">
                    <Droplets className="w-2.5 h-2.5 text-sky-600" />
                    <span>Rain</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 font-mono">
                    {(activeHyperlocalEvent.telemetry.precipitationMm ?? 0).toFixed(1)} mm
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-200"></div>

                {/* Wind */}
                <div className="text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center justify-center space-x-0.5">
                    <Wind className="w-2.5 h-2.5 text-teal-600" />
                    <span>Wind</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 font-mono">
                    {Math.round(activeHyperlocalEvent.telemetry.windSpeedKmh ?? 0)} km/h
                  </div>
                </div>

                <div className="h-6 w-px bg-slate-200"></div>

                {/* Humidity */}
                <div className="text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center justify-center space-x-0.5">
                    <Gauge className="w-2.5 h-2.5 text-indigo-600" />
                    <span>Humidity</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 font-mono">
                    {Math.round(activeHyperlocalEvent.telemetry.humidityPct ?? 0)}%
                  </div>
                </div>

              </div>
            )}

            {/* Right: Exit / Clear Button */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onClearHyperlocalEvent}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Clear / Reset View</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Permission Request Modal */}
      {isPermissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative space-y-4">
            
            {/* Header with Icon */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Enable My Area Hyperlocal Weather
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Real-time microclimate weather for your neighborhood
                </p>
              </div>
            </div>

            {/* Transparent Explanation */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Private & Client-Side:</strong> CloudNet uses your device GPS strictly to query high-resolution Open-Meteo grid telemetry for your exact area.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Power className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Full Control:</strong> You can turn off location access anytime with a single click on the "Turn OFF" button.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsPermissionModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel / Not Now
              </button>

              <button
                onClick={handleDetectLocation}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 flex items-center space-x-1.5 cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Allow & Detect My Area</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
