import React, { useState, useMemo } from 'react';
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
  ChevronRight,
  Filter,
  Calendar,
  MapPin,
  Flame,
  CloudRain,
  BrainCircuit,
  Bot,
  Layers,
  BarChart3,
  CheckCheck,
  Radio,
  FileCheck2,
  XCircle,
  Clock
} from 'lucide-react';
import { WeatherEvent, VerificationStatus, EventCategory, SourceTrustLevel } from '../types/weather';
import { CATEGORY_CONFIG, INDIAN_STATES, MAJOR_INDIAN_DISTRICTS, DistrictNode } from '../data/initialEvents';
import { 
  updateEventStatus, 
  deleteEvent, 
  exportEventsAsCsv, 
  exportEventsAsJson,
  resetToSeedData,
  mergeDuplicateCluster,
  batchVerifyEvents
} from '../services/storage';
import { findDuplicateClusters } from '../services/processingEngine';
import { apiClient } from '../services/apiClient';

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
  // Navigation & Sub-views
  const [activeAdminTab, setActiveAdminTab] = useState<'registry' | 'ai_fake_audit' | 'dedup_clusters' | 'untrusted_sources' | 'nlp_categories'>('registry');

  // Multi-Dimensional Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | EventCategory>('all');
  const [stateFilter, setStateFilter] = useState<string>('All States');
  const [districtFilter, setDistrictFilter] = useState<string>('All Districts');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '24h' | '7d' | '30d'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<'time' | 'confidence' | 'severity' | 'credibility'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 35;

  // Selected event checkboxes for batch actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Available districts for the selected state
  const availableDistricts = useMemo(() => {
    if (!stateFilter || stateFilter === 'All States') {
      return MAJOR_INDIAN_DISTRICTS;
    }
    return MAJOR_INDIAN_DISTRICTS.filter((d: DistrictNode) => d.state.toLowerCase() === stateFilter.toLowerCase());
  }, [stateFilter]);

  // Duplicate clusters
  const duplicateClusters = useMemo(() => {
    return findDuplicateClusters(events);
  }, [events]);

  if (!isAdminAuthenticated) {
    return (
      <div className="glass-card p-12 rounded-3xl text-center max-w-lg mx-auto my-12 space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto border border-sky-200">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">
            National Weather Big Data Moderation & Verification Console
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Authorized meteorological officers only. Access the AI Fake Report Detector, Untrusted Source Verifier, Deduplication Engine & National Incident Registry.
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

  // Action Handlers
  const handleVerify = async (id: string) => {
    const reason = prompt('Enter officer verification reason (mandatory for audit ledger):', 'IMD Doppler Radar corroboration and automated ground station agreement.') || 'Meteorological officer field verification';
    try {
      await apiClient.overrideEvent(id, 'VERIFIED', reason);
    } catch (e) {
      console.warn('[CloudNet Admin] Backend override sync fallback:', e);
    }
    const updated = updateEventStatus(id, 'verified', reason);
    setEvents(updated);
  };

  const handleFlag = async (id: string) => {
    const reason = prompt('Enter flag/contradiction reason (mandatory for audit ledger):', 'Failed meteorological cross-validation or suspicious promotional content.');
    if (reason !== null) {
      try {
        await apiClient.overrideEvent(id, 'FLAGGED', reason);
      } catch (e) {
        console.warn('[CloudNet Admin] Backend override sync fallback:', e);
      }
      const updated = updateEventStatus(id, 'flagged', reason);
      setEvents(updated);
    }
  };

  const handleDuplicate = async (id: string) => {
    const reason = prompt('Enter deduplication note (mandatory for audit ledger):', 'Identified as duplicate report within active spatial cluster.') || 'Duplicate event mapped to parent';
    try {
      await apiClient.overrideEvent(id, 'DUPLICATE', reason);
    } catch (e) {
      console.warn('[CloudNet Admin] Backend override sync fallback:', e);
    }
    const updated = updateEventStatus(id, 'duplicate', reason);
    setEvents(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this event record permanently?')) {
      const updated = deleteEvent(id);
      setEvents(updated);
    }
  };

  const handleMergeCluster = (clusterId: string, parentId: string, dupIds: string[]) => {
    if (confirm(`Consolidate ${dupIds.length} duplicate reports into primary event ${parentId}?`)) {
      const updated = mergeDuplicateCluster(parentId, dupIds);
      setEvents(updated);
      alert(`Successfully merged cluster! Duplicates linked to parent.`);
    }
  };

  const handleBatchVerifySelected = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Mark all ${selectedIds.length} selected reports as VERIFIED?`)) {
      const updated = batchVerifyEvents(selectedIds, 'verified');
      setEvents(updated);
      setSelectedIds([]);
    }
  };

  const handleResetData = () => {
    if (confirm('Reset database to default seed weather dataset?')) {
      const reset = resetToSeedData();
      setEvents(reset);
      setSelectedIds([]);
    }
  };

  // Multi-Dimensional Filtering Logic
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // 1. Search Filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          e.title.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.state.toLowerCase().includes(q) ||
          e.sourceAuthor.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 2. Verification Status Filter
      if (statusFilter !== 'all' && e.verificationStatus !== statusFilter) {
        return false;
      }

      // 3. Event-wise Category Filter
      if (categoryFilter !== 'all' && e.category !== categoryFilter) {
        return false;
      }

      // 4. Location-wise State Filter
      if (stateFilter !== 'All States' && e.state.toLowerCase() !== stateFilter.toLowerCase()) {
        return false;
      }

      // 5. Location-wise District Filter
      if (districtFilter !== 'All Districts' && e.city.toLowerCase() !== districtFilter.toLowerCase()) {
        return false;
      }

      // 6. Source Filter
      if (sourceFilter !== 'all' && e.source !== sourceFilter) {
        return false;
      }

      // 7. Date-wise Filter
      if (dateFilter !== 'all') {
        const eventTime = new Date(e.timestamp).getTime();
        const now = Date.now();
        if (dateFilter === 'today') {
          const todayStr = new Date().toDateString();
          const eventDateStr = new Date(e.timestamp).toDateString();
          if (todayStr !== eventDateStr) return false;
        } else if (dateFilter === '24h' && now - eventTime > 24 * 60 * 60 * 1000) {
          return false;
        } else if (dateFilter === '7d' && now - eventTime > 7 * 24 * 60 * 60 * 1000) {
          return false;
        } else if (dateFilter === '30d' && now - eventTime > 30 * 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'time') {
        const tA = new Date(a.timestamp).getTime();
        const tB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? tB - tA : tA - tB;
      } else if (sortBy === 'confidence') {
        return sortOrder === 'desc' ? b.confidenceScore - a.confidenceScore : a.confidenceScore - b.confidenceScore;
      } else if (sortBy === 'credibility') {
        const cA = a.credibilityScore ?? a.confidenceScore;
        const cB = b.credibilityScore ?? b.confidenceScore;
        return sortOrder === 'desc' ? cB - cA : cA - cB;
      } else {
        const sevOrder = { extreme: 4, severe: 3, moderate: 2, low: 1 };
        const sA = sevOrder[a.severity] || 0;
        const sB = sevOrder[b.severity] || 0;
        return sortOrder === 'desc' ? sB - sA : sA - sB;
      }
    });
  }, [events, searchTerm, statusFilter, categoryFilter, stateFilter, districtFilter, dateFilter, sourceFilter, sortBy, sortOrder]);

  // Status Metrics
  const verifiedTotal = events.filter(e => e.verificationStatus === 'verified').length;
  const unverifiedTotal = events.filter(e => e.verificationStatus === 'unverified').length;
  const flaggedTotal = events.filter(e => e.verificationStatus === 'flagged').length;
  const duplicatesTotal = events.filter(e => e.verificationStatus === 'duplicate').length;

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Toggle single row selection
  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Toggle select all on page
  const handleSelectAllOnPage = () => {
    const pageIds = paginatedEvents.map(e => e.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const categoriesList: EventCategory[] = [
    'clear',
    'rainfall',
    'thunderstorm',
    'flooding',
    'heatwave',
    'fog',
    'dust storm',
    'strong wind'
  ];

  return (
    <div className="space-y-6">
      
      {/* Header & Export Actions */}
      <div className="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">
              National Weather Incident Verification & Intelligence Admin Panel
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-source data ingestion, ML fake report audit, source verification, duplicate removal & NLP event classification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchVerifySelected}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-sm"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Verify Selected ({selectedIds.length})</span>
            </button>
          )}

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

      {/* Verification Status Tracking KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-md'
              : 'glass-card text-slate-700 hover:bg-white'
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">All Records</div>
          <div className="text-2xl font-black font-sans mt-0.5">{events.length}</div>
          <div className="text-[10px] opacity-75 mt-1">100% Ingested Grid</div>
        </button>

        <button
          onClick={() => { setStatusFilter('unverified'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'unverified'
              ? 'bg-amber-500 text-white shadow-md'
              : 'glass-card text-amber-900 hover:bg-white'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Triage</div>
          <div className="text-2xl font-black font-sans mt-0.5">{unverifiedTotal}</div>
          <div className="text-[10px] text-amber-600 mt-1">Awaiting Officer Action</div>
        </button>

        <button
          onClick={() => { setStatusFilter('verified'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'verified'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'glass-card text-emerald-900 hover:bg-white'
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Verified Clean</div>
          <div className="text-2xl font-black font-sans mt-0.5">{verifiedTotal}</div>
          <div className="text-[10px] text-emerald-600 mt-1">{Math.round((verifiedTotal / (events.length || 1)) * 100)}% reliability</div>
        </button>

        <button
          onClick={() => { setStatusFilter('flagged'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'flagged'
              ? 'bg-rose-600 text-white shadow-md'
              : 'glass-card text-rose-900 hover:bg-white'
          }`}
        >
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Flagged Fake / Spam</div>
          <div className="text-2xl font-black font-sans mt-0.5">{flaggedTotal}</div>
          <div className="text-[10px] text-rose-600 mt-1">AI Anomaly Intercepted</div>
        </button>

        <button
          onClick={() => { setStatusFilter('duplicate'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'duplicate'
              ? 'bg-purple-600 text-white shadow-md'
              : 'glass-card text-purple-900 hover:bg-white'
          }`}
        >
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Deduplicated</div>
          <div className="text-2xl font-black font-sans mt-0.5">{duplicatesTotal}</div>
          <div className="text-[10px] text-purple-600 mt-1">{duplicateClusters.length} Clusters Clustered</div>
        </button>
      </div>

      {/* Admin Intelligence Sub-Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveAdminTab('registry')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'registry'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Incident Moderation Registry ({filteredEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('ai_fake_audit')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'ai_fake_audit'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>AI Fake & Misleading Audit ({flaggedTotal})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('dedup_clusters')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'dedup_clusters'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <CopyCheck className="w-3.5 h-3.5" />
          <span>Deduplication & Cluster Manager ({duplicateClusters.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('untrusted_sources')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'untrusted_sources'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Untrusted Sources Verifier</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('nlp_categories')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeAdminTab === 'nlp_categories'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>NLP 7-Category Classifier</span>
        </button>
      </div>

      {/* Comprehensive Multi-Filter Bar: Date, Event, Location & Search */}
      <div className="glass-card p-4 rounded-2xl space-y-3 shadow-sm border border-slate-200/80">
        
        {/* Row 1: Search + Date-Wise Filtering + Location-Wise Filtering */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          
          {/* Keyword Search */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search keyword, reporter, city, ID, #hashtag..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full glass-input pl-9 pr-3 py-2 rounded-xl text-xs font-medium"
            />
          </div>

          {/* Date-wise filtering (User Requirement) */}
          <div className="md:col-span-2 relative">
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
                className="w-full bg-transparent text-xs font-semibold text-slate-700 appearance-none outline-none cursor-pointer"
                title="Date-wise filtering"
              >
                <option value="all">📅 All Dates</option>
                <option value="today">📅 Today Only</option>
                <option value="24h">🕒 Last 24 Hours</option>
                <option value="7d">🗓️ Last 7 Days</option>
                <option value="30d">🗓️ Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Location-wise State filtering (User Requirement) */}
          <div className="md:col-span-3 relative">
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <select
                value={stateFilter}
                onChange={(e) => { 
                  setStateFilter(e.target.value); 
                  setDistrictFilter('All Districts');
                  setCurrentPage(1); 
                }}
                className="w-full bg-transparent text-xs font-semibold text-slate-700 appearance-none outline-none cursor-pointer"
                title="Location-wise State filtering"
              >
                <option value="All States">🇮🇳 All States & UTs</option>
                {INDIAN_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location-wise District filtering (User Requirement) */}
          <div className="md:col-span-3 relative">
            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <select
                value={districtFilter}
                onChange={(e) => { setDistrictFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-transparent text-xs font-semibold text-slate-700 appearance-none outline-none cursor-pointer"
                title="Location-wise District filtering"
              >
                <option value="All Districts">📍 All Districts ({availableDistricts.length})</option>
                {availableDistricts.map(d => (
                  <option key={d.name} value={d.name}>{d.name} ({d.state})</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Row 2: Event-wise filtering for 7 IMD Categories */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-500 mr-1 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1 text-sky-600" /> Event Category:
            </span>

            <button
              onClick={() => { setCategoryFilter('all'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Categories
            </button>

            {categoriesList.map(cat => {
              const config = CATEGORY_CONFIG[cat];
              const isSelected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => { setCategoryFilter(cat); setCurrentPage(1); }}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{config.emoji}</span>
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sort & Order Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="time">Timestamp</option>
              <option value="confidence">AI Score</option>
              <option value="credibility">Credibility</option>
              <option value="severity">Severity</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold"
            >
              {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
            </button>
          </div>

        </div>

      </div>

      {/* VIEW 1: Main Incident Moderation Registry Table */}
      {activeAdminTab === 'registry' && (
        <div className="glass-card rounded-3xl overflow-hidden shadow-lg border border-white/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[11px] border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAllOnPage}
                      checked={paginatedEvents.length > 0 && paginatedEvents.every(e => selectedIds.includes(e.id))}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3">Event & ID</th>
                  <th className="py-3.5 px-3">Location & Time</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Source & Trust</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">AI / Credibility</th>
                  <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                      No reports match the current multi-dimensional filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map(event => {
                    const config = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.rainfall;
                    const isSelected = selectedIds.includes(event.id);

                    return (
                      <tr 
                        key={event.id} 
                        className={`hover:bg-sky-50/50 transition-colors ${isSelected ? 'bg-sky-50/70' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(event.id)}
                            className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-mono text-[10px] text-sky-700 font-bold">{event.id}</div>
                          <div className="font-bold text-slate-900 truncate mt-0.5">
                            {event.title}
                          </div>
                          {event.flagReason && (
                            <div className="text-[10px] text-rose-600 mt-0.5 line-clamp-1 font-semibold flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>{event.flagReason}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{event.city}, {event.state}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {new Date(event.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} • {new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
                          <div className="flex items-center space-x-1.5">
                            <span className="capitalize px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
                              {event.source}
                            </span>
                            {event.sourceTrustLevel && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                event.sourceTrustLevel === 'official' ? 'bg-emerald-100 text-emerald-800' :
                                event.sourceTrustLevel === 'trusted_media' ? 'bg-blue-100 text-blue-800' :
                                event.sourceTrustLevel === 'verified_citizen' ? 'bg-teal-100 text-teal-800' :
                                event.sourceTrustLevel === 'suspicious' ? 'bg-rose-100 text-rose-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {event.sourceTrustLevel}
                              </span>
                            )}
                          </div>
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
                            <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${event.confidenceScore}%` }}
                                className={`h-full ${
                                  event.confidenceScore >= 80 ? 'bg-emerald-500' :
                                  event.confidenceScore >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                                }`}
                              />
                            </div>
                          </div>
                          {event.credibilityScore !== undefined && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Trust: {event.credibilityScore}%
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => onInspectEvent(event)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Inspect Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleVerify(event.id)}
                              className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors cursor-pointer"
                              title="Mark Verified"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleFlag(event.id)}
                              className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors cursor-pointer"
                              title="Flag Fake/Spam"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDuplicate(event.id)}
                              className="p-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors cursor-pointer"
                              title="Mark Duplicate"
                            >
                              <CopyCheck className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDelete(event.id)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Delete Permanently"
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
                  className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-mono font-bold text-slate-800 px-2">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: AI Fake & Misleading Reports Audit Center */}
      {activeAdminTab === 'ai_fake_audit' && (
        <div className="space-y-4">
          <div className="glass-card p-4 rounded-2xl bg-rose-50/40 border border-rose-200/80 flex items-start space-x-3">
            <BrainCircuit className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-900 font-bold">AI Fake & Misleading Report Interception Engine:</strong>
              <p className="text-slate-600 mt-0.5">
                Our machine learning pipeline scans text for sensationalist clickbait vocabulary, verifies geographical boundaries (coordinates strictly within India), analyzes microclimate anomalies vs nearby IMD Doppler radar, and flags spam bots automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.filter(e => e.verificationStatus === 'flagged' || (e.aiFakeDetection && e.aiFakeDetection.isMisleading)).map(item => (
              <div key={item.id} className="glass-card p-5 rounded-3xl border border-rose-200 shadow-sm space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="font-mono text-[10px] font-bold text-rose-700">{item.id}</span>
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                    Suspicion: {item.aiFakeDetection?.suspicionScore ?? 85}%
                  </span>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                  "{item.description}"
                </p>

                {item.aiFakeDetection?.indicators && item.aiFakeDetection.indicators.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Flags Triggered:</span>
                    <ul className="text-xs text-rose-700 space-y-0.5">
                      {item.aiFakeDetection.indicators.map((ind, i) => (
                        <li key={i} className="flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                          <span>{ind}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">📍 {item.city}, {item.state}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleVerify(item.id)}
                      className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors cursor-pointer"
                    >
                      Override (Verify)
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1 rounded-xl bg-rose-100 text-rose-700 font-bold text-xs hover:bg-rose-200 transition-colors cursor-pointer"
                    >
                      Purge Record
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: Deduplication & Cluster Manager */}
      {activeAdminTab === 'dedup_clusters' && (
        <div className="space-y-4">
          <div className="glass-card p-4 rounded-2xl bg-purple-50/40 border border-purple-200/80 flex items-start space-x-3">
            <CopyCheck className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-900 font-bold">Spatiotemporal Deduplication Engine:</strong>
              <p className="text-slate-600 mt-0.5">
                Automatically identifies near-duplicate citizen reports and social media posts within an 18 km radius and 4-hour temporal window using Jaccard word similarity and Haversine distance. Consolidate clusters with 1 click to prevent duplicate alerting.
              </p>
            </div>
          </div>

          {duplicateClusters.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-3xl text-slate-400 text-xs">
              No active duplicate clusters found. All events are deduplicated or spatially separated.
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateClusters.map(cluster => (
                <div key={cluster.clusterId} className="glass-card p-5 rounded-3xl border border-purple-200 bg-white space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700 font-mono text-[10px] font-bold">
                        {cluster.clusterId}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {cluster.parentEvent.city} Cluster ({cluster.duplicates.length} duplicate entries)
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">
                        Avg Distance: <strong>{cluster.distanceKmAvg} km</strong>
                      </span>
                      <button
                        onClick={() => handleMergeCluster(cluster.clusterId, cluster.parentEvent.id, cluster.duplicates.map(d => d.id))}
                        className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Consolidate & Deduplicate Cluster
                      </button>
                    </div>
                  </div>

                  {/* Primary Event */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                      <span className="text-emerald-700">★ Primary Incident: {cluster.parentEvent.id}</span>
                      <span>{cluster.parentEvent.sourceAuthor}</span>
                    </div>
                    <p className="text-slate-800 font-semibold">{cluster.parentEvent.title}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">{cluster.parentEvent.description}</p>
                  </div>

                  {/* Duplicate Children */}
                  <div className="pl-4 border-l-2 border-purple-300 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-purple-700 tracking-wider">Duplicate Reports Clustered:</span>
                    {cluster.duplicates.map(dup => (
                      <div key={dup.id} className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{dup.title}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{dup.sourceAuthor} • {dup.source}</div>
                        </div>
                        <span className="text-[10px] font-mono text-purple-800 font-bold">Duplicate</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: Untrusted Source Verifier */}
      {activeAdminTab === 'untrusted_sources' && (
        <div className="space-y-4">
          <div className="glass-card p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 flex items-start space-x-3">
            <Bot className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-900 font-bold">Source Trust & Bot Corroboration Engine:</strong>
              <p className="text-slate-600 mt-0.5">
                Every ingestion source is classified into a trust level based on cryptographic signatures, domain authority, IMD station telemetry, and past reliability scores.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Official Station Trust Card */}
            <div className="glass-card p-5 rounded-3xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Official IMD & Synop API</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">98% Trust</span>
              </div>
              <p className="text-xs text-slate-500">
                Direct automated telemetry from calibrated IMD weather stations and Open-Meteo API. Auto-verified upon ingestion.
              </p>
            </div>

            {/* Verified Citizen Trust Card */}
            <div className="glass-card p-5 rounded-3xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Verified Citizen Reports</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">82% Trust</span>
              </div>
              <p className="text-xs text-slate-500">
                Reports submitted with precise device GPS coordinates, uploaded on-site photos, and corroboration with neighboring stations.
              </p>
            </div>

            {/* Social Media & Twitter Trust Card */}
            <div className="glass-card p-5 rounded-3xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Social Media #IMD Stream</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">65% Trust</span>
              </div>
              <p className="text-xs text-slate-500">
                Public posts tagged with #IMD and weather hashtags. Filtered through spam triggers, NLP classification, and geo-fencing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: NLP 7-Category Classifier Inspector */}
      {activeAdminTab === 'nlp_categories' && (
        <div className="space-y-4">
          <div className="glass-card p-4 rounded-2xl bg-teal-50/40 border border-teal-200/80 flex items-start space-x-3">
            <BarChart3 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="text-slate-900 font-bold">Automated 7-Category NLP Classification Engine:</strong>
              <p className="text-slate-600 mt-0.5">
                Evaluates multi-lingual weather vocabulary (English, Hindi terms like barish, bijli, loo, kohra, andhi) and tags posts automatically with confidence scores into: rainfall, thunderstorm, flooding, heatwave, fog, dust storm, and strong wind.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {categoriesList.map(cat => {
              const config = CATEGORY_CONFIG[cat];
              const count = events.filter(e => e.category === cat).length;
              return (
                <div key={cat} className="glass-card p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{config.emoji}</span>
                    <span className="font-mono text-lg font-black text-slate-800">{count}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">{config.label}</div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{config.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
