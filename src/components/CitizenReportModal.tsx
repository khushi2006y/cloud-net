import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Camera, 
  Navigation, 
  CheckCircle2, 
  Send, 
  CloudRain,
  ShieldCheck,
  Sparkles,
  AlertOctagon,
  Clock,
  Radio,
  Loader2,
  AlertTriangle,
  WifiOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EventCategory, SeverityLevel, WeatherEvent, WeatherMood } from '../types/weather';
import { CATEGORY_CONFIG, INDIAN_STATES, MAJOR_INDIAN_CITIES } from '../data/initialEvents';
import { addEventWithProcessing, saveUserReport } from '../services/storage';
import { checkContradiction } from '../services/processingEngine';
import { crossValidateWithImdApi, ImdCrossCheckResult } from '../services/weatherApi';
import { connectivityManager } from '../services/connectivityService';
import { offlineStorage, PendingReport } from '../services/offlineStorage';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: (newEvent: WeatherEvent) => void;
  onMoodChange?: (mood: WeatherMood) => void;
  prefilledLocation?: { city: string; state?: string; lat: number; lng: number } | null;
}

const PRESET_DEMO_PHOTOS = [
  { label: 'Flooded Street', url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&auto=format&fit=crop&q=80' },
  { label: 'Heavy Downpour', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop&q=80' },
  { label: 'Lightning Storm', url: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=600&auto=format&fit=crop&q=80' },
  { label: 'Dust Storm', url: 'https://images.unsplash.com/photo-1545134969-8debd725b002?w=600&auto=format&fit=crop&q=80' },
];

export const CitizenReportModal: React.FC<CitizenReportModalProps> = ({
  isOpen,
  onClose,
  onReportSubmitted,
  onMoodChange,
  prefilledLocation
}) => {
  const [authorName, setAuthorName] = useState('');
  const [category, setCategory] = useState<EventCategory>('rainfall');
  const [severity, setSeverity] = useState<SeverityLevel>('moderate');
  const [city, setCity] = useState('Mumbai');
  const [state, setState] = useState('Maharashtra');
  const [latitude, setLatitude] = useState<number>(19.0760);
  const [longitude, setLongitude] = useState<number>(72.8777);
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);

  // Sync prefilled location if provided from map search
  React.useEffect(() => {
    if (isOpen && prefilledLocation) {
      setCity(prefilledLocation.city);
      if (prefilledLocation.state) setState(prefilledLocation.state);
      setLatitude(prefilledLocation.lat);
      setLongitude(prefilledLocation.lng);
      setLocationSuccess(true);
    }
  }, [isOpen, prefilledLocation]);

  // Contradiction and IMD Cross-Validation States
  const [isCrossCheckingImd, setIsCrossCheckingImd] = useState<boolean>(false);
  const [contradictionAlert, setContradictionAlert] = useState<{ reason: string; term: string } | null>(null);
  const [imdCrossCheckResult, setImdCrossCheckResult] = useState<ImdCrossCheckResult | null>(null);

  const [submissionResult, setSubmissionResult] = useState<{
    event: WeatherEvent;
    isDuplicate: boolean;
    isFlagged: boolean;
    flagReason?: string;
    isOfflineQueued?: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationSuccess(false);

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lng = parseFloat(pos.coords.longitude.toFixed(4));
        setLatitude(lat);
        setLongitude(lng);
        setIsLocating(false);
        setLocationSuccess(true);

        let closest = MAJOR_INDIAN_CITIES[0];
        let minDist = 999999;
        MAJOR_INDIAN_CITIES.forEach(c => {
          const dist = Math.hypot(c.lat - lat, c.lng - lng);
          if (dist < minDist) {
            minDist = dist;
            closest = c;
          }
        });
        if (minDist < 1.5) {
          setCity(closest.name);
          setState(closest.state);
        }
      },
      err => {
        console.warn('GPS Error:', err);
        setIsLocating(false);
        alert('Could not retrieve precise location. Please adjust City and State manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleCitySelect = (cityName: string) => {
    setCity(cityName);
    const matched = MAJOR_INDIAN_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    if (matched) {
      setState(matched.state);
      setLatitude(matched.lat);
      setLongitude(matched.lng);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContradictionAlert(null);

    if (!description.trim()) {
      alert('Please describe what you are observing.');
      return;
    }

    // 1. Meteorological Self-Contradiction Check (Auto-Delete / Reject)
    const contradiction = checkContradiction(description, category);
    if (contradiction.isContradictory) {
      setContradictionAlert({
        reason: contradiction.reason || 'Meteorological Self-Contradiction Detected',
        term: contradiction.matchedContradictionTerm || 'contradictory weather claim'
      });
      return; // Do NOT submit, do NOT save, reject immediately!
    }

    // Check if device is operating in Offline Emergency Mode
    if (connectivityManager.getEffectiveStatus() === 'offline') {
      const pendingId = `evt-offline-${Date.now()}`;
      const title = `${CATEGORY_CONFIG[category].label} in ${city}`;

      const pendingReport: PendingReport = {
        id: pendingId,
        latitude: Number(latitude) || 19.0760,
        longitude: Number(longitude) || 72.8777,
        category,
        severity,
        title,
        description: description.trim(),
        timestamp: new Date().toISOString(),
        city: city.trim() || 'Unknown City',
        state: state || 'Maharashtra',
        authorName: authorName.trim() ? authorName.trim() : 'Citizen Reporter',
        mediaUrl: mediaUrl || undefined,
        syncStatus: 'pending',
        retryCount: 0,
        idempotencyKey: `idemp-${pendingId}`
      };

      await offlineStorage.queuePendingReport(pendingReport);

      const localEvent: WeatherEvent = {
        id: pendingId,
        source: 'citizen',
        sourceAuthor: authorName.trim() ? `${authorName.trim()} (Citizen - Offline)` : 'Citizen Reporter (Offline)',
        timestamp: pendingReport.timestamp,
        city: pendingReport.city,
        state: pendingReport.state,
        latitude: pendingReport.latitude,
        longitude: pendingReport.longitude,
        category,
        severity,
        title,
        description: description.trim(),
        rawText: description.trim(),
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaUrl ? 'image' : 'none',
        verificationStatus: 'unverified',
        confidenceScore: 75,
        flagReason: 'Offline Emergency Mode: Stored locally on device. Will auto-sync when network returns.'
      };

      saveUserReport(localEvent);
      onReportSubmitted(localEvent);

      setSubmissionResult({
        event: localEvent,
        isDuplicate: false,
        isFlagged: false,
        isOfflineQueued: true
      });

      if (onMoodChange) {
        onMoodChange(category);
      }
      return;
    }

    // 2. Real-Time IMD Synoptic API Cross-Validation Check (Online)
    setIsCrossCheckingImd(true);
    let imdCheck: ImdCrossCheckResult | null = null;
    try {
      imdCheck = await crossValidateWithImdApi(
        Number(latitude) || 19.0760, 
        Number(longitude) || 72.8777, 
        category
      );
    } catch (err) {
      console.warn('IMD API live cross check error:', err);
    }
    setIsCrossCheckingImd(false);
    setImdCrossCheckResult(imdCheck);

    const isVerifiedByImd = Boolean(imdCheck?.isMatchedWithImd);

    const title = `${CATEGORY_CONFIG[category].label} in ${city}`;

    const result = addEventWithProcessing({
      source: 'citizen',
      sourceAuthor: authorName.trim() ? `${authorName.trim()} (Citizen)` : 'Citizen Reporter',
      timestamp: new Date().toISOString(),
      city: city.trim() || 'Unknown City',
      state: state || 'Maharashtra',
      latitude: Number(latitude) || 19.0760,
      longitude: Number(longitude) || 72.8777,
      category,
      severity,
      title,
      description: description.trim(),
      rawText: description.trim(),
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaUrl ? 'image' : 'none',
      isImdCorroborated: isVerifiedByImd,
      imdCrossCheckResult: imdCheck ? {
        isMatched: imdCheck.isMatchedWithImd,
        imdCategory: imdCheck.imdCategory,
        note: imdCheck.explanation
      } : undefined
    });

    // If processing engine marked it as contradictory or auto-deleted
    if (result.isFlagged && result.event.isContradictory) {
      setContradictionAlert({
        reason: result.flagReason || 'Report contradicts itself and was automatically discarded.',
        term: 'Contradiction'
      });
      return;
    }

    setSubmissionResult(result);
    onReportSubmitted(result.event);

    // Save a copy to user's personal report history
    saveUserReport(result.event);

    if (onMoodChange) {
      onMoodChange(category);
    }

    // Confetti only if verified by IMD API
    if (isVerifiedByImd) {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleResetModal = () => {
    setSubmissionResult(null);
    setContradictionAlert(null);
    setImdCrossCheckResult(null);
    setDescription('');
    setMediaUrl('');
    onClose();
  };

  const categories: EventCategory[] = [
    'rainfall',
    'thunderstorm',
    'flooding',
    'heatwave',
    'fog',
    'dust storm',
    'strong wind'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-8">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-700">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Report Weather Incident
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Submit live crowdsourced observation to the IMD National Grid
              </p>
            </div>
          </div>

          <button
            onClick={handleResetModal}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Contradiction Alert Box (Auto-Delete Notice) */}
          {contradictionAlert && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2 animate-in fade-in">
              <div className="flex items-center space-x-2 font-bold text-sm text-rose-700">
                <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <span>Report Rejected & Auto-Deleted: Contradiction Detected</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-700">
                {contradictionAlert.reason}
              </p>
              <div className="text-[11px] text-rose-800 bg-white/90 p-2.5 rounded-xl border border-rose-200">
                ⚠️ <strong>AI Contradiction Rule:</strong> A report claiming <strong>{CATEGORY_CONFIG[category].label}</strong> cannot simultaneously state <strong>"{contradictionAlert.term}"</strong>. Contradictory records corrupt the national meteorological alert system and are discarded immediately.
              </div>
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setContradictionAlert(null)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition-colors cursor-pointer"
                >
                  Edit and Correct Report
                </button>
              </div>
            </div>
          )}

          {submissionResult ? (
            <div className="text-center py-6 space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm ${
                submissionResult.isOfflineQueued
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : submissionResult.event.isImdCorroborated || submissionResult.event.verificationStatus === 'verified'
                  ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                  : 'bg-amber-100 text-amber-600 border border-amber-200'
              }`}>
                {submissionResult.isOfflineQueued ? (
                  <WifiOff className="w-8 h-8" />
                ) : submissionResult.event.isImdCorroborated || submissionResult.event.verificationStatus === 'verified' ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <Clock className="w-8 h-8" />
                )}
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  {submissionResult.isOfflineQueued
                    ? 'Saved Locally — Queued for Automatic Sync!'
                    : submissionResult.event.isImdCorroborated || submissionResult.event.verificationStatus === 'verified'
                    ? 'Verified by IMD API & Published to Live Map!'
                    : 'Report Logged — Held in Triage (Hidden from Map)'}
                </h4>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  Incident Reference: <strong>{submissionResult.event.id}</strong>
                </p>
              </div>

              {/* IMD API Verification or Offline Queue Badge */}
              {submissionResult.isOfflineQueued ? (
                <div className="p-4 rounded-2xl border text-left text-xs font-medium bg-amber-50 border-amber-200 text-amber-950 space-y-2">
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="flex items-center space-x-1.5 text-amber-900">
                      <WifiOff className="w-4 h-4 text-amber-600" />
                      <span>DISASTER OFFLINE QUEUE: STORED ON DEVICE</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900">
                      Auto-Sync Active
                    </span>
                  </div>

                  <p className="text-amber-900 leading-relaxed">
                    Your weather observation has been securely written to browser IndexedDB storage. As soon as cellular network or Wi-Fi returns, CloudNet will automatically transmit and corroborate this report with the national server.
                  </p>

                  <div className="text-[11px] font-mono bg-white/90 p-2.5 rounded-xl border border-amber-200 text-amber-800 space-y-0.5">
                    <div>Status: <strong>PENDING RECONNECT SYNC</strong></div>
                    <div>Local Area: <strong>{city}, {state}</strong></div>
                    <div>Timestamp: <strong>{new Date().toLocaleTimeString()}</strong></div>
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border text-left text-xs font-medium ${
                  submissionResult.event.isImdCorroborated || submissionResult.event.verificationStatus === 'verified'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}>
                  <div className="flex items-center justify-between font-bold mb-1.5">
                    <span className="flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {submissionResult.event.isImdCorroborated 
                          ? 'IMD API Corroboration: MATCH CONFIRMED' 
                          : 'IMD API Corroboration: DIVERGENCE (PENDING TRIAGE)'}
                      </span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      submissionResult.event.isImdCorroborated ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {submissionResult.event.isImdCorroborated ? 'Live on Map' : 'Held in Triage'}
                    </span>
                  </div>

                  <p className="text-slate-700 text-xs leading-relaxed">
                    {submissionResult.event.isImdCorroborated
                      ? `✓ Real-time telemetry from IMD station network in ${city} confirms matching atmospheric conditions. Your report is now directly visible on the National Live Map.`
                      : `⚠️ The current IMD synoptic station in ${city} does not yet observe this weather anomaly. To prevent public misinformation, your report is securely stored in the Officer Verification Queue and is HIDDEN from the public map until verified.`}
                  </p>

                  {submissionResult.event.imdCrossCheckResult?.note && (
                    <div className="mt-2 text-[11px] font-mono bg-white/90 p-2 rounded-xl border border-slate-200 text-slate-600">
                      IMD Station Telemetry: {submissionResult.event.imdCrossCheckResult.note}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 flex justify-center space-x-3">
                <button
                  onClick={handleResetModal}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                >
                  {submissionResult.isOfflineQueued ? 'Return to Emergency View' : submissionResult.event.isImdCorroborated ? 'View on Live Map' : 'Close and Return'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">

              {/* Offline notice in form */}
              {connectivityManager.getEffectiveStatus() === 'offline' && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center space-x-2 text-amber-950 text-xs font-medium">
                  <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Offline Emergency Mode:</strong> Cellular network is unreachable. Your report will be saved locally to device memory and uploaded automatically when signal returns.
                  </span>
                </div>
              )}
              
              {/* Step 1: Select Event Category */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  1. What weather event are you observing? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categories.map(catKey => {
                    const config = CATEGORY_CONFIG[catKey];
                    const isSelected = category === catKey;

                    return (
                      <button
                        type="button"
                        key={catKey}
                        onClick={() => {
                          setCategory(catKey);
                          setContradictionAlert(null);
                        }}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                        style={{ background: isSelected ? `${config.bgHex}` : undefined }}
                      >
                        <div className="text-xl mb-1">{config.emoji}</div>
                        <div className="font-bold text-slate-900 text-xs">{config.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Location & GPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-bold">
                    2. Location & Coordinates <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isLocating}
                    className="text-sky-600 hover:text-sky-700 font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{isLocating ? 'Detecting GPS...' : 'Use Device GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 text-[11px] font-semibold mb-1">City</label>
                    <select
                      value={city}
                      onChange={(e) => handleCitySelect(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs appearance-none cursor-pointer font-semibold"
                    >
                      {MAJOR_INDIAN_CITIES.map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[11px] font-semibold mb-1">State</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs appearance-none cursor-pointer font-semibold"
                    >
                      {INDIAN_STATES.filter(s => s !== 'All States').map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {locationSuccess && (
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Exact GPS coordinates captured: {latitude}, {longitude}
                  </p>
                )}
              </div>

              {/* Step 3: Description & Observations */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  3. Description & Observations <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (contradictionAlert) setContradictionAlert(null);
                  }}
                  placeholder="Describe what you see (e.g. heavy downpour, strong gusts)... Do NOT submit conflicting claims (e.g. rain on a sunny day)."
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs resize-none font-medium"
                  required
                />
              </div>

              {/* Photo Evidence */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-bold">
                    4. Photo Proof (Optional)
                  </label>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-400 font-medium">Quick Demo:</span>
                    {PRESET_DEMO_PHOTOS.map(p => (
                      <button
                        type="button"
                        key={p.label}
                        onClick={() => setMediaUrl(p.url)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all cursor-pointer ${
                          mediaUrl === p.url
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {mediaUrl && (
                  <div className="relative rounded-2xl overflow-hidden h-28 border border-slate-200 mt-1 shadow-sm">
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMediaUrl('')}
                      className="absolute top-2 right-2 p-1 bg-slate-900/80 text-white rounded-lg hover:bg-slate-900 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCrossCheckingImd}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm shadow-md shadow-sky-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isCrossCheckingImd ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying against Live IMD Weather API...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit & Verify via IMD API</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
