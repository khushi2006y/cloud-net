import React from 'react';
import { 
  Cloud, 
  ShieldCheck, 
  Radio, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  ExternalLink,
  Info,
  Lock,
  Cpu,
  Globe
} from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      
      {/* Hero Header */}
      <div className="glass-card p-8 rounded-3xl border border-white/80 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200">
            <Cloud className="w-3.5 h-3.5 text-sky-600" />
            <span>National Weather Intelligence Platform</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            CloudNet: Authoritative Real-Time Weather Incident Intelligence
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed">
            CloudNet synthesizes observational station telemetry, satellite radar streams, and verified citizen reports across India.
            Every incident displayed on our public map is evaluated against physical meteorological invariants before publication.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-700 w-fit">
            <Radio className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-base">Observational Telemetry</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Real-time synoptic atmospheric telemetry queried continuously from <strong>Open-Meteo Synoptic APIs</strong>, capturing precipitation rates, ambient temperature, relative humidity, and surface wind vectors.
          </p>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 w-fit">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-base">Truth-Aware Map Architecture</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Raw citizen reports are never rendered as confirmed weather truth. Reports are rigorously cross-checked against nearby station telemetry to prevent panic, spam, and viral misinformation.
          </p>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700 w-fit">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-base">Evidence Fusion Engine</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Multi-source corroboration engine mathematically computes confidence scores based on spatial proximity, multi-source independence DAGs, and physical meteorological feasibility.
          </p>
        </div>
      </div>

      {/* The 7 Truth Display Policies */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-sky-600" />
          <h2 className="text-base font-extrabold text-slate-900">
            The 7 Authoritative Verification & Display Policies
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          CloudNet enforces a strict 7-state display policy contract. The map UI never guesses verification state — all rendering is authoritatively commanded by the backend verification engine:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-emerald-900 font-mono">1. SHOW_VERIFIED</span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">Standard</span>
            </div>
            <p className="text-xs text-slate-600 leading-snug">
              High-confidence incident supported by observational telemetry and verified source provenance. Rendered in full category color.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-sky-900 font-mono">2. SHOW_CORROBORATED</span>
              <span className="text-[10px] bg-sky-200 text-sky-900 px-1.5 py-0.2 rounded font-bold">Multi-Source</span>
            </div>
            <p className="text-xs text-slate-600 leading-snug">
              Corroborated by 2 or more independent sources (e.g. citizen + station telemetry). Rendered with a distinctive cyan corroboration badge.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-amber-900 font-mono">3. SHOW_PROVISIONAL</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">Pending Corroboration</span>
            </div>
            <p className="text-xs text-slate-600 leading-snug">
              Initial observation logged with moderate confidence (40-69%) awaiting telemetric corroboration. Rendered with dashed border.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-slate-800 font-mono">4. HIDE_UNVERIFIED</span>
              <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-bold">Quarantined</span>
            </div>
            <p className="text-xs text-slate-600 leading-snug">
              Low-confidence single-source report. Hidden from public map by default to prevent panic; accessible in the optional Flagged Reports Layer.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-rose-900 font-mono">5. SHOW_CONTRADICTED</span>
              <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded font-bold">Refuted</span>
            </div>
            <p className="text-xs text-slate-600 leading-snug">
              Refuted by physical telemetry (e.g. 0.0mm rain recorded during claimed flood). Never shown on public map; inspectable via the Contradiction Audit Card.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-purple-900 font-mono">6. ATTACH_DUPLICATE</span>
              <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded font-bold">Clustered</span>
            </div>
            <p className="text-xs text-slate-600 leading-snug">
              Spatio-temporal duplicate of an ongoing incident. Does not spawn a new pin; increments parent cluster duplicate count.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 sm:col-span-2 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-slate-700 font-mono">7. SHOW_STALE</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">Historical</span>
            </div>
            <p className="text-xs text-slate-600 leading-snug">
              Events older than 3 hours without fresh updates. Desaturated/grayscale with visible &ldquo;STALE&rdquo; tag and original observation timestamp.
            </p>
          </div>
        </div>
      </div>

      {/* Data Attribution & Open Standards */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-sky-600" />
          <h2 className="text-base font-extrabold text-slate-900">Data Sources & Attribution</h2>
        </div>
        
        <p className="text-xs text-slate-600 leading-relaxed">
          CloudNet operates on open, verifiable meteorological data feeds:
        </p>

        <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <li>
            <strong>Open-Meteo Weather API:</strong> High-resolution weather models, hourly precipitation, atmospheric pressure, relative humidity, and wind vectors. Attributed as Open-Meteo telemetry.
          </li>
          <li>
            <strong>OpenStreetMap Contributors:</strong> Geographic basemaps and sovereign bounding geometries.
          </li>
          <li>
            <strong>Community Weather Spotters:</strong> Geotagged citizen observations with cryptographic timestamping and automated duplicate filtering.
          </li>
        </ul>

        <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-[11px] text-sky-900">
          <strong>Transparency Notice:</strong> All confidence numbers represent mathematical evidence fusion scores (e.g. &ldquo;Evidence Confidence: 85/100 (Verified)&rdquo;) rather than absolute truth guarantees. Physical ground measurements always supersede uncorroborated social reports.
        </div>
      </div>

    </div>
  );
};
