import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  Map, 
  BarChart3, 
  PlusCircle, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Radio, 
  ShieldAlert,
  ChevronDown,
  Compass
} from 'lucide-react';
import { WeatherMood } from '../types/weather';
import { MOOD_THEMES } from '../data/initialEvents';
import { setAdminAuthState } from '../services/storage';

interface NavbarProps {
  activeTab: 'dashboard' | 'analytics' | 'admin' | 'feeds';
  setActiveTab: (tab: 'dashboard' | 'analytics' | 'admin' | 'feeds') => void;
  onOpenCitizenModal: () => void;
  onOpenAdminLoginModal: () => void;
  onOpenHelplinesModal: () => void;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (authed: boolean) => void;
  activeMood: WeatherMood;
  setActiveMood: (mood: WeatherMood) => void;
  totalEventsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCitizenModal,
  onOpenAdminLoginModal,
  onOpenHelplinesModal,
  isAdminAuthenticated,
  setIsAdminAuthenticated,
  activeMood,
  setActiveMood,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentMoodTheme = MOOD_THEMES[activeMood] || MOOD_THEMES.default;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdminToggle = () => {
    if (isAdminAuthenticated) {
      setAdminAuthState(false);
      setIsAdminAuthenticated(false);
    } else {
      onOpenAdminLoginModal();
    }
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Live Map', shortLabel: 'Map', icon: Map, color: 'text-sky-600' },
    { id: 'analytics' as const, label: 'Charts & Stats', shortLabel: 'Charts', icon: BarChart3, color: 'text-indigo-600' },
    { id: 'admin' as const, label: 'Admin Verify', shortLabel: 'Admin', icon: ShieldCheck, color: 'text-emerald-600' },
    { id: 'feeds' as const, label: 'Data Feeds', shortLabel: 'Feeds', icon: Radio, color: 'text-amber-600' },
  ];

  const currentTabItem = navItems.find(item => item.id === activeTab) || navItems[0];
  const CurrentIcon = currentTabItem.icon;

  return (
    <header className="sticky top-3 sm:top-5 z-40 w-full px-3 sm:px-6 lg:px-8 mb-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-900/5 px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between min-h-[3.75rem]">
          
          {/* Brand & Logo (Left) */}
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none" 
            onClick={() => {
              setActiveTab('dashboard');
              setActiveMood('default');
            }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20 flex-shrink-0">
              <Cloud className="w-5 h-5 stroke-[2.5]" />
            </div>
            
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                  CloudNet
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  IMD Grid
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                National Meteorological Monitoring & Verification
              </p>
            </div>
          </div>

          {/* Right Area: Unified View Selector Block + Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Desktop: Small Chooser Block for View Selection */}
            <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-xs">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-sky-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                    title={item.label}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? item.color : 'text-slate-500'}`} />
                    <span>{item.shortLabel}</span>
                    {item.id === 'admin' && isAdminAuthenticated && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile / Tablet: Dropdown Chooser Block */}
            <div className="relative md:hidden" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-xs"
              >
                <CurrentIcon className={`w-3.5 h-3.5 ${currentTabItem.color}`} />
                <span>{currentTabItem.shortLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch View
                  </div>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                          isActive
                            ? 'bg-sky-50 text-sky-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${item.color}`} />
                        <span className="flex-1">{item.label}</span>
                        {item.id === 'admin' && isAdminAuthenticated && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action 0: Hyperlocal / Near Me & PIN Button */}
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setTimeout(() => {
                  const el = document.getElementById('hyperlocal-weather-section');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 50);
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs border border-sky-200 shadow-xs transition-all cursor-pointer"
              title="Search by Locality, PIN Code or Near Me"
            >
              <Compass className="w-4 h-4 text-sky-600 animate-pulse" />
              <span className="hidden sm:inline">Near Me & PIN</span>
            </button>

            {/* Action 1: SOS Helplines Button */}
            <button
              onClick={onOpenHelplinesModal}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 shadow-xs transition-all cursor-pointer"
              title="Emergency Helplines & Guidelines"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span className="hidden lg:inline">SOS</span>
            </button>

            {/* Action 2: Citizen Report Button */}
            <button
              onClick={onOpenCitizenModal}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Report</span>
            </button>

            {/* Action 3: Admin Lock / Unlock Toggle */}
            <button
              onClick={handleAdminToggle}
              title={isAdminAuthenticated ? "Officer Authenticated (Click to Logout)" : "Admin Officer Login"}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isAdminAuthenticated
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {isAdminAuthenticated ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
