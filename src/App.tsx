import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { LiveTicker } from './components/LiveTicker';
import { CityGlanceBar } from './components/CityGlanceBar';
import { WeatherMoodBar } from './components/WeatherMoodBar';
import { StatsOverview } from './components/StatsOverview';
import { FilterBar } from './components/FilterBar';
import { MapView } from './components/MapView';
import { LiveFeedList } from './components/LiveFeedList';
import { RightMapPanel } from './components/RightMapPanel';
import { SimulationControls } from './components/SimulationControls';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { AdminPanel } from './components/AdminPanel';
import { MultiSourceFeedsView } from './components/MultiSourceFeedsView';
import { CitizenReportModal } from './components/CitizenReportModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { EventDetailModal } from './components/EventDetailModal';
import { EmergencyHelplineModal } from './components/EmergencyHelplineModal';
import { WeatherAtmosphere } from './components/WeatherAtmosphere';
import { WeatherAIChatbot } from './components/WeatherAIChatbot';
import { HyperlocalWeatherBar } from './components/HyperlocalWeatherBar';
import { MyReports } from './components/MyReports';
import { OfflineEmergencyBanner } from './components/OfflineEmergencyBanner';
import { PrepareOfflineModal } from './components/PrepareOfflineModal';

import { WeatherEvent, FilterState, WeatherMood, EventCategory } from './types/weather';
import { MOOD_THEMES } from './data/initialEvents';
import { getStoredEvents, getAdminAuthState, addEventWithProcessing, batchAddEvents } from './services/storage';
import { useConnectivity, connectivityManager } from './services/connectivityService';
import { offlineStorage, OfflineSnapshot } from './services/offlineStorage';
import { syncQueue } from './services/syncQueue';
import { apiClient } from './services/apiClient';
import { websocketClient } from './services/websocketClient';
import {
  fetchLiveCityWeather,
  fetchAllIndianCitiesLiveWeather,
  reverseGeocodeCoords,
  fetchLiveCoordinatesWeather,
  fetchWeatherBySearch,
  generateSimulatedTweet
} from './services/weatherApi';
import { MAJOR_INDIAN_CITIES, getRandomIndianCity } from './config/india';

