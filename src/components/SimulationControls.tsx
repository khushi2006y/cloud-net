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
import { WeatherEvent } from '../types/weather';
import { generateSimulatedTweet, fetchLiveCityWeather } from '../services/weatherApi';
import { MAJOR_INDIAN_CITIES } from '../data/initialEvents';
import { addEventWithProcessing, batchAddEvents } from '../services/storage';
import { executeBigDataIngestion, generateBigDataBatch } from '../services/streamQueue';

interface SimulationControlsProps {
  onNewEvent: (event: WeatherEvent, msg: string) => void;
  onBatchIngested?: (count: number) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({ onNewEvent, onBatchIngested }) => {
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
    const randomCity = MAJOR_INDIAN_CITIES[Math.floor(Math.random() * MAJOR_INDIAN_CITIES.length)];
    
    try {
      const liveData = await fetchLiveCityWeather(randomCity);
      if (liveData) {
        const result = addEventWithProcessing(liveData);
        onNewEvent(result.event, `Open-Meteo Live Synop: ${randomCity.name} (${liveData.telemetry?.temperatureC}°C)`);
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
    const result = addEventWithProcessing({
      source: 'citizen',
      sourceAuthor: 'Rohan (Duplicate Test)',
      timestamp: new Date().toISOString(),
      city: 'Mumbai',
      state: 'Maharashtra',
      latitude: 19.0790,
      longitude: 72.8790,
      category: 'rainfall',
      severity: 'severe',
      title: 'Water rising near Dadar station',
      description: 'Heavy rainfall in Dadar, roads flooded near market.',
      rawText: 'Heavy rain in Dadar #MumbaiRains'
    });

    onNewEvent(result.event, `Duplicate engine: Merged into active ${result.event.city} cluster.`);
  };

  const handleTriggerSpam = () => {
    const result = addEventWithProcessing({
      source: 'twitter',
      sourceAuthor: 'CryptoBotSpam',
      sourceHandle: '@FreeCoinsPromo',
      timestamp: new Date().toISOString(),
      city: 'Kolkata',
      state: 'West Bengal',
      latitude: 22.5726,
      longitude: 88.3639,
      category: 'thunderstorm',
      severity: 'low',
      title: 'Suspicious promotional post',
      description: 'Earn free crypto online! Click bit.ly/giveaway for free bitcoin while it rains in Kolkata! #IMD',
      rawText: 'Earn free crypto online! Click bit.ly/giveaway for free bitcoin while it rains in Kolkata! #IMD'
    });

    onNewEvent(result.event, `AI Spam Guard: Intercepted and flagged.`);
  };

  // Big Data Batch Ingestion Benchmark
  const handleBatchIngest = async (count: number) => {
    setIsBigDataProcessing(true);
    setBigDataProgress(`Ingesting ${count} records...`);

    const stats = await executeBigDataIngestion(count, (cur, total) => {
      setBigDataProgress(`${cur}/${total} processed...`);
    });

    const newBatch = generateBigDataBatch(count);
    batchAddEvents(newBatch);

    setIsBigDataProcessing(false);
    setBigDataProgress(`⚡ Ingested ${stats.totalProcessed} events in ${stats.durationMs}ms (~${stats.eventsPerSec} ev/s)`);

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
            <span className="font-bold text-slate-900">
              Live Stream & Big Data Testbed:
            </span>
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
            title="Test duplicate detection algorithm"
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
