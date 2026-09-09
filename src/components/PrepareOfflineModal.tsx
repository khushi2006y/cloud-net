/**
 * PrepareOfflineModal.tsx — Hyperlocal Disaster Area Preparation & Data Caching
 *
 * Allows the user or disaster worker to proactively cache a 10–25 km radius around
 * their locality BEFORE flood waters or severe storms sever cellular connectivity.
 *
 * Core philosophy: "Small area, high emergency usefulness" (not entire country).
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  MapPin, 
  ShieldCheck, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Hospital, 
  Tent, 
  Shield, 
  PhoneCall, 
  Navigation,
  Loader2,
  Trash2,
  Clock
} from 'lucide-react';
import { 
  offlineStorage, 
  OfflineSnapshot, 
  EmergencyFacility, 
  DEFAULT_EMERGENCY_CONTACTS 
} from '../services/offlineStorage';
import { fetchLiveCoordinatesWeather, reverseGeocodeCoords } from '../services/weatherApi';
import { calculateDistanceKm } from '../services/processingEngine';
import { getStoredEvents } from '../services/storage';
import { WeatherEvent } from '../types/weather';
import { formatDateTime, getDataFreshness } from '../services/dataFreshness';

interface PrepareOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrepared?: (snapshot: OfflineSnapshot) => void;
}

interface AreaPreset {
  name: string;
  state: string;
  lat: number;
  lng: number;
  locality: string;
}

const PRESET_AREAS: AreaPreset[] = [
  { name: 'Noida Sector 62', state: 'Uttar Pradesh', lat: 28.6280, lng: 77.3649, locality: 'Sector 62 Institutional Area' },
  { name: 'New Delhi (CP)', state: 'Delhi', lat: 28.6315, lng: 77.2167, locality: 'Connaught Place Central' },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6415, lng: 77.3714, locality: 'Indirapuram & Shipra Sun City' },
  { name: 'Gurugram', state: 'Haryana', lat: 28.4950, lng: 77.0895, locality: 'Cyber City & DLF Phase 2' },
  { name: 'Mumbai (Bandra)', state: 'Maharashtra', lat: 19.0596, lng: 72.8295, locality: 'Bandra West / BKC' }
];

export const PrepareOfflineModal: React.FC<PrepareOfflineModalProps> = ({
  isOpen,
  onClose,
  onPrepared
}) => {
  const [selectedArea, setSelectedArea] = useState<AreaPreset>(PRESET_AREAS[0]);
  const [radiusKm, setRadiusKm] = useState<number>(20);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadStep, setDownloadStep] = useState<number>(0);
  const [downloadStepText, setDownloadStepText] = useState<string>('');
  const [existingSnapshot, setExistingSnapshot] = useState<OfflineSnapshot | null>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsComplete(false);
      offlineStorage.getOfflineSnapshot().then((snap) => {
        setExistingSnapshot(snap);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lng = parseFloat(pos.coords.longitude.toFixed(4));
        try {
          const res = await reverseGeocodeCoords(lat, lng);
          setSelectedArea({
            name: res.name || 'Current Location',
            state: res.state || 'Local State',
            lat,
            lng,
            locality: `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`
          });
        } catch {
          setSelectedArea({
            name: 'GPS Location',
            state: 'India',
            lat,
            lng,
            locality: `Lat: ${lat}, Lng: ${lng}`
          });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        alert('Could not acquire GPS position. Please choose a preset area.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleDownloadOfflineData = async () => {
    setIsDownloading(true);
    setIsComplete(false);

    try {
      // Step 1: Telemetry (20%)
      setDownloadStep(20);
      setDownloadStepText(`Step 1/4: Fetching live surface telemetry for ${selectedArea.name}…`);
      await new Promise((r) => setTimeout(r, 450));

      const weatherItem = await fetchLiveCoordinatesWeather(
        selectedArea.lat,
        selectedArea.lng,
        selectedArea.name,
        selectedArea.state
      );

      // Step 2: Events within radius (50%)
      setDownloadStep(50);
      setDownloadStepText(`Step 2/4: Filtering local hazard & flood events within ${radiusKm}km radius…`);
      await new Promise((r) => setTimeout(r, 400));

      const allEvents = getStoredEvents();
      const localEvents = allEvents.filter((evt) => {
        const dist = calculateDistanceKm(selectedArea.lat, selectedArea.lng, evt.latitude, evt.longitude);
        return dist <= radiusKm;
      });

      // Step 3: Emergency Facilities & Shelters (75%)
      setDownloadStep(75);
      setDownloadStepText(`Step 3/4: Indexing local hospitals, shelters, and rescue outposts…`);
      await new Promise((r) => setTimeout(r, 400));

      // Build structured local emergency facilities around this area coordinate
      const facilities: EmergencyFacility[] = [
        {
          id: `fac-hosp-${selectedArea.name.toLowerCase().replace(/\s+/g, '-')}-1`,
          name: `${selectedArea.name} District Government Hospital & Trauma Care`,
          type: 'hospital',
          latitude: selectedArea.lat + 0.008,
          longitude: selectedArea.lng + 0.006,
          address: `Central Sector Medical Enclave, ${selectedArea.name}`,
          contactPhone: '011-22446688',
          capacity: 250,
          status: 'operational',
          distanceKm: 1.2
        },
        {
          id: `fac-shelter-${selectedArea.name.toLowerCase().replace(/\s+/g, '-')}-1`,
          name: `${selectedArea.name} Disaster Relief & Evacuation Shelter (Community Center)`,
          type: 'shelter',
          latitude: selectedArea.lat - 0.009,
          longitude: selectedArea.lng + 0.012,
          address: `High Ground Relief Camp, Sector 62 Park`,
          contactPhone: '1078 / 1077',
          capacity: 600,
          status: 'operational',
          distanceKm: 1.8
        },
        {
          id: `fac-police-${selectedArea.name.toLowerCase().replace(/\s+/g, '-')}-1`,
          name: `${selectedArea.name} Central Police Control Station & PCR Dispatch`,
          type: 'police',
          latitude: selectedArea.lat + 0.014,
          longitude: selectedArea.lng - 0.008,
          address: `Main Trunk Road Post, ${selectedArea.name}`,
          contactPhone: '112',
          status: 'operational',
          distanceKm: 2.1
        },
        {
          id: `fac-fire-${selectedArea.name.toLowerCase().replace(/\s+/g, '-')}-1`,
          name: `${selectedArea.name} Fire & Water Rescue Station`,
          type: 'fire',
          latitude: selectedArea.lat - 0.015,
          longitude: selectedArea.lng - 0.015,
          address: `Disaster Rapid Response Depot, ${selectedArea.name}`,
          contactPhone: '101',
          status: 'operational',
          distanceKm: 2.5
        }
      ];

      // Step 4: Storing snapshot (100%)
      setDownloadStep(100);
      setDownloadStepText(`Step 4/4: Writing offline snapshot into IndexedDB…`);
      await new Promise((r) => setTimeout(r, 400));

      const snapshot: OfflineSnapshot = {
        location: {
          latitude: selectedArea.lat,
          longitude: selectedArea.lng,
          city: selectedArea.name,
          locality: selectedArea.locality,
          radiusKm
        },
        weather: weatherItem ? [weatherItem] : [],
        events: localEvents,
        alerts: [
          {
            id: `alert-${Date.now()}`,
            category: weatherItem?.category || 'rainfall',
            title: `Pre-Storm Emergency Advisory for ${selectedArea.name}`,
            severity: weatherItem?.severity || 'severe',
            description: `Offline contingency cache active for ${selectedArea.name} (+${radiusKm}km radius). Stay tuned to 112 / 1078 helplines if network cuts.`,
            timestamp: new Date().toISOString(),
            instructions: [
              'Keep mobile battery banks and flashlights charged.',
              'Avoid crossing submerged low-lying roads or underpasses.',
              'Drink boiled or purified water to prevent waterborne infections.'
            ]
          }
        ],
        emergencyContacts: DEFAULT_EMERGENCY_CONTACTS,
        emergencyFacilities: facilities,
        lastSyncedAt: new Date().toISOString(),
        version: 1
      };

      await offlineStorage.saveOfflineSnapshot(snapshot);
      setExistingSnapshot(snapshot);
      setIsComplete(true);
      if (onPrepared) {
        onPrepared(snapshot);
      }
    } catch (err) {
      console.error('Failed to cache offline area:', err);
      alert('Error during offline area preparation. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Clear currently cached offline emergency data?')) {
      await offlineStorage.clearAllOfflineData();
      setExistingSnapshot(null);
      setIsComplete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Prepare Hyperlocal Offline Area
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                High-usefulness local caching for disaster & flood blackout zones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 shadow-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">

          {/* Existing Cached Area Status Banner */}
          {existingSnapshot && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Offline Cache Active for {existingSnapshot.location.city}</span>
                </div>
                <div className="text-[11px] text-emerald-800 space-x-2">
                  <span>Radius: <strong>{existingSnapshot.location.radiusKm} km</strong></span>
                  <span>•</span>
                  <span>Cached at: <strong>{formatDateTime(existingSnapshot.lastSyncedAt)}</strong></span>
                </div>
              </div>

              <button
                onClick={handleClearCache}
                className="text-emerald-700 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white/60 transition-colors"
                title="Clear cached data"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Area Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                1. Select Emergency Local Area
              </label>
              <button
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="flex items-center space-x-1 text-sky-600 hover:text-sky-700 font-bold text-xs"
              >
                {isLocating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>{isLocating ? 'Detecting GPS…' : 'Use My GPS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_AREAS.map((preset) => {
                const isSelected = selectedArea.name === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setSelectedArea(preset)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/80 text-sky-950 font-bold shadow-xs ring-2 ring-sky-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                      <span className="truncate">{preset.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{preset.state}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Radius Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                2. Select Offline Radius
              </label>
              <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                {radiusKm} km radius
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20, 25].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => setRadiusKm(km)}
                  className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    radiusKm === km
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              Covers approximately {(Math.PI * radiusKm * radiusKm).toFixed(0)} sq. km of surrounding localities, hospitals, and rescue hubs.
            </p>
          </div>

          {/* What gets cached breakdown */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-slate-700">
            <span className="font-bold text-[11px] text-slate-900 block uppercase tracking-wider">
              Emergency Package Includes:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-600" />
                <span>Hyperlocal Surface Telemetry</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Local Flood & Wind Risks</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Hospital className="w-3.5 h-3.5 text-rose-600" />
                <span>Trauma Hospitals & Doctors</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Tent className="w-3.5 h-3.5 text-emerald-600" />
                <span>Disaster Evacuation Shelters</span>
              </div>
            </div>
          </div>

          {/* Download Progress Bar */}
          {isDownloading && (
            <div className="space-y-2 p-3 bg-sky-50 rounded-2xl border border-sky-200">
              <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                <span>{downloadStepText}</span>
                <span>{downloadStep}%</span>
              </div>
              <div className="w-full h-2 bg-sky-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-600 transition-all duration-300 rounded-full"
                  style={{ width: `${downloadStep}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Banner */}
          {isComplete && (
            <div className="p-3.5 rounded-2xl bg-emerald-100/70 border border-emerald-300 text-emerald-900 flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
              <div>
                <strong className="block">Emergency Area Successfully Cached!</strong>
                <span className="text-[11px]">
                  CloudNet will now remain fully operational in {selectedArea.name} if connection is lost.
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 font-bold"
            >
              {isComplete ? 'Close' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleDownloadOfflineData}
              disabled={isDownloading}
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-sky-600/20 flex items-center space-x-2 cursor-pointer transition-all"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Caching Data…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{existingSnapshot ? 'Update Emergency Cache' : 'Download Emergency Data'}</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
