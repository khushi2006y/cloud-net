import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CopyCheck, 
  Trash2, 
  Search, 
  Download, 
  CheckCircle, 
  Eye, 
  Lock, 
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { WeatherEvent, VerificationStatus } from '../types/weather';
import { CATEGORY_CONFIG } from '../data/initialEvents';
import { 
  updateEventStatus, 
  deleteEvent, 
  exportEventsAsCsv, 
  exportEventsAsJson,
  resetToSeedData
} from '../services/storage';

interface AdminPanelProps {
  events: WeatherEvent[];
  setEvents: React.Dispatch<React.SetStateAction<WeatherEvent[]>>;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (authed: boolean) => void;
  onOpenLoginModal: () => void;
  onInspectEvent: (event: WeatherEvent) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  events,
  setEvents,
  isAdminAuthenticated,
  onOpenLoginModal,
  onInspectEvent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'confidence' | 'severity'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 40;

  if (!isAdminAuthenticated) {
    return (
      <div className="glass-card p-12 rounded-3xl text-center max-w-lg mx-auto my-12 space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto border border-sky-200">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">
            IMD Operational Verification Console
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Authorized meteorological officers only. Authenticate to triage unverified citizen reports and confirm national warnings.
          </p>
        </div>

        <div className="pt-3">
          <button
            onClick={onOpenLoginModal}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            Unlock Console (PIN: admin123)
          </button>
        </div>
      </div>
    );
  }

  const handleVerify = (id: string) => {
    const updated = updateEventStatus(id, 'verified');
    setEvents(updated);
  };

  const handleFlag = (id: string) => {
    const reason = prompt('Enter flag/spam reason:', 'Failed meteorological corroboration or suspicious promotional content.');
    if (reason !== null) {
      const updated = updateEventStatus(id, 'flagged', reason);
      setEvents(updated);
    }
  };

  const handleDuplicate = (id: string) => {
    const updated = updateEventStatus(id, 'duplicate');
    setEvents(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this event record permanently?')) {
      const updated = deleteEvent(id);
      setEvents(updated);
    }
  };

  const handleResetData = () => {
    if (confirm('Reset database to default seed weather dataset?')) {
      const reset = resetToSeedData();
      setEvents(reset);
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.sourceAuthor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || e.verificationStatus === statusFilter;
    const matchesSource = sourceFilter === 'all' || e.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  }).sort((a, b) => {
    if (sortBy === 'time') {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? tB - tA : tA - tB;
    } else if (sortBy === 'confidence') {
      return sortOrder === 'desc' ? b.confidenceScore - a.confidenceScore : a.confidenceScore - b.confidenceScore;
    } else {
      const sevOrder = { extreme: 4, severe: 3, moderate: 2, low: 1 };
      const sA = sevOrder[a.severity] || 0;
      const sB = sevOrder[b.severity] || 0;
      return sortOrder === 'desc' ? sB - sA : sA - sB;
    }
  });

  const verifiedTotal = events.filter(e => e.verificationStatus === 'verified').length;
  const unverifiedTotal = events.filter(e => e.verificationStatus === 'unverified').length;
  const flaggedTotal = events.filter(e => e.verificationStatus === 'flagged').length;

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      
      {/* Header & Export Actions */}
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">
              National Incident Verification & Moderation Console
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review crowdsourced reports, verify sensor alerts, and manage duplicate incident clusters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => exportEventsAsCsv(filteredEvents)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => exportEventsAsJson(filteredEvents)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleResetData}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 transition-all cursor-pointer shadow-xs"
            title="Reset Database to Seed State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* Triage Status Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-md'
              : 'glass-card text-slate-700 hover:bg-white'
          }`}
        >
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">All Records</div>
          <div className="text-2xl font-black font-sans mt-0.5">{events.length}</div>
        </button>

        <button
          onClick={() => { setStatusFilter('unverified'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'unverified'
              ? 'bg-amber-500 text-white shadow-md'
              : 'glass-card text-amber-900 hover:bg-white'
          }`}
        >
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Triage</div>
          <div className="text-2xl font-black font-sans mt-0.5">{unverifiedTotal}</div>
        </button>

        <button
          onClick={() => { setStatusFilter('verified'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'verified'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'glass-card text-emerald-900 hover:bg-white'
          }`}
        >
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Verified</div>
          <div className="text-2xl font-black font-sans mt-0.5">{verifiedTotal}</div>
        </button>

        <button
          onClick={() => { setStatusFilter('flagged'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'flagged'
              ? 'bg-rose-600 text-white shadow-md'
              : 'glass-card text-rose-900 hover:bg-white'
          }`}
        >
          <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">Flagged Spam</div>
          <div className="text-2xl font-black font-sans mt-0.5">{flaggedTotal}</div>
        </button>
      </div>

      {/* Table Search & Controls */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, city, reporter or keywords..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full glass-input pl-10 pr-3 py-2 rounded-xl text-xs font-medium"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs font-semibold">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs appearance-none cursor-pointer text-slate-800 font-semibold"
            >
              <option value="time">Timestamp</option>
              <option value="confidence">Confidence Score</option>
              <option value="severity">Severity</option>
            </select>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1.5 rounded-xl bg-white text-slate-700 border border-slate-200 text-xs shadow-xs"
          >
            {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
          </button>
        </div>
      </div>

      {/* High-Density Moderation Data Table */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-lg border border-white/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Event & ID</th>
                <th className="py-3.5 px-3">Location & Time</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">Source</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">AI Score</th>
                <th className="py-3.5 px-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No reports match the current moderation filters.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map(event => {
                  const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.rainfall;

                  return (
                    <tr key={event.id} className="hover:bg-sky-50/50 transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-mono text-[10px] text-sky-700 font-bold">{event.id}</div>
                        <div className="font-bold text-slate-900 truncate mt-0.5">
                          {event.title}
                        </div>
                        {event.flagReason && (
                          <div className="text-[10px] text-rose-600 mt-0.5 line-clamp-1 font-medium">
                            ⚠️ {event.flagReason}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{event.city}, {event.state}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span 
                          className="px-2 py-0.5 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1"
                          style={{ background: config.bgHex, color: config.color, border: `1px solid ${config.color}40` }}
                        >
                          <span>{config.emoji}</span>
                          <span>{config.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
                          {event.source}
                        </span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5">
                          {event.sourceAuthor}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          event.verificationStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : event.verificationStatus === 'flagged'
                            ? 'bg-rose-100 text-rose-800'
                            : event.verificationStatus === 'duplicate'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {event.verificationStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {event.confidenceScore}%
                          </span>
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${event.confidenceScore}%` }}
                              className={`h-full ${
                                event.confidenceScore >= 80 ? 'bg-emerald-500' :
                                event.confidenceScore >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onInspectEvent(event)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleVerify(event.id)}
                            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"
                            title="Mark Verified"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleFlag(event.id)}
                            className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors"
                            title="Flag Spam"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(event.id)}
                            className="p-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors"
                            title="Mark Duplicate"
                          >
                            <CopyCheck className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(event.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-700 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs">
            <span className="text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * pageSize, filteredEvents.length)}</strong> of <strong className="text-slate-800">{filteredEvents.length}</strong> events
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono font-bold text-slate-800 px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
