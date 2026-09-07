import React, { useEffect, useState } from 'react';
import { 
  X, 
  MapPin, 
  Radio, 
  Users, 
  Copy, 
  Gauge, 
  Sparkles,
  CloudRain,
  TrendingUp,
  Wind,
  Calendar
} from 'lucide-react';
import { Twitter } from './icons/TwitterIcon';
import { WeatherEvent } from '../types/weather';
import { CATEGORY_CONFIG } from '../data/initialEvents';

interface EventDetailModalProps {
  event: WeatherEvent | null;
  onClose: () => void;
  onSelectEventById?: (id: string) => void;
}

interface HourlyForecastPoint {
  time: string;
  temp: number;
  rainProb: number;
  rainMm: number;
  windSpeed: number;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose
}) => {
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastPoint[]>([]);
  const [isLoadingForecast, setIsLoadingForecast] = useState<boolean>(false);

  useEffect(() => {
    if (!event) return;

    const fetchLiveForecast = async () => {
      setIsLoadingForecast(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${event.latitude}&longitude=${event.longitude}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m&timezone=Asia%2FKolkata`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const currentHourIdx = new Date().getHours();
          const times = data.hourly.time.slice(currentHourIdx, currentHourIdx + 8);
          const temps = data.hourly.temperature_2m.slice(currentHourIdx, currentHourIdx + 8);
          const rainProbs = data.hourly.precipitation_probability.slice(currentHourIdx, currentHourIdx + 8);
          const rainMms = data.hourly.precipitation.slice(currentHourIdx, currentHourIdx + 8);
          const windSpeeds = data.hourly.wind_speed_10m.slice(currentHourIdx, currentHourIdx + 8);

          const points: HourlyForecastPoint[] = times.map((t: string, idx: number) => ({
            time: new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            temp: temps[idx],
            rainProb: rainProbs[idx],
            rainMm: rainMms[idx],
            windSpeed: windSpeeds[idx]
          }));

          setHourlyForecast(points);
        }
      } catch (err) {
        console.warn('Could not fetch live forecast for modal:', err);
      } finally {
        setIsLoadingForecast(false);
      }
    };

    fetchLiveForecast();
  }, [event]);

  if (!event) return null;

  const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.rainfall;

  const copyCoords = () => {
    navigator.clipboard.writeText(`${event.latitude}, ${event.longitude}`);
    alert('GPS coordinates copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div 
          className="px-6 py-5 border-b border-slate-100 flex items-center justify-between"
          style={{ background: config.bgHex }}
        >
          <div className="flex items-center space-x-3">
            <span 
              className="p-2.5 rounded-2xl text-2xl bg-white shadow-sm border border-slate-200/60"
            >
              {config.emoji}
            </span>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  event.severity === 'extreme' ? 'bg-rose-600 text-white' :
                  event.severity === 'severe' ? 'bg-orange-500 text-white' :
                  'bg-white text-slate-700 shadow-xs'
                }`}>
                  {event.severity} severity
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {event.city}, {event.state}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 shadow-xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          
          <div>
            <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
            <p className="text-slate-600 mt-1 leading-relaxed">{event.description}</p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Coordinates</span>
              <p className="font-mono text-slate-800 font-bold mt-0.5">
                {event.latitude.toFixed(4)}°N, {event.longitude.toFixed(4)}°E
              </p>
              <button
                onClick={copyCoords}
                className="text-[10px] text-sky-600 font-semibold hover:underline flex items-center mt-0.5 cursor-pointer"
              >
                <Copy className="w-2.5 h-2.5 mr-1" /> Copy GPS
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Source</span>
              <div className="capitalize font-bold text-slate-900 mt-0.5 flex items-center space-x-1">
                {event.source === 'twitter' && <Twitter className="w-3 h-3 text-sky-600" />}
                {event.source === 'api' && <Radio className="w-3 h-3 text-teal-600" />}
                {event.source === 'citizen' && <Users className="w-3 h-3 text-purple-600" />}
                <span>{event.source}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {event.sourceAuthor}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Status</span>
              <div className="mt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  event.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                  event.verificationStatus === 'flagged' ? 'bg-rose-100 text-rose-800' :
                  event.verificationStatus === 'duplicate' ? 'bg-purple-100 text-purple-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {event.verificationStatus}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                Score: {event.confidenceScore}%
              </div>
            </div>
          </div>

          {/* Real-time Live Hourly Forecast Section (Pulled Live from Open-Meteo) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/60 border border-sky-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                <span>Live Next 8-Hour Synoptic Forecast</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                ECMWF / Open-Meteo Synop
              </span>
            </div>

            {isLoadingForecast ? (
              <div className="text-center py-4 text-slate-400 font-medium animate-pulse">
                Querying live meteorological satellites...
              </div>
            ) : hourlyForecast.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {hourlyForecast.map((pt, idx) => (
                  <div key={idx} className="p-2 bg-white/90 rounded-xl border border-sky-100 flex flex-col items-center text-center shadow-xs">
                    <span className="text-[10px] text-slate-400 font-medium">{pt.time}</span>
                    <span className="font-mono text-xs font-extrabold text-slate-900 my-0.5">{Math.round(pt.temp)}°C</span>
                    <div className="flex items-center text-[10px] font-bold text-sky-600">
                      <CloudRain className="w-2.5 h-2.5 mr-0.5" />
                      <span>{pt.rainProb}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">Forecast data unavailable for this location.</p>
            )}
          </div>

          {/* Telemetry */}
          {event.telemetry && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-slate-800 font-bold flex items-center text-xs">
                <Gauge className="w-4 h-4 text-sky-600 mr-1.5" />
                Live Sensor Telemetry
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                {event.telemetry.temperatureC !== undefined && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-medium">Temp</span>
                    <p className="font-mono text-slate-900 font-extrabold">{event.telemetry.temperatureC}°C</p>
                  </div>
                )}
                {event.telemetry.precipitationMm !== undefined && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-medium">Precip</span>
                    <p className="font-mono text-sky-600 font-extrabold">{event.telemetry.precipitationMm} mm</p>
                  </div>
                )}
                {event.telemetry.windSpeedKmh !== undefined && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-medium">Wind</span>
                    <p className="font-mono text-teal-600 font-extrabold">{event.telemetry.windSpeedKmh} km/h</p>
                  </div>
                )}
                {event.telemetry.humidityPct !== undefined && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-medium">Humidity</span>
                    <p className="font-mono text-purple-600 font-extrabold">{event.telemetry.humidityPct}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {event.rawText && (
            <div className="space-y-1">
              <span className="text-slate-400 font-bold text-[11px]">Raw Payload</span>
              <pre className="p-3 bg-slate-900 rounded-2xl text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {event.rawText}
              </pre>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
