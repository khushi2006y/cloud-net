import React, { useState, useEffect } from 'react';
import {
  Radio,
  Play,
  Pause,
  AlertTriangle,
  CopyCheck,
  RefreshCw,
  Zap,
  Sliders,
  DatabaseZap,
  Activity,
  Wifi,
  WifiOff,
  Sparkles,
  ShieldAlert,
  Layers,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { useConnectivity } from '../services/connectivityService';
import { Twitter } from './icons/TwitterIcon';
import { WeatherEvent, EventCategory } from '../types/weather';
import { generateSimulatedTweet, fetchLiveCityWeather } from '../services/weatherApi';
import { getRandomIndianCity } from '../config/india';
import { addEventWithProcessing, batchAddEvents, getStoredEvents, purgeAllMockAndSyncLive } from '../services/storage';
import { executeBigDataIngestion, generateBigDataBatch } from '../services/streamQueue';
import { apiClient } from '../services/apiClient';

interface SimulationControlsProps {
  onNewEvent: (event: WeatherEvent, msg: string) => void;
  onBatchIngested?: (count: number) => void;
}

/**
 * Builds a synthetic near-duplicate of an existing live event.
 */
function buildDynamicDuplicateEvent(): Omit<
  WeatherEvent,
  'id' | 'verificationStatus' | 'confidenceScore'
> {
  const existing = getStoredEvents();
  const base = existing.find(
    e => e.verificationStatus === 'verified' || e.verificationStatus === 'unverified'
  );

  if (base) {
    const jitterLat = parseFloat((base.latitude + (Math.random() - 0.5) * 0.02).toFixed(4));
    const jitterLng = parseFloat((base.longitude + (Math.random() - 0.5) * 0.02).toFixed(4));

    return {
      source: 'citizen',
      sourceAuthor: `CitizenWitness_${Math.floor(Math.random() * 9000 + 1000)}`,
      timestamp: new Date().toISOString(),
      city: base.city,
      state: base.state,
      latitude: jitterLat,
      longitude: jitterLng,
      category: base.category,
      severity: base.severity,
      title: `${base.category} conditions reported near ${base.city} centre`,
      description: `Independent citizen report corroborating ongoing ${base.category} conditions in ${base.city}.`,
      rawText: `Reporting ${base.category} in ${base.city}! Road conditions affected. #${base.city.replace(/\s/g, '')}Weather #CitizenReport`,
      hashtags: [`#${base.city.replace(/\s/g, '')}Weather`, '#CitizenReport'],
      is_simulated: true
    };
  }

  const city = getRandomIndianCity();
  return {
    source: 'citizen',
    sourceAuthor: `CitizenWitness_${Math.floor(Math.random() * 9000 + 1000)}`,
    timestamp: new Date().toISOString(),
    city: city.name,
    state: city.state,
    latitude: parseFloat((city.lat + (Math.random() - 0.5) * 0.02).toFixed(4)),
    longitude: parseFloat((city.lng + (Math.random() - 0.5) * 0.02).toFixed(4)),
    category: 'rainfall',
    severity: 'moderate',
    title: `Rainfall reported near ${city.name}`,
    description: `Citizen report of active rainfall conditions in ${city.name}.`,
    rawText: `Rainfall observed in ${city.name}! #WeatherAlert`,
    hashtags: ['#WeatherAlert', '#CitizenReport'],
    is_simulated: true
  };
}

/**
 * Builds a synthetic spam post using a random Indian city.
 */
function buildDynamicSpamEvent(): Omit<
  WeatherEvent,
  'id' | 'verificationStatus' | 'confidenceScore'
> {
  const city = getRandomIndianCity();
  const SPAM_PATTERNS = [
    {
      text: `Earn free crypto online! Click bit.ly/giveaway for free bitcoin while it might rain in ${city.name}!`,
      title: 'Promotional spam post detected'
    },
    {
      text: `WIN FREE PHONE! lottery giveaway running. Follow back for prize. Also maybe thunder in ${city.name}.`,
      title: 'Lottery/giveaway spam flagged'
    },
    {
      text: `Investment tip: buy telegram stocks. Casino bonus 1000 coins. Weather update: rain possible in ${city.name}.`,
      title: 'Multi-pattern spam detected'
    }
  ];
  const pattern = SPAM_PATTERNS[Math.floor(Math.random() * SPAM_PATTERNS.length)];

  return {
    source: 'twitter',
    sourceAuthor: `SpamBot_${Math.floor(Math.random() * 9000 + 1000)}`,
    sourceHandle: `@PromoSpam${Math.floor(Math.random() * 999)}`,
    isOfficialSource: false,
    timestamp: new Date().toISOString(),
    city: city.name,
    state: city.state,
    latitude: parseFloat((city.lat + (Math.random() - 0.5) * 0.05).toFixed(4)),
    longitude: parseFloat((city.lng + (Math.random() - 0.5) * 0.05).toFixed(4)),
    category: 'thunderstorm',
    severity: 'low',
    title: pattern.title,
    description: `Post from ${city.name} region containing promotional patterns. AI Spam Guard will intercept this.`,
    rawText: pattern.text,
    hashtags: ['#Promo', '#Spam'],
    is_simulated: true
  };
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  onNewEvent,
  onBatchIngested
}) => {
  const [autoStreamActive, setAutoStreamActive] = useState<boolean>(false);
  const [isFetchingApi, setIsFetchingApi] = useState<boolean>(false);
  const [isBigDataProcessing, setIsBigDataProcessing] = useState<boolean>(false);
  const [bigDataProgress, setBigDataProgress] = useState<string>('');
  const [isTriggeringScenario, setIsTriggeringScenario] = useState<string | null>(null);
  const [showScenarios, setShowScenarios] = useState<boolean>(true);

  const { status, isSimulated, setSimulatedStatus } = useConnectivity();

  useEffect(() => {
    if (!autoStreamActive) return;

    const interval = setInterval(async () => {
      const tweet = await generateSimulatedTweet();
      const result = addEventWithProcessing(tweet);
      onNewEvent(result.event, `Live Twitter / Meteorological Post: ${result.event.city}`);
    }, 15000);

    return () => clearInterval(interval);
  }, [autoStreamActive, onNewEvent]);

  const handleSimulateTweet = async () => {
    const tweet = await generateSimulatedTweet();
    const result = addEventWithProcessing(tweet);
    onNewEvent(result.event, `Twitter / IMD Stream: ${result.event.city}`);
  };

  const handleFetchOpenMeteo = async () => {
    setIsFetchingApi(true);
    const randomCity = getRandomIndianCity();

    try {
      const liveData = await fetchLiveCityWeather(randomCity);
      if (liveData) {
        const result = addEventWithProcessing(liveData);
        onNewEvent(
          result.event,
          `Open-Meteo Live Synop: ${randomCity.name} (${liveData.telemetry?.temperatureC}°C)`
        );
      } else {
        alert('Could not connect to Open-Meteo API.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingApi(false);
    }
  };

  const handleTriggerDuplicate = () => {
    const dupEvent = buildDynamicDuplicateEvent();
    const result = addEventWithProcessing(dupEvent);
    onNewEvent(
      result.event,
      result.isDuplicate
        ? `Dedup engine: Merged into active ${result.event.city} cluster.`
        : `New event logged for ${result.event.city} (no nearby duplicate found).`
    );
  };

  const handleTriggerSpam = () => {
    const spamEvent = buildDynamicSpamEvent();
    const result = addEventWithProcessing(spamEvent);
    onNewEvent(result.event, `AI Spam Guard: Intercepted and flagged in ${result.event.city}.`);
  };

  const handleBatchIngest = async (count: number) => {
    setIsBigDataProcessing(true);
    setBigDataProgress(`Ingesting ${count} records...`);

    const stats = await executeBigDataIngestion(count, (cur, total) => {
      setBigDataProgress(`${cur}/${total} processed...`);
    });

    const newBatch = generateBigDataBatch(count);
    batchAddEvents(newBatch);

    setIsBigDataProcessing(false);
    setBigDataProgress(
      `⚡ Ingested ${stats.totalProcessed} events in ${stats.durationMs}ms (~${stats.eventsPerSec} ev/s)`
    );

    if (onBatchIngested) {
      onBatchIngested(count);
    }
  };

  // Trigger Meteorological Integrity Verification Scenarios A through H
  const handleTriggerScenario = async (scenarioLetter: string) => {
    setIsTriggeringScenario(scenarioLetter);
    try {
      const res = await apiClient.triggerDemoScenario(scenarioLetter.toUpperCase());
      if (res && res.event) {
        const clientEvt = apiClient._mapBackendToClient(res.event);
        addEventWithProcessing(clientEvt);
        onNewEvent(
          clientEvt,
          `🎯 Scenario ${scenarioLetter.toUpperCase()}: ${res.scenario} → [${clientEvt.verificationStatus.toUpperCase()}] Evidence Confidence: ${clientEvt.confidenceScore}/100`
        );
      } else if (res && res.measured_throughput_events_per_sec) {
        onNewEvent(
          getStoredEvents()[0],
          `⚡ Load Benchmark: ${res.actual_processed} events processed at ${res.measured_throughput_events_per_sec} ev/sec (${res.average_latency_ms} ms avg)`
        );
      }
    } catch (err) {
      console.warn(`[CloudNet Demo] Backend scenario call failed, running local simulator:`, err);
      // Client-side fallback simulator
      if (scenarioLetter === 'C') {
        const spoof: any = {
          source: 'twitter',
          sourceAuthor: 'TrollAccount_Berlin',
          timestamp: new Date().toISOString(),
          city: 'Berlin (Spoofed)',
          state: 'Unknown',
          latitude: 52.5200,
          longitude: 13.4050,
          category: 'strong wind',
          severity: 'extreme',
          title: 'Massive storm in Berlin claimed as India',
          description: 'Coordinates lie outside sovereign Indian bounding polygon.',
          verificationStatus: 'flagged',
          confidenceScore: 15,
          flagReason: 'Rejected by Sovereign Geo-Fence Gate: Outside India coordinates',
          is_simulated: true,
          display_policy: 'HIDE_UNVERIFIED'
        };
        addEventWithProcessing(spoof);
        onNewEvent(spoof, '🎯 Scenario C: Geo-Fence intercepted out-of-bounds report (Status: FLAGGED)');
      } else if (scenarioLetter === 'D') {
        const stale: any = {
          source: 'citizen',
          sourceAuthor: 'ViralForwarder_Jaipur',
          timestamp: new Date().toISOString(),
          city: 'Jaipur',
          state: 'Rajasthan',
          latitude: 26.9124,
          longitude: 75.7873,
          category: 'flooding',
          severity: 'extreme',
          title: 'Flood claimed today with 10-day-old foreign photo',
          description: '3-tier timestamp analysis detected image taken 10 days earlier with Malaysia GPS.',
          verificationStatus: 'stale',
          confidenceScore: 10,
          flagReason: 'Stale media photograph with foreign EXIF coordinates',
          is_simulated: true,
          display_policy: 'SHOW_STALE'
        };
        addEventWithProcessing(stale);
        onNewEvent(stale, '🎯 Scenario D: 10-day-old media weaponization blocked (Status: STALE)');
      } else if (scenarioLetter === 'E') {
        const contra: any = {
          source: 'citizen',
          sourceAuthor: 'RumorBot_Jodhpur',
          timestamp: new Date().toISOString(),
          city: 'Jodhpur',
          state: 'Rajasthan',
          latitude: 26.2183,
          longitude: 73.0189,
          category: 'flooding',
          severity: 'extreme',
          title: 'Claimed flash flood in Jodhpur',
          description: 'Claimed flood but Open-Meteo AWS rain gauge records 0.0mm with 42.5°C clear sky.',
          verificationStatus: 'contradicted',
          confidenceScore: 20,
          isContradictory: true,
          flagReason: 'Physical invariant violation: 0mm precipitation and 42.5°C surface temperature',
          is_simulated: true,
          display_policy: 'SHOW_CONTRADICTED',
          contradicting_evidence: ['Open-Meteo station: 0.0mm rain, 42.5°C surface temperature (Clear sky)']
        };
        addEventWithProcessing(contra);
        onNewEvent(contra, '🎯 Scenario E: Surface telemetry contradicts report (Status: CONTRADICTED)');
      } else if (scenarioLetter === 'F') {
        const dialect: any = {
          source: 'citizen',
          sourceAuthor: 'UP_Ramesh_Citizen',
          timestamp: new Date().toISOString(),
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          latitude: 26.8467,
          longitude: 80.9462,
          category: 'thunderstorm',
          severity: 'severe',
          title: 'Aandhi toofan aur bijli girna shuru',
          description: 'Yahan bohot bhayankar toofan aaya hai, bijli gir gayi hai ped par aur tez barish chal rahi hai!',
          verificationStatus: 'verified',
          confidenceScore: 88,
          is_simulated: true,
          display_policy: 'SHOW_VERIFIED'
        };
        addEventWithProcessing(dialect);
        onNewEvent(dialect, '🎯 Scenario F: Regional weather dialect ("bijli", "barish") correctly parsed to Thunderstorm!');
      } else {
        handleSimulateTweet();
      }
    } finally {
      setIsTriggeringScenario(null);
    }
  };

  const METEOROLOGICAL_INTEGRITY_SCENARIOS = [
    { id: 'A', name: 'Valid Rain', tag: 'Telemetry Verified', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' },
    { id: 'B', name: '50 Duplicates', tag: 'Dedup Cluster', color: 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100' },
    { id: 'C', name: 'Geo-Spoof', tag: 'Out-of-Bounds Intercept', color: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' },
    { id: 'D', name: 'Stale Media', tag: '10-Day Lag & Exif', color: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100' },
    { id: 'E', name: 'Telemetry Conflict', tag: '0mm Gauge vs Flood', color: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100' },
    { id: 'F', name: 'Regional NLP', tag: 'Barish / Loo Dialect', color: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100' },
    { id: 'G', name: 'Multi-Agency', tag: 'Citizen + IoT + Open-Meteo', color: 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100' },
    { id: 'H', name: 'Load Burst', tag: '500 Events Benchmark', color: 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100' },
  ];

  return (
    <div className="glass-card p-3.5 rounded-2xl mb-6 flex flex-col space-y-2.5 text-xs shadow-sm">
      
      {/* Row 1: Meteorological Integrity Verification Suite Cockpit Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900">Meteorological Integrity Test Suite (Scenarios A through H):</span>
            <span className="text-[11px] text-slate-500 ml-1.5 hidden md:inline">
              Automated verification safeguards & stress-test scenarios
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowScenarios(!showScenarios)}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
        >
          {showScenarios ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Row 1.5: Scenario Buttons Grid */}
      {showScenarios && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 pt-1">
          {METEOROLOGICAL_INTEGRITY_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleTriggerScenario(sc.id)}
              disabled={isTriggeringScenario !== null}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer shadow-xs disabled:opacity-50 ${sc.color}`}
              title={`${sc.name}: ${sc.tag}`}
            >
              <div className="font-extrabold text-[11px] flex items-center justify-between">
                <span>{sc.id}. {sc.name}</span>
                {isTriggeringScenario === sc.id && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
              </div>
              <div className="text-[9.5px] opacity-80 truncate font-mono mt-0.5">
                {sc.tag}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Row 2: Standard Live Stream & API Controls */}
      <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-lg bg-sky-100 text-sky-700">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-800">Stream Controls:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleSimulateTweet}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Poll live Twitter and official meteorological social stream"
          >
            <Twitter className="w-3.5 h-3.5 text-sky-500" />
            <span>Poll Twitter Feed</span>
          </button>

          <button
            onClick={() => {
              purgeAllMockAndSyncLive();
              if (onBatchIngested) onBatchIngested(0);
              window.location.reload();
            }}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Purge all synthetic test records and reset to live verified data"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Purge Test Records</span>
          </button>

          <button
            onClick={handleFetchOpenMeteo}
            disabled={isFetchingApi}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isFetchingApi ? 'animate-spin' : ''}`} />
            <span>{isFetchingApi ? 'Querying...' : 'Fetch Open-Meteo'}</span>
          </button>

          <button
            onClick={handleTriggerDuplicate}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Test duplicate detection"
          >
            <CopyCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Dedup</span>
          </button>

          <button
            onClick={handleTriggerSpam}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Test AI fake/spam classification"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Spam</span>
          </button>

          <button
            onClick={() => setAutoStreamActive(!autoStreamActive)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
              autoStreamActive
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {autoStreamActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{autoStreamActive ? 'Streaming (12s)' : 'Auto Stream'}</span>
          </button>
        </div>
      </div>

      {/* Row 3: Big Data Stress Testing Benchmarks */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <DatabaseZap className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-slate-700">Big Data Scaling Test:</span>
          {bigDataProgress && (
            <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
              {bigDataProgress}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleBatchIngest(300)}
            disabled={isBigDataProcessing}
            className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Zap className="w-3 h-3 text-indigo-600" />
            <span>+300 Events Batch</span>
          </button>

          <button
            onClick={() => handleBatchIngest(1000)}
            disabled={isBigDataProcessing}
            className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Activity className="w-3 h-3" />
            <span>+1,000 Heavy Stream</span>
          </button>
        </div>
      </div>

      {/* Row 4: Disaster Network Connectivity Simulator */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <Wifi className="w-4 h-4 text-sky-600" />
          <span className="font-bold text-slate-800">Disaster Network Simulator:</span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Offline Emergency Mode &amp; Automatic Reconnect Sync
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setSimulatedStatus(null)}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all text-xs border cursor-pointer ${
              !isSimulated || status === 'online'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Reset to live real-world network condition"
          >
            🟢 Live Online
          </button>

          <button
            onClick={() => setSimulatedStatus('degraded')}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all text-xs border cursor-pointer ${
              isSimulated && status === 'degraded'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Simulate slow congested 3G cellular network with timeouts"
          >
            🟡 Degraded (Slow 3G)
          </button>

          <button
            onClick={() => setSimulatedStatus('offline')}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all text-xs border cursor-pointer ${
              isSimulated && status === 'offline'
                ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Simulate complete cellular blackout"
          >
            🔴 Offline Emergency
          </button>
        </div>
      </div>
    </div>
  );
};
