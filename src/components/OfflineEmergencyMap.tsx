/**
 * OfflineEmergencyMap.tsx — Zero-Network Tactical Emergency Vector Map
 *
 * Designed specifically for disaster blackout conditions:
 *  - 100% vector-rendered SVG/Canvas (needs ZERO external tile downloads)
 *  - Concentric radial distance rings (5km, 10km, 15km, 20km)
 *  - High-visibility markers for Floods, Hospitals, Evacuation Shelters, Police & Fire posts
 *  - Interactive pin selection with distance and tap-to-call emergency numbers
 *  - Never renders a blank screen during internet failure
 */

import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  Hospital, 
  Tent, 
  Shield, 
  Flame, 
  CloudRain, 
  Waves, 
  Zap, 
  Compass, 
  Layers, 
  Crosshair, 
  PhoneCall, 
  ExternalLink,
  Info,
  Maximize2
} from 'lucide-react';
import { OfflineSnapshot, EmergencyFacility } from '../services/offlineStorage';
import { WeatherEvent } from '../types/weather';
import { CATEGORY_CONFIG } from '../data/initialEvents';

interface OfflineEmergencyMapProps {
  snapshot: OfflineSnapshot | null;
  events: WeatherEvent[];
  onSelectEvent?: (event: WeatherEvent) => void;
  onSelectFacility?: (facility: EmergencyFacility) => void;
}

