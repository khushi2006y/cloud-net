import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { WeatherEvent, EventCategory, WeatherMood } from '../types/weather';
import { CATEGORY_CONFIG } from '../data/initialEvents';
import { 
  Crosshair, 
  Maximize2, 
  Radio, 
  Layers, 
  Sparkles, 
  CloudRain, 
  Flame, 
  Map as MapIcon, 
  ShieldCheck, 
  Clock, 
  CheckCircle2,
  ShieldAlert,
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import { useConnectivity } from '../services/connectivityService';
import { offlineStorage, OfflineSnapshot } from '../services/offlineStorage';
import { OfflineEmergencyMap } from './OfflineEmergencyMap';
import { 
  resolveDisplayPolicy, 
  createEventIcon, 
  createStandardizedPopup, 
  ContradictionCard 
} from './EventMarker';

interface MapViewProps {
  events: WeatherEvent[];
  selectedEvent: WeatherEvent | null;
  onSelectEvent: (event: WeatherEvent) => void;
  onOpenDetails?: (event: WeatherEvent) => void;
  onOpenReportModal: () => void;
  onMoodChange?: (mood: WeatherMood) => void;
  onMapClickCoords?: (lat: number, lng: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  onOpenDetails,
  onMoodChange,
  onMapClickCoords
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const radarGroupRef = useRef<L.LayerGroup | null>(null);
  
  const [pulseEnabled, setPulseEnabled] = useState<boolean>(true);
  const [mapMode, setMapMode] = useState<'standard' | 'radar' | 'thermal'>('standard');
  // Strict Truth-Aware Map: Unverified and Contradicted reports are quarantined by default
  const [showUnverifiedOnMap, setShowUnverifiedOnMap] = useState<boolean>(false);
  const [selectedContradictedEvent, setSelectedContradictedEvent] = useState<WeatherEvent | null>(null);

  const { isOffline, isDegraded } = useConnectivity();
  const [useTacticalMap, setUseTacticalMap] = useState<boolean>(false);
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflineSnapshot | null>(null);

  useEffect(() => {
    offlineStorage.getOfflineSnapshot().then((snap) => setOfflineSnapshot(snap));
  }, [isOffline]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.3511148, 78.6677428],
      zoom: 5,
      minZoom: 4,
      maxZoom: 15,
      zoomControl: false
    });

    // Light CartoDB Voyager Basemap (Clean Plain White / Light Basemap)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | IMD Open Data',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickCoords) {
        onMapClickCoords(e.latlng.lat, e.latlng.lng);
      }
    });

    radarGroupRef.current = L.layerGroup().addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [onMapClickCoords]);

  // Update Radar / Thermal Layer Overlays
  useEffect(() => {
    if (!mapInstanceRef.current || !radarGroupRef.current) return;

    radarGroupRef.current.clearLayers();

    if (mapMode === 'radar') {
      // Draw Doppler Precipitation Radar Zones
      events.forEach(e => {
        if (e.category === 'rainfall' || e.category === 'thunderstorm' || e.category === 'flooding') {
          const circle = L.circle([e.latitude, e.longitude], {
            color: '#0284c7',
            fillColor: '#38bdf8',
            fillOpacity: 0.25,
            radius: 45000,
            weight: 2,
            dashArray: '4, 8'
          });
          circle.addTo(radarGroupRef.current!);
        }
      });
    } else if (mapMode === 'thermal') {
      // Draw Thermal Infrared Heat Zones
      events.forEach(e => {
        if (e.category === 'heatwave') {
          const circle = L.circle([e.latitude, e.longitude], {
            color: '#ea580c',
            fillColor: '#fb923c',
            fillOpacity: 0.3,
            radius: 65000,
            weight: 2
          });
          circle.addTo(radarGroupRef.current!);
        }
      });
    }
  }, [mapMode, events]);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    markersGroupRef.current.clearLayers();

    // Authoritative Display Policy Filtering (Part 1 & 2)
    // DUPLICATE events attach to parent clusters and do not render new markers.
    // UNVERIFIED and CONTRADICTED events are hidden by default and only render when Flagged Reports layer is toggled.
    const mapEligibleEvents = events.filter(event => {
      const policy = resolveDisplayPolicy(event);

      // Never render standalone markers for duplicates
      if (policy === 'ATTACH_DUPLICATE') {
        return false;
      }

      // Hide unverified and contradicted reports unless citizen/analyst opts in via Flagged Layer
      if (policy === 'HIDE_UNVERIFIED' || policy === 'SHOW_CONTRADICTED') {
        return showUnverifiedOnMap;
      }

      // SHOW_VERIFIED, SHOW_CORROBORATED, SHOW_PROVISIONAL, SHOW_STALE are rendered
      return true;
    });

    // Big Data Optimization: Render top 350 most relevant markers to maintain 60 FPS
    const markersToRender = mapEligibleEvents.length > 350 ? mapEligibleEvents.slice(0, 350) : mapEligibleEvents;

    markersToRender.forEach(event => {
      if (isNaN(event.latitude) || isNaN(event.longitude)) return;

      const isSelected = selectedEvent?.id === event.id;
      const customIcon = createEventIcon(event, isSelected, pulseEnabled);
      const marker = L.marker([event.latitude, event.longitude], { icon: customIcon });

      marker.on('click', () => {
        onSelectEvent(event);
        if (onMoodChange) {
          onMoodChange(event.category);
        }
        const policy = resolveDisplayPolicy(event);
        if (policy === 'SHOW_CONTRADICTED') {
          setSelectedContradictedEvent(event);
        }
      });

      // Standardized 9-Field Popup
      const popupDiv = createStandardizedPopup(event, (contradictedEvt) => {
        setSelectedContradictedEvent(contradictedEvt);
      });

      // Append incident detail button to popup
      const detailBtn = document.createElement('button');
      detailBtn.id = `btn-view-intel-${event.id}`;
      detailBtn.className = 'mt-2.5 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center cursor-pointer';
      detailBtn.innerHTML = '<span>View Full Dossier</span>';
      detailBtn.onclick = (e) => {
        e.stopPropagation();
        onSelectEvent(event);
        if (onOpenDetails) {
          onOpenDetails(event);
        }
      };
      popupDiv.appendChild(detailBtn);

      marker.bindPopup(popupDiv);
      marker.addTo(markersGroupRef.current!);
    });
  }, [events, pulseEnabled, selectedEvent, onSelectEvent, onOpenDetails, onMoodChange, showUnverifiedOnMap]);

  // Center on selected event
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedEvent) return;
    if (!isNaN(selectedEvent.latitude) && !isNaN(selectedEvent.longitude)) {
      const zoom = selectedEvent.id.includes('hyperlocal') ? 12 : 10;
      mapInstanceRef.current.flyTo([selectedEvent.latitude, selectedEvent.longitude], zoom, {
        duration: 1.0
      });
    }
  }, [selectedEvent]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([22.3511148, 78.6677428], 5, { duration: 0.8 });
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 11, { duration: 1.0 });
        }
      },
      err => {
        console.warn('Geolocation error:', err);
        alert('Could not access location.');
      }
    );
  };

  if (useTacticalMap) {
    return (
      <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl">
        <OfflineEmergencyMap
          snapshot={offlineSnapshot}
          events={events}
          onSelectEvent={onSelectEvent}
        />
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
          <button
            onClick={() => setUseTacticalMap(false)}
            className="px-3.5 py-1.5 rounded-2xl bg-white/95 hover:bg-white text-slate-800 font-bold text-xs shadow-lg border border-slate-200 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <MapIcon className="w-3.5 h-3.5 text-sky-600" />
            <span>Tile Basemap</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[580px] rounded-3xl overflow-hidden glass-card shadow-xl border border-white/80">
      
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Left Floating Header with Layer Switcher */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl text-xs font-bold text-slate-800 flex items-center space-x-2 border border-slate-200/80 shadow-md">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>National Weather Grid</span>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {events.filter(e => {
              const p = resolveDisplayPolicy(e);
              return p === 'SHOW_VERIFIED' || p === 'SHOW_CORROBORATED';
            }).length} Corroborated
          </span>
          {isOffline && (
            <span className="text-[10px] font-extrabold text-rose-900 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 flex items-center space-x-1">
              <WifiOff className="w-3 h-3" />
              <span>OFFLINE CACHE</span>
            </span>
          )}
          {(() => {
            const flaggedCount = events.filter(e => {
              const p = resolveDisplayPolicy(e);
              return p === 'HIDE_UNVERIFIED' || p === 'SHOW_CONTRADICTED';
            }).length;
            if (flaggedCount === 0) return null;
            return (
              <button
                onClick={() => setShowUnverifiedOnMap(!showUnverifiedOnMap)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center space-x-1 ${
                  showUnverifiedOnMap
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
                title="Toggle display of unverified and contradicted triage reports on map"
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>{showUnverifiedOnMap ? 'Hide Flagged Layer' : `Flagged Layer (${flaggedCount})`}</span>
              </button>
            );
          })()}
        </div>

        {/* Interactive Map Mode Layer Switcher */}
        <div className="bg-white/90 backdrop-blur-md p-1 rounded-2xl flex items-center space-x-1 border border-slate-200/80 shadow-md text-xs">
          <button
            onClick={() => setMapMode('standard')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              mapMode === 'standard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MapIcon className="w-3 h-3" />
            <span>Map</span>
          </button>

          <button
            onClick={() => setMapMode('radar')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              mapMode === 'radar'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CloudRain className="w-3 h-3" />
            <span>Doppler Radar</span>
          </button>

          <button
            onClick={() => setMapMode('thermal')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              mapMode === 'thermal'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Thermal IR</span>
          </button>

          <button
            onClick={() => setUseTacticalMap(true)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl font-bold transition-all text-amber-700 hover:text-amber-800 hover:bg-amber-50 border border-amber-200/60 cursor-pointer"
            title="Zero-network tactical emergency vector map"
          >
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            <span>Tactical Radar</span>
          </button>
        </div>
      </div>

      {/* Bottom Right Floating Action Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center space-x-2">
        <button
          onClick={() => setPulseEnabled(!pulseEnabled)}
          className={`p-2.5 rounded-2xl text-xs font-semibold backdrop-blur-md border transition-all shadow-md ${
            pulseEnabled
              ? 'bg-sky-600 text-white border-sky-500'
              : 'bg-white/90 text-slate-700 border-slate-200'
          }`}
          title="Toggle Pulse Waves"
        >
          <Radio className="w-4 h-4" />
        </button>

        <button
          onClick={handleLocateMe}
          className="p-2.5 rounded-2xl bg-white/90 backdrop-blur-md text-slate-700 hover:text-sky-600 border border-slate-200 shadow-md transition-all cursor-pointer"
          title="Locate My Position"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <button
          onClick={handleRecenter}
          className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md text-slate-800 hover:text-sky-600 text-xs font-bold border border-slate-200 shadow-md transition-all cursor-pointer"
          title="Reset Zoom to India"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>India View</span>
        </button>
      </div>

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center space-x-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-md text-xs font-medium text-slate-700">
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Live Weather Indicators:</span>
        <div className="flex items-center space-x-1"><span>☀️</span><span>Clear</span></div>
        <div className="flex items-center space-x-1"><span>🌧️</span><span>Rain</span></div>
        <div className="flex items-center space-x-1"><span>⚡</span><span>Storm</span></div>
        <div className="flex items-center space-x-1"><span>🌊</span><span>Flood</span></div>
        <div className="flex items-center space-x-1"><span>🔥</span><span>Heat</span></div>
        <div className="flex items-center space-x-1"><span>🌫️</span><span>Fog</span></div>
        <div className="flex items-center space-x-1"><span>🌪️</span><span>Dust</span></div>
        <div className="flex items-center space-x-1"><span>💨</span><span>Wind</span></div>
      </div>

      {/* Contradiction Audit Card Modal */}
      {selectedContradictedEvent && (
        <ContradictionCard
          event={selectedContradictedEvent}
          onClose={() => setSelectedContradictedEvent(null)}
        />
      )}

    </div>
  );
};
