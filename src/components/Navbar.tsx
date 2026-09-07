import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Map, 
  BarChart3, 
  PlusCircle, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Radio, 
  RotateCcw, 
  Sparkles, 
  PhoneCall,
  ShieldAlert
} from 'lucide-react';
import { WeatherMood, MoodTheme } from '../types/weather';
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
  totalEventsCount
}) => {
  const [istTime, setIstTime] = useState<string>('');
  const currentMoodTheme = MOOD_THEMES[activeMood] || MOOD_THEMES.default;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        day: '2-digit',
        month: 'short'
      };
      setIstTime(new Intl.DateTimeFormat('en-IN', options).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminToggle = () => {
    if (isAdminAuthenticated) {
      setAdminAuthState(false);
      setIsAdminAuthenticated(false);
    } else {
      onOpenAdminLoginModal();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-nav transition-all duration-300 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-2">
          
          {/* Brand & Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none" 
            onClick={() => {
              setActiveTab('dashboard');
              setActiveMood('default');
            }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20">
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
              <p className="text-xs text-slate-500 font-medium">
                {currentMoodTheme.headerSubtitle}
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Frosted Pill Style) */}
          <nav className="hidden md:flex items-center space-x-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Live Map</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Charts & Stats</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Verify</span>
              {isAdminAuthenticated && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('feeds')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'feeds'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Data Feeds</span>
            </button>
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center space-x-2.5">
            
            {/* Active Weather Mood Badge (Interactive) */}
            <div 
              className={`hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm ${currentMoodTheme.badgeBg} ${currentMoodTheme.badgeText}`}
              title="Current Weather Mood Theme"
            >
              <span className="text-base">{currentMoodTheme.emoji}</span>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Mood</span>
                <span className="font-semibold">{currentMoodTheme.label}</span>
              </div>
              {activeMood !== 'default' && (
                <button
                  onClick={() => setActiveMood('default')}
                  className="ml-1 p-1 hover:bg-black/10 rounded-md text-slate-600 transition-colors"
                  title="Reset to Normal Daytime Mood"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Emergency Helplines Button */}
            <button
              onClick={onOpenHelplinesModal}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 shadow-xs transition-all cursor-pointer"
              title="Emergency Helplines & Disaster Guidelines"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">SOS Helplines</span>
            </button>

            {/* Citizen Report Action Button */}
            <button
              onClick={onOpenCitizenModal}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Report</span>
            </button>

            {/* Admin Toggle */}
            <button
              onClick={handleAdminToggle}
              title={isAdminAuthenticated ? "Officer Authenticated (Click to Logout)" : "Admin Officer Login"}
              className={`p-2.5 rounded-xl border transition-all ${
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

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-200/80">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`text-xs py-1.5 px-3 rounded-lg font-semibold ${
              activeTab === 'dashboard' ? 'text-sky-700 bg-sky-100' : 'text-slate-600'
            }`}
          >
            🗺️ Map
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`text-xs py-1.5 px-3 rounded-lg font-semibold ${
              activeTab === 'analytics' ? 'text-sky-700 bg-sky-100' : 'text-slate-600'
            }`}
          >
            📊 Charts
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`text-xs py-1.5 px-3 rounded-lg font-semibold ${
              activeTab === 'admin' ? 'text-sky-700 bg-sky-100' : 'text-slate-600'
            }`}
          >
            🛡️ Admin
          </button>
          <button
            onClick={() => setActiveTab('feeds')}
            className={`text-xs py-1.5 px-3 rounded-lg font-semibold ${
              activeTab === 'feeds' ? 'text-sky-700 bg-sky-100' : 'text-slate-600'
            }`}
          >
            📡 Feeds
          </button>
          <button
            onClick={onOpenHelplinesModal}
            className="text-xs py-1.5 px-3 rounded-lg font-semibold text-rose-700 bg-rose-50"
          >
            🚨 SOS
          </button>
        </div>

      </div>
    </header>
  );
};
