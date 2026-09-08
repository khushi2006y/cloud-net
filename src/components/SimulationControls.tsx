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
  Activity
} from 'lucide-react';
import { Twitter } from './icons/TwitterIcon';
import { WeatherEvent, EventCategory } from '../types/weather';
import { generateSimulatedTweet, fetchLiveCityWeather } from '../services/weatherApi';
import { getRandomIndianCity } from '../config/india';
import { addEventWithProcessing, batchAddEvents, getStoredEvents } from '../services/storage';
import { executeBigDataIngestion, generateBigDataBatch } from '../services/streamQueue';

interface SimulationControlsProps {
  onNewEvent: (event: WeatherEvent, msg: string) => void;
  onBatchIngested?: (count: number) => void;
}

/**
 * Builds a synthetic near-duplicate of an existing live event.
 * Picks the most recently verified event and creates a citizen report
 * for the same city/category with slight coordinate jitter.
 * Falls back to a random city if no events exist yet.
 */
function buildDynamicDuplicateEvent(): Omit<
  WeatherEvent,
  'id' | 'verificationStatus' | 'confidenceScore'
> {
  const existing = getStoredEvents();
  // Prefer the most recent verified / unverified event to trigger dedup
  const base = existing.find(
    e => e.verificationStatus === 'verified' || e.verificationStatus === 'unverified'
  );

  if (base) {
    // Jitter coordinates by ±0.01° (~1 km) to simulate nearby report
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
      title: `${base.category} conditions confirmed near ${base.city} centre`,
      description: `Independent citizen report corroborating ongoing ${base.category} event in ${base.city}. Conditions still active.`,
      rawText: `Confirming ${base.category} in ${base.city}! Roads affected. #${base.city.replace(/\s/g, '')}Weather #IMD`,
      hashtags: [`#${base.city.replace(/\s/g, '')}Weather`, '#IMD', '#CitizenReport']
    };
  }

  // Fallback if no events exist (very rare — only on initial cold start)
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
    rawText: `Heavy rain in ${city.name}! #IMD #WeatherAlert`
  };
}

/**
 * Builds a synthetic spam/promotional post using a random Indian city's
 * coordinates to ensure the geo-bounding-box check passes (only text flags it).
 */
function buildDynamicSpamEvent(): Omit<
  WeatherEvent,
  'id' | 'verificationStatus' | 'confidenceScore'
> {
  const city = getRandomIndianCity();
  const SPAM_PATTERNS = [
    {
      text: `Earn free crypto online! Click bit.ly/giveaway for free bitcoin while it might rain in ${city.name}! #IMD`,
      title: 'Promotional spam post detected'
    },
    {
      text: `WIN FREE IPHONE! lottery giveaway running. Follow back for prize. Also maybe thunder in ${city.name}. #IMD`,
      title: 'Lottery/giveaway spam flagged'
    },
    {
      text: `Investment tip: buy telegram stocks. Casino bonus 1000 coins. Weather update: rain possible in ${city.name}. #IMD`,
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
    hashtags: ['#IMD', '#Promo']
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

  useEffect(() => {
    if (!autoStreamActive) return;

    const interval = setInterval(() => {
      const tweet = generateSimulatedTweet();
      const result = addEventWithProcessing(tweet);
      onNewEvent(result.event, `Live Twitter Post: ${result.event.city}`);
    }, 12000);

    return () => clearInterval(interval);
  }, [autoStreamActive, onNewEvent]);

  const handleSimulateTweet = () => {
    const tweet = generateSimulatedTweet();
    const result = addEventWithProcessing(tweet);
    onNewEvent(result.event, `Twitter #IMD Post: ${result.event.city}`);
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

  return (
    <div className="glass-card p-3.5 rounded-2xl mb-6 flex flex-col space-y-2.5 text-xs shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-xl bg-sky-100 text-sky-700">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900">Live Stream &amp; Big Data Testbed:</span>
            <span className="text-[11px] text-slate-500 ml-1.5 hidden sm:inline">
              Test live Twitter streams, sensor telemetry, AI filters, and Big Data batch ingestion
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleSimulateTweet}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <Twitter className="w-3.5 h-3.5 text-sky-500" />
            <span>Simulate Tweet</span>
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
            title="Test duplicate detection — mirrors the most recent live event"
          >
            <CopyCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Dedup</span>
          </button>

          <button
            onClick={handleTriggerSpam}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Test AI fake/spam classification — random city, dynamic spam pattern"
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

      {/* Row 2: Big Data Stress Testing Benchmarks */}
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
    </div>
  );
};
