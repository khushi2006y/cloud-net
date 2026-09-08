import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  Map,
  BarChart3,
  ShieldCheck,
  Radio,
  PlusCircle,
  ShieldAlert,
  Lock,
  Unlock,
  Compass,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  User,
} from 'lucide-react';
import { WeatherMood } from '../types/weather';
import { setAdminAuthState } from '../services/storage';

export type ActiveTab = 'dashboard' | 'analytics' | 'admin' | 'feeds' | 'myreports';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenCitizenModal: () => void;
  onOpenAdminLoginModal: () => void;
  onOpenHelplinesModal: () => void;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (authed: boolean) => void;
  activeMood: WeatherMood;
  setActiveMood: (mood: WeatherMood) => void;
  totalEventsCount: number;
}

const NAV_ITEMS = [
  {
    id: 'dashboard' as ActiveTab,
    label: 'Live Map',
    icon: Map,
    color: 'text-sky-500',
    activeBg: 'bg-sky-50',
    activeBar: 'bg-sky-500',
    activeText: 'text-sky-700',
  },
  {
    id: 'analytics' as ActiveTab,
    label: 'Charts & Stats',
    icon: BarChart3,
    color: 'text-indigo-500',
    activeBg: 'bg-indigo-50',
    activeBar: 'bg-indigo-500',
    activeText: 'text-indigo-700',
  },
  {
    id: 'admin' as ActiveTab,
    label: 'Admin Verify',
    icon: ShieldCheck,
    color: 'text-emerald-500',
    activeBg: 'bg-emerald-50',
    activeBar: 'bg-emerald-500',
    activeText: 'text-emerald-700',
  },
  {
    id: 'feeds' as ActiveTab,
    label: 'Data Feeds',
    icon: Radio,
    color: 'text-amber-500',
    activeBg: 'bg-amber-50',
    activeBar: 'bg-amber-500',
    activeText: 'text-amber-700',
  },
  {
    id: 'myreports' as ActiveTab,
    label: 'My Reports',
    icon: ClipboardList,
    color: 'text-violet-500',
    activeBg: 'bg-violet-50',
    activeBar: 'bg-violet-500',
    activeText: 'text-violet-700',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCitizenModal,
  onOpenAdminLoginModal,
  onOpenHelplinesModal,
  isAdminAuthenticated,
  setIsAdminAuthenticated,
  activeMood,
  setActiveMood,
  totalEventsCount,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Detect small screen — auto-collapse on mobile
  useEffect(() => {
    const check = () => {
      const small = window.innerWidth < 768;
      setIsMobile(small);
      if (small) setCollapsed(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleAdminToggle = () => {
    if (isAdminAuthenticated) {
      setAdminAuthState(false);
      setIsAdminAuthenticated(false);
    } else {
      onOpenAdminLoginModal();
    }
  };

  const sidebarW = collapsed ? 'w-16' : 'w-56';

  const handleNavClick = (id: ActiveTab) => {
    setActiveTab(id);
    if (isMobile) setMobileOpen(false);
  };

  // Mobile: render a hamburger button + slide-over drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2.5 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
              <Cloud className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">CloudNet</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">IMD</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenHelplinesModal}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SOS</span>
            </button>
            <button
              onClick={onOpenCitizenModal}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Report</span>
            </button>
            {/* Mobile nav toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Drawer Overlay */}
        {mobileOpen && (
          <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex"
            onClick={(e) => { if (e.target === overlayRef.current) setMobileOpen(false); }}
          >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="relative z-10 w-64 h-full bg-white/97 backdrop-blur-xl border-r border-slate-200/80 shadow-2xl flex flex-col">
              <MobileSidebarContent
                activeTab={activeTab}
                onNavClick={handleNavClick}
                onOpenCitizenModal={() => { onOpenCitizenModal(); setMobileOpen(false); }}
                onOpenHelplinesModal={() => { onOpenHelplinesModal(); setMobileOpen(false); }}
                isAdminAuthenticated={isAdminAuthenticated}
                handleAdminToggle={handleAdminToggle}
                setActiveMood={setActiveMood}
                setActiveTab={setActiveTab}
                totalEventsCount={totalEventsCount}
                onClose={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-lg shadow-slate-900/5 transition-all duration-250 ease-in-out ${sidebarW}`}
    >
      {/* ── Brand ───────────────────────────────────────── */}
      <div
        className={`flex items-center px-3 py-4 border-b border-slate-100 cursor-pointer select-none shrink-0 ${collapsed ? 'justify-center' : 'space-x-3'}`}
        onClick={() => { setActiveTab('dashboard'); setActiveMood('default'); }}
        title="CloudNet · IMD Grid"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20 shrink-0">
          <Cloud className="w-4.5 h-4.5 stroke-[2.5]" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">CloudNet</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 whitespace-nowrap">
                IMD Grid
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap mt-0.5">
              Meteorological Monitor
            </p>
          </div>
        )}
      </div>

      {/* ── Nav Items ────────────────────────────────────── */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                group relative w-full flex items-center rounded-xl text-left transition-all duration-150
                ${collapsed ? 'justify-center px-0 py-2.5' : 'space-x-3 px-3 py-2.5'}
                ${isActive
                  ? `${item.activeBg} ${item.activeText} font-bold shadow-sm`
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'}
              `}
            >
              {/* Active left-bar accent */}
              {isActive && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${item.activeBar}`} />
              )}

              <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? item.color : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />

              {!collapsed && (
                <span className="text-xs truncate">{item.label}</span>
              )}

              {/* Admin online dot */}
              {item.id === 'admin' && isAdminAuthenticated && (
                <span className={`${collapsed ? 'absolute top-1.5 right-1.5' : 'ml-auto'} w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0`} />
              )}

              {/* Tooltip on collapsed */}
              {collapsed && (
                <div className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                  {item.label}
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 rotate-45" />
                </div>
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="mx-2 my-2 border-t border-slate-100" />

        {/* Report button — opens modal */}
        <button
          onClick={onOpenCitizenModal}
          title={collapsed ? 'Submit Report' : undefined}
          className={`
            group relative w-full flex items-center rounded-xl transition-all duration-150 font-bold
            bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500
            text-white shadow-md shadow-sky-600/20 hover:shadow-sky-500/30
            hover:scale-[1.02] active:scale-[0.98]
            ${collapsed ? 'justify-center px-0 py-2.5' : 'space-x-3 px-3 py-2.5'}
          `}
        >
          <PlusCircle className="w-4.5 h-4.5 shrink-0 stroke-[2.5]" />
          {!collapsed && <span className="text-xs">Submit Report</span>}
          {collapsed && (
            <div className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
              Submit Report
            </div>
          )}
        </button>
      </nav>

      {/* ── Footer Actions ───────────────────────────────── */}
      <div className={`shrink-0 border-t border-slate-100 px-2 py-3 space-y-1.5`}>

        {/* Near Me & PIN */}
        <button
          onClick={() => {
            setActiveTab('dashboard');
            setTimeout(() => {
              const el = document.getElementById('hyperlocal-weather-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
          title={collapsed ? 'Near Me & PIN' : undefined}
          className={`group relative w-full flex items-center rounded-xl text-sky-800 font-bold text-xs bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all ${collapsed ? 'justify-center px-0 py-2' : 'space-x-2 px-3 py-2'}`}
        >
          <Compass className="w-4 h-4 text-sky-600 animate-pulse shrink-0" />
          {!collapsed && <span>Near Me & PIN</span>}
          {collapsed && (
            <div className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
              Near Me & PIN
            </div>
          )}
        </button>

        {/* SOS Helplines */}
        <button
          onClick={onOpenHelplinesModal}
          title={collapsed ? 'SOS Helplines' : undefined}
          className={`group relative w-full flex items-center rounded-xl text-rose-700 font-bold text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all ${collapsed ? 'justify-center px-0 py-2' : 'space-x-2 px-3 py-2'}`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          {!collapsed && <span>SOS Emergency</span>}
          {collapsed && (
            <div className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
              SOS Helplines
            </div>
          )}
        </button>

        {/* Admin toggle */}
        <button
          onClick={handleAdminToggle}
          title={isAdminAuthenticated ? 'Logout Officer' : 'Admin Login'}
          className={`group relative w-full flex items-center rounded-xl font-bold text-xs border transition-all ${
            isAdminAuthenticated
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50'
          } ${collapsed ? 'justify-center px-0 py-2' : 'space-x-2 px-3 py-2'}`}
        >
          {isAdminAuthenticated ? (
            <Unlock className="w-4 h-4 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 shrink-0" />
          )}
          {!collapsed && (
            <span>{isAdminAuthenticated ? 'Officer Active' : 'Admin Login'}</span>
          )}
          {collapsed && (
            <div className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
              {isAdminAuthenticated ? 'Logout Officer' : 'Admin Login'}
            </div>
          )}
        </button>

        {/* Live events count */}
        {!collapsed && (
          <div className="flex items-center space-x-2 px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[10px] text-slate-400 font-medium">{totalEventsCount} events live</span>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`w-full flex items-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 font-medium text-xs transition-all py-2 ${collapsed ? 'justify-center px-0' : 'space-x-2 px-3'}`}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

// ── Mobile Drawer Content (extracted for clarity) ──────────────────────────
interface MobileContentProps {
  activeTab: ActiveTab;
  onNavClick: (id: ActiveTab) => void;
  onOpenCitizenModal: () => void;
  onOpenHelplinesModal: () => void;
  isAdminAuthenticated: boolean;
  handleAdminToggle: () => void;
  setActiveMood: (m: WeatherMood) => void;
  setActiveTab: (t: ActiveTab) => void;
  totalEventsCount: number;
  onClose: () => void;
}

const MobileSidebarContent: React.FC<MobileContentProps> = ({
  activeTab, onNavClick, onOpenCitizenModal, onOpenHelplinesModal,
  isAdminAuthenticated, handleAdminToggle, setActiveMood, setActiveTab,
  totalEventsCount, onClose,
}) => (
  <>
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
      <div className="flex items-center space-x-2.5" onClick={() => { setActiveTab('dashboard'); setActiveMood('default'); onClose(); }}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
          <Cloud className="w-4.5 h-4.5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="text-sm font-bold text-slate-900">CloudNet</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">IMD Grid</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Meteorological Monitor</p>
        </div>
      </div>
      <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>

    {/* Nav */}
    <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavClick(item.id)}
            className={`relative w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left transition-all font-medium text-xs
              ${isActive ? `${item.activeBg} ${item.activeText} font-bold shadow-sm` : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            {isActive && <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${item.activeBar}`} />}
            <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? item.color : 'text-slate-400'}`} />
            <span className="flex-1">{item.label}</span>
            {item.id === 'admin' && isAdminAuthenticated && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        );
      })}

      <div className="mx-2 my-2 border-t border-slate-100" />

      <button
        onClick={onOpenCitizenModal}
        className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-sky-600 to-blue-600 shadow-md shadow-sky-600/20 transition-all"
      >
        <PlusCircle className="w-4.5 h-4.5 stroke-[2.5]" />
        <span>Submit Report</span>
      </button>
    </nav>

    {/* Footer */}
    <div className="shrink-0 border-t border-slate-100 px-3 py-3 space-y-1.5">
      <button
        onClick={onOpenHelplinesModal}
        className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl text-rose-700 font-bold text-xs bg-rose-50 border border-rose-200"
      >
        <ShieldAlert className="w-4 h-4 text-rose-600" />
        <span>SOS Emergency</span>
      </button>
      <button
        onClick={handleAdminToggle}
        className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl font-bold text-xs border transition-all ${
          isAdminAuthenticated
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-white text-slate-500 border-slate-200'
        }`}
      >
        {isAdminAuthenticated ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        <span>{isAdminAuthenticated ? 'Officer Active' : 'Admin Login'}</span>
      </button>
      <div className="flex items-center space-x-2 px-3 py-1">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] text-slate-400 font-medium">{totalEventsCount} events live</span>
      </div>
    </div>
  </>
);
