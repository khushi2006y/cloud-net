import React from 'react';
import { WeatherMood, EventCategory } from '../types/weather';
import { MOOD_THEMES } from '../data/initialEvents';
import { Sparkles, Info } from 'lucide-react';

interface WeatherMoodBarProps {
  activeMood: WeatherMood;
  onSelectMood: (mood: WeatherMood) => void;
}

export const WeatherMoodBar: React.FC<WeatherMoodBarProps> = ({
  activeMood,
  onSelectMood
}) => {
  const moods: WeatherMood[] = [
    'default',
    'rainfall',
    'thunderstorm',
    'flooding',
    'heatwave',
    'fog',
    'dust storm',
    'strong wind'
  ];

  return (
    <div className="glass-card p-3 rounded-2xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all duration-300">
      
      {/* Mood Title */}
      <div className="flex items-center space-x-2">
        <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900">
            Dynamic Weather Mood
          </h4>
          <p className="text-[11px] text-slate-500">
            Click pins on the map or tap a weather mode below to adapt the theme:
          </p>
        </div>
      </div>

      {/* Weather Mood Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {moods.map(mood => {
          const theme = MOOD_THEMES[mood];
          const isSelected = activeMood === mood;

          return (
            <button
              key={mood}
              onClick={() => onSelectMood(mood)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm scale-105'
                  : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <span className="text-sm">{theme.emoji}</span>
              <span>{theme.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
