import React from 'react';
import { MAJOR_INDIAN_CITIES, CATEGORY_CONFIG } from '../data/initialEvents';
import { WeatherEvent, WeatherMood } from '../types/weather';
import { Sparkles, MapPin, Wind, Thermometer } from 'lucide-react';

interface CityGlanceBarProps {
  events: WeatherEvent[];
  onSelectCity: (cityName: string) => void;
  onMoodChange?: (mood: WeatherMood) => void;
}

export const CityGlanceBar: React.FC<CityGlanceBarProps> = ({
  events,
  onSelectCity,
  onMoodChange
}) => {
  const featuredCities = MAJOR_INDIAN_CITIES.slice(0, 8);

  const getCityStatus = (cityName: string) => {
    const matched = events.find(e => e.city.toLowerCase() === cityName.toLowerCase());
    if (matched) {
      const config = CATEGORY_CONFIG[matched.category];
      return {
        hasEvent: true,
        emoji: config.emoji,
        label: config.label,
        category: matched.category,
        severity: matched.severity,
        temp: matched.telemetry?.temperatureC || (matched.category === 'heatwave' ? 44.5 : matched.category === 'rainfall' ? 26.2 : 28.0),
        wind: matched.telemetry?.windSpeedKmh || 22
      };
    }
    return {
      hasEvent: false,
      emoji: '☀️',
      label: 'Fair Weather',
      category: 'default' as WeatherMood,
      severity: 'normal',
      temp: 29.0,
      wind: 12
    };
  };

  const handleCityClick = (cityName: string, category: WeatherMood) => {
    onSelectCity(cityName);
    if (onMoodChange) {
      onMoodChange(category);
    }
  };

  return (
    <div className="w-full mb-6 overflow-x-auto scrollbar-none">
      <div className="flex items-center space-x-3 pb-1 min-w-max">
        
        {/* Glance Label */}
        <div className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs text-xs font-bold text-slate-800 flex-shrink-0">
          <MapPin className="w-3.5 h-3.5 text-sky-600" />
          <span>Metro Live Glance:</span>
        </div>

        {/* City Chips */}
        {featuredCities.map(city => {
          const status = getCityStatus(city.name);

          return (
            <button
              key={city.name}
              onClick={() => handleCityClick(city.name, status.category)}
              className="flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl bg-white/80 hover:bg-white backdrop-blur-md border border-slate-200/80 hover:border-sky-300 transition-all cursor-pointer shadow-xs hover:shadow-md group flex-shrink-0"
            >
              <span className="text-base group-hover:scale-110 transition-transform">
                {status.emoji}
              </span>

              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 group-hover:text-sky-700">
                  {city.name}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {status.label.split(' ')[0]}
                </span>
              </div>

              <div className="flex items-center space-x-1 pl-1.5 border-l border-slate-100 font-mono text-xs">
                <span className="font-bold text-slate-800">{Math.round(status.temp)}°C</span>
              </div>
            </button>
          );
        })}

      </div>
    </div>
  );
};
