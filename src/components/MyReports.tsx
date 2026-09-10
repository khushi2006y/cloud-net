import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  PlusCircle,
  Clock,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Copy,
  Trash2,
  RefreshCw,
  AlertCircle,
  WifiOff,
  Send,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { WeatherEvent } from '../types/weather';
import { getUserReports, clearUserReports } from '../services/storage';
import { CATEGORY_CONFIG } from '../data/initialEvents';
import { offlineStorage, PendingReport } from '../services/offlineStorage';
import { syncQueue } from '../services/syncQueue';
import { useConnectivity } from '../services/connectivityService';

interface MyReportsProps {
  onOpenCitizenModal: () => void;
  onInspectEvent: (event: WeatherEvent) => void;
}

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  severe: 'bg-orange-50 text-orange-700 border-orange-200',
  extreme: 'bg-rose-50 text-rose-800 border-rose-200',
};

const VERIFICATION_META: Record<string, { label: string; icon: React.FC<any>; badge: string }> = {
  verified: {
    label: 'Verified',
    icon: ShieldCheck,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  unverified: {
    label: 'Pending',
    icon: AlertCircle,
    badge: 'bg-slate-50 text-slate-600 border-slate-200',
  },
  flagged: {
    label: 'Flagged',
    icon: ShieldAlert,
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  duplicate: {
    label: 'Duplicate',
    icon: Copy,
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export const MyReports: React.FC<MyReportsProps> = ({ onOpenCitizenModal, onInspectEvent }) => {
  const [reports, setReports] = useState<WeatherEvent[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { isOnline } = useConnectivity();

  const reload = () => {
    setReports(getUserReports());
    offlineStorage.getPendingReports().then((p) => setPendingReports(p));
  };

  useEffect(() => {
    reload();

    const onStorage = () => reload();
    const onPending = () => {
      offlineStorage.getPendingReports().then((p) => setPendingReports(p));
    };

    window.addEventListener('cloudnet_events_updated', onStorage);
    window.addEventListener('cloudnet_pending_reports_changed', onPending);
    window.addEventListener('cloudnet_reports_synced', onStorage);

    return () => {
      window.removeEventListener('cloudnet_events_updated', onStorage);
      window.removeEventListener('cloudnet_pending_reports_changed', onPending);
      window.removeEventListener('cloudnet_reports_synced', onStorage);
    };
  }, []);

  const handleClear = () => {
    clearUserReports();
    setReports([]);
    setShowClearConfirm(false);
  };

  const handleSyncPendingNow = async () => {
    setIsSyncing(true);
    await syncQueue.syncPendingReports();
    reload();
    setIsSyncing(false);
  };

  const handleDeletePending = async (id: string) => {
    await offlineStorage.removePendingReport(id);
    const updated = await offlineStorage.getPendingReports();
    setPendingReports(updated);
  };

  const pendingUnsynced = pendingReports.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed');

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="glass-card rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Reports</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Your personal weather incident submissions
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={reload}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all border border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          {reports.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-all border border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          <button
            onClick={onOpenCitizenModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Report</span>
          </button>
        </div>
      </div>

      {/* Clear Confirm Banner */}
      {showClearConfirm && (
        <div className="glass-card rounded-2xl px-5 py-4 border-rose-200 bg-rose-50/80 flex items-center justify-between">
          <p className="text-sm font-semibold text-rose-800">
            ⚠️ Clear all {reports.length} personal report records? This cannot be undone.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-sm"
            >
              Yes, Clear
            </button>
          </div>
        </div>
      )}

      {/* Offline Pending Upload Queue Card */}
      {pendingReports.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border-amber-200 bg-amber-50/70 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-200/80 text-amber-800">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <span>Offline Citizen Upload Queue</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-200 text-amber-900">
                    {pendingUnsynced.length} Pending Sync
                  </span>
                </h3>
                <p className="text-xs text-slate-600">
                  Incident reports stored locally in IndexedDB while device was offline.
                </p>
              </div>
            </div>

            {isOnline && pendingUnsynced.length > 0 && (
              <button
                onClick={handleSyncPendingNow}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'Synchronizing…' : 'Sync Queue Now'}</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-amber-200/60 border border-amber-200/60 rounded-xl bg-white/80 overflow-hidden">
            {pendingReports.map((pending) => (
              <div key={pending.id} className="p-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <span>{pending.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">({pending.id})</span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{pending.description}</p>
                  <div className="text-[10px] text-slate-400">
                    {new Date(pending.timestamp).toLocaleString()} • {pending.city}, {pending.state}
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    pending.syncStatus === 'synced'
                      ? 'bg-emerald-100 text-emerald-800'
                      : pending.syncStatus === 'syncing'
                      ? 'bg-sky-100 text-sky-800 animate-pulse'
                      : pending.syncStatus === 'failed'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {pending.syncStatus === 'synced' ? '✓ Synced' : pending.syncStatus === 'syncing' ? 'Syncing…' : pending.syncStatus === 'failed' ? 'Failed' : 'Pending Reconnect'}
                  </span>

                  <button
                    onClick={() => handleDeletePending(pending.id)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Submitted', value: reports.length, color: 'text-slate-900' },
            {
              label: 'Verified',
              value: reports.filter(r => r.verificationStatus === 'verified').length,
              color: 'text-emerald-700',
            },
            {
              label: 'Pending Review',
              value: reports.filter(r => r.verificationStatus === 'unverified').length,
              color: 'text-amber-700',
            },
            {
              label: 'Avg Evidence Score',
              value: `${Math.round(reports.reduce((s, r) => s + (r.confidenceScore || 0), 0) / (reports.length || 1))}/100`,
              color: 'text-sky-700',
            },
          ].map(stat => (
            <div key={stat.label} className="glass-card rounded-2xl px-4 py-3">
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="glass-card rounded-2xl px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-violet-400" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-2">No Reports Yet</h3>
          <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto mb-6">
            You haven't submitted any weather observations yet. Be the first to report a live event in your area.
          </p>
          <button
            onClick={onOpenCitizenModal}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 hover:scale-[1.02] transition-all"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Submit Your First Report</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, idx) => {
            const catConfig = CATEGORY_CONFIG[report.category];
            const verMeta = VERIFICATION_META[report.verificationStatus] || VERIFICATION_META.unverified;
            const VerIcon = verMeta.icon;

            return (
              <button
                key={report.id}
                onClick={() => onInspectEvent(report)}
                className="glass-card glass-card-hover w-full rounded-2xl px-5 py-4 flex items-start space-x-4 text-left cursor-pointer"
              >
                {/* Category Emoji */}
                <div
                  className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 text-xl shadow-sm border"
                  style={{ background: catConfig.bgHex, borderColor: catConfig.bgHex }}
                >
                  {catConfig.emoji}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 leading-snug truncate">{report.title}</p>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0 mt-0.5">
                      #{idx + 1}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    {/* Location */}
                    <span className="flex items-center space-x-1 text-[10px] text-slate-500 font-medium">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{report.city}, {report.state}</span>
                    </span>

                    {/* Time */}
                    <span className="flex items-center space-x-1 text-[10px] text-slate-400 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{timeAgo(report.timestamp)}</span>
                    </span>

                    {/* Severity */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${SEVERITY_BADGE[report.severity] || ''}`}>
                      {report.severity.toUpperCase()}
                    </span>

                    {/* Verification */}
                    <span className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${verMeta.badge}`}>
                      <VerIcon className="w-3 h-3" />
                      <span>{verMeta.label}</span>
                    </span>

                    {/* Confidence */}
                    <span className="text-[10px] text-slate-500 font-medium">
                      Evidence Confidence: {Math.round(report.confidenceScore ?? 50)}/100
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
