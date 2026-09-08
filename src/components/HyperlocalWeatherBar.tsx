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
  Building2,
  Mail,
  LocateFixed,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { WeatherEvent, WeatherMood } from '../types/weather';
import { 
  searchSmallAreas, 
  searchByPinCode,
  reverseGeocodeCoords, 
  fetchLiveCoordinatesWeather, 
  SmallAreaLocation,
  PinCodeLocation
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
  const [activeTab, setActiveTab] = useState<'nearme' | 'pincode' | 'locality'>('nearme');

  // "Near Me" GPS State
  const [isMyAreaEnabled, setIsMyAreaEnabled] = useState<boolean>(() => {
    return localStorage.getItem('cloudnet_my_area_enabled') === 'true';
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);
  const [myAreaName, setMyAreaName] = useState<string>(() => {
    return localStorage.getItem('cloudnet_my_area_name') || '';
  });

  // PIN Code State
  const [pincodeInput, setPincodeInput] = useState<string>('');
  const [isPincodeLoading, setIsPincodeLoading] = useState<boolean>(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  // Locality Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SmallAreaLocation[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Popular Indian PIN codes quick chips
  const POPULAR_PINCODES = [
    { pin: '110001', label: 'New Delhi (CP)' },
    { pin: '400050', label: 'Bandra (Mumbai)' },
    { pin: '560034', label: 'Koramangala (BLR)' },
    { pin: '700001', label: 'Dalhousie (Kolkata)' },
    { pin: '600001', label: 'George Town (Chennai)' },
    { pin: '500001', label: 'Hyderabad GPO' },
    { pin: '302001', label: 'Jaipur Central' }
  ];

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

  // Request & Fetch device location for Near Me
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
            showToast(`📍 Near Me Active: Live weather loaded for ${resolved.name}`);
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
          showToast('Location permission was denied. You can search by PIN code or locality.');
        } else {
          showToast('Unable to retrieve location. Check your GPS signal.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // User clicks the Near Me toggle button
  const handleToggleMyArea = () => {
    if (isMyAreaEnabled) {
      setIsMyAreaEnabled(false);
      localStorage.setItem('cloudnet_my_area_enabled', 'false');
      onClearHyperlocalEvent();
      showToast('Near Me Weather turned OFF. Location access cleared.');
    } else {
      setIsPermissionModalOpen(true);
    }
  };

  // PIN Code search handler
  const handlePincodeSubmit = async (e?: React.FormEvent, directPin?: string) => {
    if (e) e.preventDefault();
    const pin = (directPin || pincodeInput).trim().replace(/\D/g, '');

    if (pin.length !== 6) {
      setPincodeError('Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    setPincodeError(null);
    setIsPincodeLoading(true);

    try {
      const pinResult = await searchByPinCode(pin);
      if (!pinResult) {
        setPincodeError(`Could not find location coordinates for PIN ${pin}.`);
        setIsPincodeLoading(false);
        return;
      }

      const weather = await fetchLiveCoordinatesWeather(
        pinResult.latitude,
        pinResult.longitude,
        `${pinResult.placeName} (PIN ${pin})`,
        pinResult.state
      );

      if (weather) {
        onSelectHyperlocalEvent(weather);
        if (onMoodChange) {
          onMoodChange(weather.category);
        }
        showToast(`📮 Loaded live weather for PIN ${pin} (${pinResult.placeName})`);
      } else {
        setPincodeError(`Could not fetch weather telemetry for PIN ${pin}.`);
      }
    } catch (err) {
      console.error('PIN code weather error:', err);
      setPincodeError('Error fetching PIN code telemetry.');
    } finally {
      setIsPincodeLoading(false);
    }
  };

  // User selects a small area from search
  const handleSelectArea = async (loc: SmallAreaLocation) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    setIsSearching(true);

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
      setIsSearching(false);
    }
  };

  const isHyperlocalActive = !!activeHyperlocalEvent;
  const config = activeHyperlocalEvent 
    ? CATEGORY_CONFIG[activeHyperlocalEvent.category] || CATEGORY_CONFIG.rainfall 
    : null;

  return (
    <section id="hyperlocal-weather-section" className="w-full mb-8 scroll-mt-24">
      <div className="glass-card rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-sky-300/60 bg-gradient-to-br from-white/95 via-sky-50/40 to-white/90 backdrop-blur-xl relative overflow-hidden space-y-5">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-sky-400 via-teal-400 to-blue-500 rounded-full blur-xs"></div>

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div>
            <div className="flex items-center space-x-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
                <Compass className="w-4 h-4 animate-spin-slow" />
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Hyperlocal & Small-Area Weather Radar</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Live 1km Grid
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Search any specific neighborhood, village, 6-digit postal PIN code, or pinpoint your exact GPS location.
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
            
            <button
              onClick={() => setActiveTab('nearme')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'nearme'
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-sky-600" />
              <span>Near Me (GPS)</span>
            </button>

            <button
              onClick={() => setActiveTab('pincode')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pincode'
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>PIN Code</span>
            </button>

            <button
              onClick={() => setActiveTab('locality')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'locality'
                  ? 'bg-white text-sky-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Locality / Suburb</span>
            </button>

          </div>
        </div>

        {/* Tab 1: Near Me (GPS Location) */}
        {activeTab === 'nearme' && (
          <div className="bg-white/90 rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              
              <div className="flex items-center space-x-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md transition-all ${
                  isMyAreaEnabled 
                    ? 'bg-emerald-500 shadow-emerald-500/20' 
                    : 'bg-slate-400'
                }`}>
                  {isLocating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LocateFixed className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">
                      {isMyAreaEnabled ? 'Near Me Weather Active' : 'Near Me Weather (GPS)'}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      isMyAreaEnabled 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isMyAreaEnabled ? 'Connected' : 'Turned OFF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isMyAreaEnabled && myAreaName 
                      ? `Targeting live coordinates at ${myAreaName}. You can turn this off anytime.` 
                      : 'Uses device GPS strictly to retrieve high-resolution 1km atmospheric telemetry for your area.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {isMyAreaEnabled ? (
                  <button
                    onClick={handleToggleMyArea}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <Power className="w-3.5 h-3.5 text-rose-600" />
                    <span>Turn OFF Location Access</span>
                  </button>
                ) : (
                  <button
                    onClick={handleToggleMyArea}
                    disabled={isLocating}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-sky-500/20"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>{isLocating ? 'Detecting GPS...' : 'Detect My Area (Near Me)'}</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: PIN Code Format Search */}
        {activeTab === 'pincode' && (
          <div className="bg-white/90 rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3.5 animate-fadeIn">
            
            <form onSubmit={(e) => handlePincodeSubmit(e)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  maxLength={6}
                  value={pincodeInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPincodeInput(val);
                    if (pincodeError) setPincodeError(null);
                  }}
                  placeholder="Enter 6-digit Indian PIN Code (e.g. 110001, 400050, 560034)..."
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 placeholder-slate-400 tracking-wider transition-all outline-hidden font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isPincodeLoading || pincodeInput.trim().length !== 6}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-amber-600/20 flex-shrink-0"
              >
                {isPincodeLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Fetch PIN Weather</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Banner */}
            {pincodeError && (
              <div className="flex items-center space-x-1.5 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{pincodeError}</span>
              </div>
            )}

            {/* Popular PIN Code Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                Quick Samples:
              </span>
              {POPULAR_PINCODES.map((item) => (
                <button
                  key={item.pin}
                  type="button"
                  onClick={() => {
                    setPincodeInput(item.pin);
                    handlePincodeSubmit(undefined, item.pin);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-800 text-[11px] font-mono font-bold transition-all cursor-pointer shadow-2xs"
                >
                  {item.pin} ({item.label.split(' ')[0]})
                </button>
              ))}
            </div>

          </div>
        )}

        {/* Tab 3: Locality / Suburb Search */}
        {activeTab === 'locality' && (
          <div ref={searchBoxRef} className="bg-white/90 rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3 animate-fadeIn relative">
            
            <div className="relative">
              <Building2 className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search neighborhood, colony, village, taluk or suburb (e.g. Bandra, Whitefield, Rohini, Connaught Place)..."
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-xl pl-10 pr-9 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 transition-all outline-hidden"
              />
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              ) : searchQuery ? (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            {/* Suggestions Dropdown */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Matching Indian Localities:</span>
                  <span className="text-indigo-600">{searchResults.length} places</span>
                </div>
                {searchResults.map((loc) => (
                  <button
                    key={`${loc.id}-${loc.latitude}-${loc.longitude}`}
                    onClick={() => handleSelectArea(loc)}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/80 transition-colors flex items-center justify-between group cursor-pointer border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
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

            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Instant autocomplete powered by high-resolution geographical indices.</span>
            </div>

          </div>
        )}

        {/* Live Weather Spotlight Card (When Any Hyperlocal Location is Active) */}
        {isHyperlocalActive && activeHyperlocalEvent && config && (
          <div className="relative overflow-hidden bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 text-white rounded-2xl p-5 shadow-xl transition-all animate-fadeIn">
            
            {/* Ambient Background Graphic */}
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              
              {/* Left Column: Place Name & Summary */}
              <div className="flex items-start sm:items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-inner flex items-center justify-center text-3xl flex-shrink-0">
                  {config.emoji}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 flex items-center space-x-1">
                      <Navigation className="w-2.5 h-2.5" />
                      <span>Live Microclimate Observation</span>
                    </span>
                    <span className="text-[11px] text-sky-200 font-mono">
                      {activeHyperlocalEvent.latitude.toFixed(3)}°N, {activeHyperlocalEvent.longitude.toFixed(3)}°E
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center space-x-2">
                    <span>{activeHyperlocalEvent.city}</span>
                    {activeHyperlocalEvent.state && (
                      <span className="text-xs font-medium text-sky-200">• {activeHyperlocalEvent.state}</span>
                    )}
                  </h3>

                  <p className="text-xs text-sky-100 mt-1 max-w-xl line-clamp-2">
                    {activeHyperlocalEvent.description}
                  </p>
                </div>
              </div>

              {/* Middle Column: Live Telemetry Grid */}
              {activeHyperlocalEvent.telemetry && (
                <div className="grid grid-cols-4 gap-2.5 bg-black/20 backdrop-blur-md border border-white/15 rounded-2xl p-3 w-full lg:w-auto">
                  
                  {/* Temperature */}
                  <div className="text-center px-2">
                    <div className="text-[9px] uppercase font-bold text-sky-200">Temp</div>
                    <div className="text-base sm:text-lg font-black font-mono">
                      {Math.round(activeHyperlocalEvent.telemetry.temperatureC ?? 0)}°C
                    </div>
                  </div>

                  {/* Precipitation */}
                  <div className="text-center px-2 border-l border-white/10">
                    <div className="text-[9px] uppercase font-bold text-sky-200 flex items-center justify-center space-x-0.5">
                      <Droplets className="w-2.5 h-2.5" />
                      <span>Rain</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-mono">
                      {(activeHyperlocalEvent.telemetry.precipitationMm ?? 0).toFixed(1)} mm
                    </div>
                  </div>

                  {/* Wind */}
                  <div className="text-center px-2 border-l border-white/10">
                    <div className="text-[9px] uppercase font-bold text-sky-200 flex items-center justify-center space-x-0.5">
                      <Wind className="w-2.5 h-2.5" />
                      <span>Wind</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-mono">
                      {Math.round(activeHyperlocalEvent.telemetry.windSpeedKmh ?? 0)} km/h
                    </div>
                  </div>

                  {/* Humidity */}
                  <div className="text-center px-2 border-l border-white/10">
                    <div className="text-[9px] uppercase font-bold text-sky-200 flex items-center justify-center space-x-0.5">
                      <Gauge className="w-2.5 h-2.5" />
                      <span>Humid</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-mono">
                      {Math.round(activeHyperlocalEvent.telemetry.humidityPct ?? 0)}%
                    </div>
                  </div>

                </div>
              )}

              {/* Right Column: Actions */}
              <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-end">
                <button
                  onClick={onClearHyperlocalEvent}
                  className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset / Clear</span>
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Permission Consent Modal for Near Me */}
      {isPermissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative space-y-4">
            
            {/* Header with Icon */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Enable Near Me Hyperlocal Weather
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

    </section>
  );
};