export const App: React.FC = () => {
  const [events, setEvents] = useState<WeatherEvent[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeMood, setActiveMood] = useState<WeatherMood>('default');
  
  const [filter, setFilter] = useState<FilterState>({
    searchQuery: '',
    categories: [],
    sources: [],
    verificationStatuses: [],
    stateFilter: 'All States',
    cityFilter: '',
    dateRange: 'all',
    severityLevels: []
  });

  const [selectedEvent, setSelectedEvent] = useState<WeatherEvent | null>(null);
  const [inspectedEvent, setInspectedEvent] = useState<WeatherEvent | null>(null);
  
  const [isCitizenModalOpen, setIsCitizenModalOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isHelplinesModalOpen, setIsHelplinesModalOpen] = useState(false);
  const [isPrepareModalOpen, setIsPrepareModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeHyperlocalEvent, setActiveHyperlocalEvent] = useState<WeatherEvent | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Weather Search On-Demand State (Right of Map)
  const [searchedWeather, setSearchedWeather] = useState<WeatherEvent | null>(null);
  const [isSearchingWeather, setIsSearchingWeather] = useState<boolean>(false);
  const [weatherSearchError, setWeatherSearchError] = useState<string | null>(null);
  const [citizenModalPrefill, setCitizenModalPrefill] = useState<{ city: string; lat: number; lng: number } | null>(null);

  // Disaster Offline Resilience State
  const { status: connStatus, isOffline, isDegraded, checkReachability } = useConnectivity();
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflineSnapshot | null>(null);
  const [isEmergencyView, setIsEmergencyView] = useState<boolean>(false);
  const [isLowBandwidth, setIsLowBandwidth] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cloudnet_low_bandwidth') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleLowBandwidth = () => {
    setIsLowBandwidth(prev => {
      const next = !prev;
      try {
        localStorage.setItem('cloudnet_low_bandwidth', next ? 'true' : 'false');
      } catch {}
      showToast(next ? '⚡ Low-Bandwidth Mode ON: Particle canvas & background polls paused' : 'Standard Bandwidth Mode restored');
      return next;
    });
  };

  // Load offline snapshot on mount and when offline status changes
  useEffect(() => {
    offlineStorage.getOfflineSnapshot().then(snap => setOfflineSnapshot(snap));
  }, [isOffline]);

  // Listen for background report upload completions
  useEffect(() => {
    const handleSynced = (e: any) => {
      const count = e.detail?.count || 1;
      showToast(`⚡ Connection Restored: ${count} citizen report${count > 1 ? 's' : ''} synchronized successfully!`);
      setEvents(getStoredEvents());
    };
    window.addEventListener('cloudnet_reports_synced', handleSynced);
    return () => window.removeEventListener('cloudnet_reports_synced', handleSynced);
  }, []);

  // Track sidebar collapsed width for main content offset
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const small = window.innerWidth < 768;
      setIsMobile(small);
      if (small) setSidebarCollapsed(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSelectHyperlocalEvent = (newEvent: WeatherEvent) => {
    setActiveHyperlocalEvent(newEvent);
    setSelectedEvent(newEvent);
    setActiveMood(newEvent.category);
    addEventWithProcessing(newEvent);
    setEvents(getStoredEvents());
  };

  const handleClearHyperlocalEvent = () => {
    setActiveHyperlocalEvent(null);
    setSelectedEvent(null);
    setActiveMood('default');
  };

  const handleSearchWeather = async (query: string) => {
    if (!query || query.trim().length < 2) return;
    setIsSearchingWeather(true);
    setWeatherSearchError(null);

    try {
      showToast(`🔍 Fetching live weather observation for "${query}"...`);
      const weather = await fetchWeatherBySearch(query);
      if (weather) {
        setSearchedWeather(weather);
        setSelectedEvent(weather);
        setActiveMood(weather.category);
        
        // Ingest into processed events repository so it renders on map
        addEventWithProcessing(weather);
        setEvents(getStoredEvents());
        showToast(`✓ Weather loaded: ${weather.city} (${weather.telemetry?.temperatureC?.toFixed(1) ?? '--'}°C)`);
      } else {
        setWeatherSearchError(`No weather station found for "${query}". Try an Indian city name or 6-digit PIN code.`);
        showToast(`Could not find weather for "${query}"`);
      }
    } catch (err: any) {
      setWeatherSearchError(`Failed to fetch weather: ${err?.message || 'Network error'}`);
    } finally {
      setIsSearchingWeather(false);
    }
  };

  const handleClearSearchedWeather = () => {
    setSearchedWeather(null);
    setWeatherSearchError(null);
  };

  const handleOpenReportModalWithLocation = (loc: { city: string; lat: number; lng: number }) => {
    setCitizenModalPrefill(loc);
    setIsCitizenModalOpen(true);
  };

  const handleMapClickCoords = async (lat: number, lng: number) => {
    try {
      showToast(`📍 Analyzing microclimate coordinates [${lat.toFixed(3)}°, ${lng.toFixed(3)}°]...`);
      const resolved = await reverseGeocodeCoords(lat, lng);
      const weather = await fetchLiveCoordinatesWeather(lat, lng, resolved.name, resolved.state);
      if (weather) {
        handleSelectHyperlocalEvent(weather);
        showToast(`📍 Pinpoint weather loaded for ${resolved.name}`);
      }
    } catch (e) {
      console.error('Map click weather fetch error:', e);
    }
  };

  // Initialize data and listeners with 100% Real-World Live Data Sync
  useEffect(() => {
    const loaded = getStoredEvents();
    setEvents(loaded);
    setIsAdminAuthenticated(getAdminAuthState());

    // Connect to CloudNet WebSocket streaming service
    websocketClient.connect();

    const unsubWsEvent = websocketClient.onEvent((incoming) => {
      setEvents((prev) => {
        const exists = prev.some((e) => e.id === incoming.id);
        const updated = exists ? prev.map((e) => (e.id === incoming.id ? incoming : e)) : [incoming, ...prev];
        return updated;
      });
      showToast(`⚡ Real-Time Stream: New ${incoming.category} event verified in ${incoming.city}`);
    });

    const unsubWsOverride = websocketClient.onStatusOverride(({ eventId, newStatus, confidence, reason }) => {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === eventId) {
            return {
              ...e,
              verificationStatus: newStatus.toLowerCase() as any,
              confidenceScore: confidence,
              flagReason: reason,
            };
          }
          return e;
        })
      );
      showToast(`🛡️ Officer Override: Event ${eventId.slice(0, 8)} updated to ${newStatus}`);
    });

    // Attempt backend initial sync
    apiClient.getEvents({ limit: 100 }).then((backendEvents) => {
      if (backendEvents && backendEvents.length > 0) {
        setEvents(backendEvents);
      }
    }).catch(() => {});

    const handleCustomEvents = (e: any) => {
      if (e.detail) {
        setEvents(e.detail);
      }
    };

    window.addEventListener('cloudnet_events_updated', handleCustomEvents);

    // Initial 100% Live Sync: Pull real-world telemetry from all Indian meteorological stations
    const syncAllLiveWeather = async (isInitial = false) => {
      // If currently offline or in low bandwidth mode, avoid unnecessary network floods
      if (connectivityManager.getEffectiveStatus() === 'offline' || isLowBandwidth) {
        if (isInitial) setIsInitialLoading(false);
        return;
      }

      try {
        const liveCitiesData = await fetchAllIndianCitiesLiveWeather();
        if (liveCitiesData.length > 0) {
          batchAddEvents(liveCitiesData);
          if (isInitial) {
            showToast(`⚡ Live Sync Active: Connected to ${liveCitiesData.length} Indian Weather Stations`);
          }
        }
      } catch (e) {
        console.warn('Live API auto-sync attempt failed:', e);
      } finally {
        if (isInitial) setIsInitialLoading(false);
      }
    };

    // Immediately trigger initial sync — clears loading state when done
    syncAllLiveWeather(true);

    // Auto-poll live sensor telemetry every 45 seconds (only when online and not in low-bandwidth mode)
    const interval = setInterval(() => syncAllLiveWeather(false), 45000);

    return () => {
      window.removeEventListener('cloudnet_events_updated', handleCustomEvents);
      clearInterval(interval);
      unsubWsEvent();
      unsubWsOverride();
    };
  }, [isLowBandwidth]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleNewEvent = (newEvent: WeatherEvent, msg?: string) => {
    setEvents(getStoredEvents());
    if (msg) {
      showToast(msg);
    }
  };

  const handleSelectEvent = (event: WeatherEvent) => {
    setSelectedEvent(event);
    setActiveMood(event.category);
  };

  const handleFocusCity = (cityName: string) => {
    const matched = events.find(e => e.city.toLowerCase() === cityName.toLowerCase());
    if (matched) {
      setSelectedEvent(matched);
      setActiveMood(matched.category);
    } else {
      const cityData = MAJOR_INDIAN_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
      if (cityData) {
        setSelectedEvent({
          id: `temp-city-${cityName}`,
          source: 'api',
          sourceAuthor: 'IMD Observation',
          timestamp: new Date().toISOString(),
          city: cityData.name,
          state: cityData.state,
          latitude: cityData.lat,
          longitude: cityData.lng,
          category: 'rainfall',
          severity: 'moderate',
          title: `Weather Status for ${cityData.name}`,
          description: `Observation center located in ${cityData.name}, ${cityData.state}.`,
          verificationStatus: 'verified',
          confidenceScore: 90
        });
      }
    }
    setActiveTab('dashboard');
  };

  // Filter application
  const filteredEvents = events.filter(e => {
    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      const match =
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.state.toLowerCase().includes(q) ||
        e.sourceAuthor.toLowerCase().includes(q) ||
        (e.hashtags && e.hashtags.some(h => h.toLowerCase().includes(q)));
      if (!match) return false;
    }

    if (filter.categories.length > 0 && !filter.categories.includes(e.category)) {
      return false;
    }

    if (filter.sources.length > 0 && !filter.sources.includes(e.source)) {
      return false;
    }

    if (filter.verificationStatuses.length > 0 && !filter.verificationStatuses.includes(e.verificationStatus)) {
      return false;
    }

    if (filter.stateFilter !== 'All States' && e.state !== filter.stateFilter) {
      return false;
    }

    if (filter.dateRange !== 'all') {
      const eventTime = new Date(e.timestamp).getTime();
      const now = Date.now();
      if (filter.dateRange === '24h' && now - eventTime > 24 * 60 * 60 * 1000) return false;
      if (filter.dateRange === '7d' && now - eventTime > 7 * 24 * 60 * 60 * 1000) return false;
      if (filter.dateRange === 'today') {
        const todayStr = new Date().toDateString();
        const eventDateStr = new Date(e.timestamp).toDateString();
        if (todayStr !== eventDateStr) return false;
      }
    }

    return true;
  });

  const currentTheme = MOOD_THEMES[activeMood] || MOOD_THEMES.default;

  // Sidebar width for margin offset — synced with CSS transition
  const mainMargin = isMobile ? 'ml-0 mt-14' : sidebarCollapsed ? 'ml-16' : 'ml-56';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.bgGradient} transition-colors duration-700 font-sans text-slate-900 selection:bg-sky-500 selection:text-white relative`}>

      {/* ── Initial Live Sync Loading Skeleton ─────────────────────────────── */}
      {isInitialLoading && (
        <div className="fixed inset-0 z-[999] bg-gradient-to-br from-sky-50 via-slate-100 to-blue-50 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center space-y-6 max-w-sm text-center px-6">
            {/* Animated logo pulse */}
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-xl animate-pulse">
                <span className="text-3xl">🌩️</span>
              </div>
              <div className="absolute -inset-2 rounded-3xl border-2 border-sky-400/40 animate-ping" />
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">CloudNet</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Connecting to Indian Weather Stations…
              </p>
            </div>

            {/* Shimmer progress bar */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-[length:200%_100%]" />
            </div>

            {/* Station pulse list */}
            <div className="w-full space-y-2">
              {['Open-Meteo API Network', 'IMD Station Telemetry', 'Geospatial Index', 'AI Verification Engine'].map((label, i) => (
                <div
                  key={label}
                  className="flex items-center space-x-3 bg-white/70 px-4 py-2.5 rounded-xl border border-slate-200/80"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                  <span className="ml-auto text-[10px] text-slate-400 font-mono">LIVE</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400">
              Fetching real-time data from 40+ Indian cities via Open-Meteo
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Ambient Atmosphere Light Glow */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0"
        style={{
          background: activeMood === 'rainfall'
            ? 'radial-gradient(circle at 50% 10%, rgba(2, 132, 199, 0.12) 0%, transparent 70%)'
            : activeMood === 'thunderstorm'
            ? 'radial-gradient(circle at 50% 10%, rgba(124, 58, 237, 0.15) 0%, transparent 70%)'
            : activeMood === 'heatwave'
            ? 'radial-gradient(circle at 50% 10%, rgba(234, 88, 12, 0.15) 0%, transparent 70%)'
            : activeMood === 'flooding'
            ? 'radial-gradient(circle at 50% 10%, rgba(3, 105, 161, 0.15) 0%, transparent 70%)'
            : activeMood === 'fog'
            ? 'radial-gradient(circle at 50% 10%, rgba(100, 116, 139, 0.15) 0%, transparent 70%)'
            : activeMood === 'dust storm'
            ? 'radial-gradient(circle at 50% 10%, rgba(202, 138, 4, 0.15) 0%, transparent 70%)'
            : activeMood === 'strong wind'
            ? 'radial-gradient(circle at 50% 10%, rgba(13, 148, 136, 0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.1) 0%, transparent 60%)'
        }}
      />

      {/* Dynamic Animated Atmospheric Weather Canvas (Disabled in Low-Bandwidth Mode) */}
      {!isLowBandwidth && <WeatherAtmosphere mood={activeMood} />}


      {/* ── Left Sidebar ─────────────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }}
        onOpenCitizenModal={() => setIsCitizenModalOpen(true)}
        onOpenAdminLoginModal={() => setIsAdminLoginModalOpen(true)}
        onOpenHelplinesModal={() => setIsHelplinesModalOpen(true)}
        onOpenPrepareModal={() => setIsPrepareModalOpen(true)}
        isAdminAuthenticated={isAdminAuthenticated}
        setIsAdminAuthenticated={setIsAdminAuthenticated}
        activeMood={activeMood}
        setActiveMood={setActiveMood}
        totalEventsCount={events.length}
      />

      {/* ── Main Content (offset by sidebar width) ─────────────── */}
      <div className={`transition-all duration-250 ease-in-out ${mainMargin} min-h-screen flex flex-col`}>

        {/* Offline Disaster Emergency Banner */}
        <OfflineEmergencyBanner
          status={connStatus}
          snapshot={offlineSnapshot}
          onOpenHelplinesModal={() => setIsHelplinesModalOpen(true)}
          onOpenCitizenModal={() => setIsCitizenModalOpen(true)}
          onOpenPrepareModal={() => setIsPrepareModalOpen(true)}
          isEmergencyView={isEmergencyView}
          onToggleEmergencyView={() => setIsEmergencyView((v) => !v)}
          isLowBandwidth={isLowBandwidth}
          onToggleLowBandwidth={handleToggleLowBandwidth}
          onCheckReachability={() => checkReachability()}
        />

        {/* Breaking Ticker — full width of content area */}
        <LiveTicker 
          events={events} 
          onSelectEvent={(e) => {
            setSelectedEvent(e);
            setInspectedEvent(e);
            setActiveMood(e.category);
          }} 
        />

        {/* Main Container */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          
          {/* Quick Metro Glance Bar (Hidden in Minimal Emergency View) */}
          {!isEmergencyView && (
            <CityGlanceBar
              events={events}
              onSelectCity={handleFocusCity}
              onMoodChange={(mood) => setActiveMood(mood)}
            />
          )}

          {/* Dynamic Weather Mood Bar (Hidden in Minimal Emergency View) */}
          {!isEmergencyView && (
            <WeatherMoodBar
              activeMood={activeMood}
              onSelectMood={(mood) => {
                setActiveMood(mood);
                if (mood !== 'default') {
                  setFilter(prev => ({
                    ...prev,
                    categories: [mood]
                  }));
                } else {
                  setFilter(prev => ({
                    ...prev,
                    categories: []
                  }));
                }
              }}
            />
          )}

          {/* View 1: Main Dashboard (Interactive Map + Live Feed) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">

              {/* Minimal Emergency Cockpit Header when Emergency View is active */}
              {isEmergencyView && (
                <div className="p-4 rounded-3xl bg-amber-500/15 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div>
                    <h2 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                      <span>🚨 Minimal Disaster Response View Active</span>
                    </h2>
                    <p className="text-slate-600 mt-0.5">
                      Secondary analytics and test controls suspended to prioritize battery life and critical local disaster triage.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsCitizenModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-xs cursor-pointer"
                    >
                      Report Incident
                    </button>
                    <button
                      onClick={() => setIsHelplinesModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-xs cursor-pointer"
                    >
                      Emergency 112
                    </button>
                  </div>
                </div>
              )}
              
              {/* Hyperlocal Small Area & "My Area" Weather Bar */}
              <HyperlocalWeatherBar
                activeHyperlocalEvent={activeHyperlocalEvent}
                onSelectHyperlocalEvent={handleSelectHyperlocalEvent}
                onClearHyperlocalEvent={handleClearHyperlocalEvent}
                onMoodChange={(mood) => setActiveMood(mood)}
                showToast={showToast}
              />

              {/* KPI Stats Overview (Hidden in Minimal Emergency View) */}
              {!isEmergencyView && <StatsOverview events={events} />}

              {/* Testbed Live Ingestion Toolbar (Hidden in Minimal Emergency View) */}
              {!isEmergencyView && <SimulationControls onNewEvent={handleNewEvent} />}

              {/* Filter Bar with 7 Categories & Search (Hidden in Minimal Emergency View) */}
              {!isEmergencyView && (
                <FilterBar
                  filter={filter}
                  setFilter={setFilter}
                  totalMatches={filteredEvents.length}
                  onCategorySelected={(cat) => setActiveMood(cat)}
                  onSearchWeather={handleSearchWeather}
                />
              )}

              {/* Map & Live Weather / Streaming Feed Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Interactive CartoDB Leaflet Map */}
                <div className="lg:col-span-8">
                  <MapView
                    events={filteredEvents}
                    selectedEvent={selectedEvent}
                    onSelectEvent={handleSelectEvent}
                    onOpenDetails={(e) => setInspectedEvent(e)}
                    onOpenReportModal={() => setIsCitizenModalOpen(true)}
                    onMoodChange={(mood) => setActiveMood(mood)}
                    onMapClickCoords={handleMapClickCoords}
                  />
                </div>

                {/* Right of Map: Live Weather Search & Streaming Incident Feed */}
                <div className="lg:col-span-4">
                  <RightMapPanel
                    events={filteredEvents}
                    selectedEvent={selectedEvent}
                    searchedWeather={searchedWeather}
                    isSearching={isSearchingWeather}
                    searchError={weatherSearchError}
                    onSearch={handleSearchWeather}
                    onSelectEvent={handleSelectEvent}
                    onOpenDetails={(e) => setInspectedEvent(e)}
                    onOpenReportModalWithLocation={handleOpenReportModalWithLocation}
                    onMoodChange={(mood) => setActiveMood(mood)}
                    onClearSearchedWeather={handleClearSearchedWeather}
                  />
                </div>

              </div>

            </div>
          )}

          {/* View 2: Analytics & Trends */}
          {activeTab === 'analytics' && (
            <AnalyticsCharts events={events} />
          )}

          {/* View 3: Admin Moderation Console */}
          {activeTab === 'admin' && (
            <AdminPanel
              events={events}
              setEvents={setEvents}
              isAdminAuthenticated={isAdminAuthenticated}
              setIsAdminAuthenticated={setIsAdminAuthenticated}
              onOpenLoginModal={() => setIsAdminLoginModalOpen(true)}
              onInspectEvent={(e) => setInspectedEvent(e)}
            />
          )}

          {/* View 4: Multi-Source Feeds Pipeline */}
          {activeTab === 'feeds' && (
            <MultiSourceFeedsView
              events={events}
              onTriggerTweet={() => {
                // Dynamic: generates a random-city tweet — no hardcoded city/coords
                const tweet = generateSimulatedTweet();
                const res = addEventWithProcessing(tweet);
                handleNewEvent(res.event, `Twitter #IMD Ingestion: ${res.event.city}`);
              }}
              onTriggerApiFetch={async () => {
                const randomCity = getRandomIndianCity();
                const liveData = await fetchLiveCityWeather(randomCity);
                if (liveData) {
                  const res = addEventWithProcessing(liveData);
                  handleNewEvent(res.event, `Open-Meteo Synop synced for ${randomCity.name}`);
                }
              }}
            />
          )}

          {/* View 5: My Reports — user's personal submission history */}
          {activeTab === 'myreports' && (
            <MyReports
              onOpenCitizenModal={() => setIsCitizenModalOpen(true)}
              onInspectEvent={(e) => setInspectedEvent(e)}
            />
          )}

        </main>

        {/* Footer */}
        <footer className="w-full bg-white/70 backdrop-blur-md border-t border-slate-200/80 py-6 mt-12 text-center text-xs text-slate-500 font-medium">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900">CloudNet</span>
              <span>•</span>
              <span>National Weather Observation & AI Verification Platform</span>
            </div>
            <div>
              Data Sources: Open-Meteo API • Twitter / X Stream #IMD • Citizen Crowdsourcing
            </div>
          </div>
        </footer>

      </div>{/* end main content */}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-bounce border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-sky-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Citizen Report Modal */}
      <CitizenReportModal
        isOpen={isCitizenModalOpen}
        onClose={() => {
          setIsCitizenModalOpen(false);
          setCitizenModalPrefill(null);
        }}
        onReportSubmitted={(newEvent) => {
          handleNewEvent(newEvent, 'Citizen Report submitted and verified by AI.');
        }}
        onMoodChange={(mood) => setActiveMood(mood)}
        prefilledLocation={citizenModalPrefill}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={() => {
          setIsAdminAuthenticated(true);
          showToast('Officer authentication successful.');
        }}
      />

      {/* Emergency Helplines Modal */}
      <EmergencyHelplineModal
        isOpen={isHelplinesModalOpen}
        onClose={() => setIsHelplinesModalOpen(false)}
      />

      {/* Prepare Offline Area Modal */}
      <PrepareOfflineModal
        isOpen={isPrepareModalOpen}
        onClose={() => setIsPrepareModalOpen(false)}
        onPrepared={(snap) => {
          setOfflineSnapshot(snap);
          showToast(`✓ Local emergency data cached for ${snap.location.city} (${snap.location.radiusKm} km radius)`);
        }}
      />

      {/* Event Details Drawer Modal */}
      <EventDetailModal
        event={inspectedEvent}
        onClose={() => setInspectedEvent(null)}
      />

      {/* AI Weather Copilot Chatbot */}
      <WeatherAIChatbot
        events={events}
        onSelectEvent={handleSelectEvent}
        onFilterCategory={(cat: EventCategory) => {
          setFilter(prev => ({ ...prev, categories: [cat] }));
          setActiveMood(cat);
          setActiveTab('dashboard');
        }}
        onFocusCity={handleFocusCity}
        onMoodChange={(mood) => setActiveMood(mood)}
      />

    </div>
  );
};

export default App;
