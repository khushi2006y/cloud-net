import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { LiveTicker } from './components/LiveTicker';
import { CityGlanceBar } from './components/CityGlanceBar';
import { WeatherMoodBar } from './components/WeatherMoodBar';
import { StatsOverview } from './components/StatsOverview';
import { FilterBar } from './components/FilterBar';
import { MapView } from './components/MapView';
import { LiveFeedList } from './components/LiveFeedList';
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

import { WeatherEvent, FilterState, WeatherMood, EventCategory } from './types/weather';
import { MOOD_THEMES } from './data/initialEvents';
import { getStoredEvents, getAdminAuthState, addEventWithProcessing, batchAddEvents } from './services/storage';
import {
  fetchLiveCityWeather,
  fetchAllIndianCitiesLiveWeather,
  reverseGeocodeCoords,
  fetchLiveCoordinatesWeather,
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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeHyperlocalEvent, setActiveHyperlocalEvent] = useState<WeatherEvent | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

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

    const handleCustomEvents = (e: any) => {
      if (e.detail) {
        setEvents(e.detail);
      }
    };

    window.addEventListener('cloudnet_events_updated', handleCustomEvents);

    // Initial 100% Live Sync: Pull real-world telemetry from all Indian meteorological stations
    const syncAllLiveWeather = async (isInitial = false) => {
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

    // Auto-poll live sensor telemetry every 45 seconds
    const interval = setInterval(() => syncAllLiveWeather(false), 45000);

    return () => {
      window.removeEventListener('cloudnet_events_updated', handleCustomEvents);
      clearInterval(interval);
    };
  }, []);

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

      {/* Dynamic Animated Atmospheric Weather Canvas */}
      <WeatherAtmosphere mood={activeMood} />


      {/* ── Left Sidebar ─────────────────────────────────────── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // Track collapse state by listening to sidebar's internal toggle
        }}
        onOpenCitizenModal={() => setIsCitizenModalOpen(true)}
        onOpenAdminLoginModal={() => setIsAdminLoginModalOpen(true)}
        onOpenHelplinesModal={() => setIsHelplinesModalOpen(true)}
        isAdminAuthenticated={isAdminAuthenticated}
        setIsAdminAuthenticated={setIsAdminAuthenticated}
        activeMood={activeMood}
        setActiveMood={setActiveMood}
        totalEventsCount={events.length}
      />

      {/* ── Main Content (offset by sidebar width) ─────────────── */}
      <div className={`transition-all duration-250 ease-in-out ${mainMargin} min-h-screen flex flex-col`}>

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
          
          {/* Quick Metro Glance Bar */}
          <CityGlanceBar
            events={events}
            onSelectCity={handleFocusCity}
            onMoodChange={(mood) => setActiveMood(mood)}
          />

          {/* Dynamic Weather Mood Bar */}
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

          {/* View 1: Main Dashboard (Interactive Map + Live Feed) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Hyperlocal Small Area & "My Area" Weather Bar */}
              <HyperlocalWeatherBar
                activeHyperlocalEvent={activeHyperlocalEvent}
                onSelectHyperlocalEvent={handleSelectHyperlocalEvent}
                onClearHyperlocalEvent={handleClearHyperlocalEvent}
                onMoodChange={(mood) => setActiveMood(mood)}
                showToast={showToast}
              />

              {/* KPI Stats Overview */}
              <StatsOverview events={events} />

              {/* Testbed Live Ingestion Toolbar */}
              <SimulationControls onNewEvent={handleNewEvent} />

              {/* Filter Bar with 7 Categories & Search */}
              <FilterBar
                filter={filter}
                setFilter={setFilter}
                totalMatches={filteredEvents.length}
                onCategorySelected={(cat) => setActiveMood(cat)}
              />

              {/* Map & Live Feed Split View */}
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

                {/* Real-time Streaming Feed List */}
                <div className="lg:col-span-4">
                  <LiveFeedList
                    events={filteredEvents}
                    selectedEvent={selectedEvent}
                    onSelectEvent={handleSelectEvent}
                    onOpenDetails={(e) => setInspectedEvent(e)}
                    onMoodChange={(mood) => setActiveMood(mood)}
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
        onClose={() => setIsCitizenModalOpen(false)}
        onReportSubmitted={(newEvent) => {
          handleNewEvent(newEvent, 'Citizen Report submitted and verified by AI.');
        }}
        onMoodChange={(mood) => setActiveMood(mood)}
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