export const OfflineEmergencyMap: React.FC<OfflineEmergencyMapProps> = ({
  snapshot,
  events,
  onSelectEvent,
  onSelectFacility
}) => {
  const [selectedPin, setSelectedPin] = useState<{
    type: 'event' | 'facility';
    data: WeatherEvent | EmergencyFacility;
    distanceKm: number;
  } | null>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'hazards' | 'medical' | 'shelters'>('all');

  // Center coordinates
  const centerLat = snapshot?.location.latitude || 28.6280;
  const centerLng = snapshot?.location.longitude || 77.3649;
  const centerName = snapshot?.location.city || 'Emergency Zone';
  const radiusKm = snapshot?.location.radiusKm || 20;

  // Coordinate projection from lat/lng to SVG viewBox (-250, -250 to 250, 250)
  // 1 degree lat approx 111 km, 1 degree lng approx 111 * cos(lat)
  const toSvgCoords = (lat: number, lng: number) => {
    const latDiffKm = (lat - centerLat) * 111;
    const lngDiffKm = (lng - centerLng) * 111 * Math.cos((centerLat * Math.PI) / 180);

    // Scale to SVG radius (210 pixels corresponds to radiusKm)
    const scale = 210 / Math.max(10, radiusKm);
    const x = lngDiffKm * scale;
    const y = -latDiffKm * scale; // SVG y is inverted

    // Clamp to map boundary
    const dist = Math.hypot(x, y);
    if (dist > 230) {
      const angle = Math.atan2(y, x);
      return { x: Math.cos(angle) * 230, y: Math.sin(angle) * 230, outOfBounds: true };
    }
    return { x, y, outOfBounds: false };
  };

  // Facilities list
  const facilities = snapshot?.emergencyFacilities || [];

  // Filtered facilities
  const displayedFacilities = useMemo(() => {
    if (activeFilter === 'hazards') return [];
    if (activeFilter === 'medical') return facilities.filter((f) => f.type === 'hospital');
    if (activeFilter === 'shelters') return facilities.filter((f) => f.type === 'shelter' || f.type === 'relief_camp');
    return facilities;
  }, [facilities, activeFilter]);

  // Filtered events
  const displayedEvents = useMemo(() => {
    if (activeFilter === 'medical' || activeFilter === 'shelters') return [];
    return events.slice(0, 25);
  }, [events, activeFilter]);

  return (
    <div className="relative w-full h-[580px] rounded-3xl overflow-hidden bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl flex flex-col">
      
      {/* Tactical Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-700/80 shadow-lg flex items-center space-x-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="font-extrabold text-white tracking-wide">TACTICAL EMERGENCY RADAR</span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/40">
            OFFLINE VECTOR MODE
          </span>
        </div>

        {/* Filter chips */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 shadow-lg flex items-center space-x-1 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
              activeFilter === 'all' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Pins
          </button>
          <button
            onClick={() => setActiveFilter('hazards')}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
              activeFilter === 'hazards' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Flood Hazards
          </button>
          <button
            onClick={() => setActiveFilter('medical')}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
              activeFilter === 'medical' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hospitals
          </button>
          <button
            onClick={() => setActiveFilter('shelters')}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
              activeFilter === 'shelters' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Shelters
          </button>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <svg
          viewBox="-260 -260 520 520"
          className="w-full h-full max-h-[540px] select-none"
        >
          <defs>
            {/* Grid Radial Glow */}
            <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.15" />
              <stop offset="70%" stopColor="#0369a1" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
            </radialGradient>

            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background circle */}
          <circle cx="0" cy="0" r="240" fill="url(#radarSweep)" stroke="#334155" strokeWidth="1" />

          {/* Concentric Distance Rings */}
          <circle cx="0" cy="0" r="55" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="0" cy="0" r="110" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="0" cy="0" r="165" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="0" cy="0" r="220" fill="none" stroke="#475569" strokeWidth="2" />

          {/* Distance Labels */}
          <text x="5" y="-57" fill="#64748b" fontSize="9" fontFamily="monospace">5 km</text>
          <text x="5" y="-112" fill="#64748b" fontSize="9" fontFamily="monospace">10 km</text>
          <text x="5" y="-167" fill="#64748b" fontSize="9" fontFamily="monospace">15 km</text>
          <text x="5" y="-222" fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="monospace">20 km limit</text>

          {/* Crosshair Axes */}
          <line x1="-240" y1="0" x2="240" y2="0" stroke="#1e293b" strokeWidth="1" />
          <line x1="0" y1="-240" x2="0" y2="240" stroke="#1e293b" strokeWidth="1" />

          {/* Cardinal direction markers */}
          <text x="0" y="-242" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">N</text>
          <text x="0" y="252" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold">S</text>
          <text x="247" y="4" textAnchor="start" fill="#64748b" fontSize="11" fontWeight="bold">E</text>
          <text x="-247" y="4" textAnchor="end" fill="#64748b" fontSize="11" fontWeight="bold">W</text>

          {/* Center User Location Pin */}
          <g transform="translate(0, 0)">
            <circle cx="0" cy="0" r="18" fill="#0284c7" opacity="0.3">
              <animate attributeName="r" values="8;24;8" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="18" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
              {centerName}
            </text>
          </g>

          {/* Emergency Facilities Pins */}
          {displayedFacilities.map((fac) => {
            const coords = toSvgCoords(fac.latitude, fac.longitude);
            const isHosp = fac.type === 'hospital';
            const isShelter = fac.type === 'shelter' || fac.type === 'relief_camp';
            const pinColor = isHosp ? '#ef4444' : isShelter ? '#10b981' : fac.type === 'police' ? '#3b82f6' : '#f97316';
            const pinEmoji = isHosp ? '🏥' : isShelter ? '⛺' : fac.type === 'police' ? '👮' : '🚒';

            return (
              <g
                key={fac.id}
                transform={`translate(${coords.x}, ${coords.y})`}
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedPin({ type: 'facility', data: fac, distanceKm: fac.distanceKm || 1.5 });
                  if (onSelectFacility) onSelectFacility(fac);
                }}
              >
                <circle cx="0" cy="0" r="14" fill={pinColor} opacity="0.25" className="group-hover:opacity-60 transition-opacity" />
                <circle cx="0" cy="0" r="10" fill="#0f172a" stroke={pinColor} strokeWidth="2" />
                <text x="0" y="3.5" textAnchor="middle" fontSize="10">{pinEmoji}</text>
              </g>
            );
          })}

          {/* Weather Events / Flood Hazards Pins */}
          {displayedEvents.map((evt) => {
            const coords = toSvgCoords(evt.latitude, evt.longitude);
            const isFlood = evt.category === 'flooding';
            const isStorm = evt.category === 'thunderstorm';
            const pinColor = isFlood ? '#38bdf8' : isStorm ? '#c084fc' : '#f59e0b';
            const pinEmoji = isFlood ? '🌊' : isStorm ? '⚡' : '🌧️';

            return (
              <g
                key={evt.id}
                transform={`translate(${coords.x}, ${coords.y})`}
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedPin({
                    type: 'event',
                    data: evt,
                    distanceKm: Math.round(Math.hypot(coords.x, coords.y) / (210 / radiusKm))
                  });
                  if (onSelectEvent) onSelectEvent(evt);
                }}
              >
                <circle cx="0" cy="0" r="16" fill={pinColor} opacity="0.2">
                  <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="0" cy="0" r="10" fill="#0f172a" stroke={pinColor} strokeWidth="2" />
                <text x="0" y="3.5" textAnchor="middle" fontSize="10">{pinEmoji}</text>
              </g>
            );
          })}
        </svg>

        {/* Tactical Legend Bottom Left */}
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-[11px] space-y-1.5">
          <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Tactical Legend</div>
          <div className="flex items-center space-x-2"><span className="text-sm">🏥</span><span>Hospital / Trauma Care</span></div>
          <div className="flex items-center space-x-2"><span className="text-sm">⛺</span><span>Relief Camp / High Ground</span></div>
          <div className="flex items-center space-x-2"><span className="text-sm">🌊</span><span>Severe Flood Hazard Point</span></div>
          <div className="flex items-center space-x-2"><span className="text-sm">🌧️</span><span>Precipitation Storm Cell</span></div>
        </div>

        {/* Selected Pin Details Overlay Card */}
        {selectedPin && (
          <div className="absolute bottom-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl border border-slate-700 shadow-2xl text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <span>{selectedPin.type === 'facility' ? '🏛️ Emergency Facility' : '⚠️ Weather Hazard'}</span>
              </span>
              <span className="font-mono text-[10px] text-sky-400 bg-sky-950 px-2 py-0.5 rounded-full border border-sky-800">
                ~{selectedPin.distanceKm.toFixed(1)} km away
              </span>
            </div>

            <div className="mt-2.5 space-y-1.5">
              <h4 className="font-bold text-white text-sm">
                {'name' in selectedPin.data ? selectedPin.data.name : selectedPin.data.title}
              </h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {'address' in selectedPin.data ? selectedPin.data.address : selectedPin.data.description}
              </p>

              {'contactPhone' in selectedPin.data && selectedPin.data.contactPhone && (
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-mono text-emerald-400 font-bold">{selectedPin.data.contactPhone}</span>
                  <a
                    href={`tel:${selectedPin.data.contactPhone.split('/')[0].trim()}`}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1 shadow-md"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>Call Helpline</span>
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedPin(null)}
              className="mt-3 w-full py-1 text-center text-slate-500 hover:text-slate-300 font-semibold text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
