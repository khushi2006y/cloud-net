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
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EventCategory, SeverityLevel, WeatherEvent, WeatherMood } from '../types/weather';
import { CATEGORY_CONFIG, INDIAN_STATES, MAJOR_INDIAN_CITIES } from '../data/initialEvents';
import { addEventWithProcessing } from '../services/storage';

interface CitizenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: (newEvent: WeatherEvent) => void;
  onMoodChange?: (mood: WeatherMood) => void;
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
  onMoodChange
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
  const [submissionResult, setSubmissionResult] = useState<{
    event: WeatherEvent;
    isDuplicate: boolean;
    isFlagged: boolean;
    flagReason?: string;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      alert('Please describe what you are observing.');
      return;
    }

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
      mediaType: mediaUrl ? 'image' : 'none'
    });

    setSubmissionResult(result);
    onReportSubmitted(result.event);
    
    if (onMoodChange) {
      onMoodChange(category);
    }

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleResetModal = () => {
    setSubmissionResult(null);
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
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submissionResult ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">Report Successfully Logged!</h4>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  Incident Reference: <strong>{submissionResult.event.id}</strong>
                </p>
              </div>

              <div className={`p-4 rounded-2xl border text-left text-xs font-medium ${
                submissionResult.isDuplicate
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : submissionResult.isFlagged
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center space-x-2 font-bold mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>AI Verification Result: {submissionResult.event.verificationStatus.toUpperCase()}</span>
                </div>
                
                {submissionResult.isDuplicate && (
                  <p className="text-slate-600">
                    Nearby event detected in {submissionResult.event.city}. Merged into active incident cluster.
                  </p>
                )}

                {submissionResult.isFlagged && (
                  <p className="text-slate-600">
                    {submissionResult.flagReason}
                  </p>
                )}

                {!submissionResult.isDuplicate && !submissionResult.isFlagged && (
                  <p className="text-slate-600">
                    Clean report accepted with an initial AI confidence rating of {submissionResult.event.confidenceScore}%.
                  </p>
                )}
              </div>

              <div className="pt-3 flex justify-center">
                <button
                  onClick={handleResetModal}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                >
                  View on Live Map
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Step 1: Select Event Category */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  1. What weather event are you seeing? <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categories.map(catKey => {
                    const config = CATEGORY_CONFIG[catKey];
                    const isSelected = category === catKey;

                    return (
                      <button
                        type="button"
                        key={catKey}
                        onClick={() => setCategory(catKey)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-102'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xl">{config.emoji}</span>
                        <span className="text-[11px] truncate w-full">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Location with 1-Click GPS */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-800 font-bold flex items-center">
                    <MapPin className="w-4 h-4 text-sky-600 mr-1" /> 2. Location
                  </span>

                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isLocating}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Detecting GPS...' : '1-Tap Auto GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 text-[11px] font-semibold mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => handleCitySelect(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold"
                      required
                    />
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

              {/* Step 3: Description & Severity */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  3. Description & Observations <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the intensity (e.g. 2 feet water on road, trees shaking, heavy thunder)..."
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
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all ${
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
                      className="absolute top-2 right-2 p-1 bg-slate-900/80 text-white rounded-lg hover:bg-slate-900"
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
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm shadow-md shadow-sky-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Weather Observation</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
