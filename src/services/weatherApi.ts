import { WeatherEvent, EventCategory, SeverityLevel } from '../types/weather';
import { MAJOR_INDIAN_CITIES } from '../data/initialEvents';

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    rain: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    surface_pressure: number;
  };
}

/**
 * Maps real-world WMO weather codes and telemetry into IMD standard categories and severity
 */
function mapWmoToCategory(
  code: number,
  tempC: number,
  windKmh: number,
  precipMm: number
): { category: EventCategory; severity: SeverityLevel; description: string; titlePrefix: string } {
  // Extreme heat condition
  if (tempC >= 42) {
    return {
      category: 'heatwave',
      severity: tempC >= 45 ? 'extreme' : 'severe',
      titlePrefix: 'Severe Heatwave Advisory',
      description: `Surface thermometer registering ${tempC.toFixed(1)}°C with dry westerly winds.`
    };
  }

  // Strong wind condition
  if (windKmh >= 45) {
    return {
      category: 'strong wind',
      severity: windKmh >= 65 ? 'extreme' : 'severe',
      titlePrefix: 'High Velocity Wind Squall',
      description: `High velocity surface winds gusting at ${windKmh.toFixed(1)} km/h.`
    };
  }

  // Thunderstorm codes: 95, 96, 99
  if ([95, 96, 99].includes(code)) {
    return {
      category: 'thunderstorm',
      severity: 'severe',
      titlePrefix: 'Active Thunderstorm & Lightning Alert',
      description: `Convective thunder activity with intense lightning bursts and squall fronts.`
    };
  }

  // Fog / mist codes: 45, 48
  if ([45, 48].includes(code)) {
    return {
      category: 'fog',
      severity: 'moderate',
      titlePrefix: 'Dense Fog & Low Visibility Advisory',
      description: `Atmospheric fog reducing surface horizontal visibility.`
    };
  }

  // Flooding check (high precipitation accumulation)
  if (precipMm > 25) {
    return {
      category: 'flooding',
      severity: 'extreme',
      titlePrefix: 'Urban Waterlogging & Deluge Alert',
      description: `Excessive localized deluge of ${precipMm.toFixed(1)}mm/hr triggering urban drainage surcharge.`
    };
  }

  // Rain / Showers
  if (precipMm > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return {
      category: 'rainfall',
      severity: precipMm > 15 ? 'severe' : 'moderate',
      titlePrefix: 'Active Rainfall Spell',
      description: `Continuous precipitation spells measuring ${precipMm.toFixed(1)}mm.`
    };
  }

  // Desert dust conditions in Western Rajasthan
  if (tempC >= 38 && windKmh >= 28) {
    return {
      category: 'dust storm',
      severity: 'moderate',
      titlePrefix: 'Dust Squall Activity',
      description: `Gusting surface winds stirring airborne particulate dust over arid terrain.`
    };
  }

  // Default atmospheric observation
  return {
    category: 'rainfall',
    severity: 'low',
    titlePrefix: 'Synoptic Observation',
    description: `Meteorological surface station reading: Temp ${tempC.toFixed(1)}°C, Humidity ${precipMm}%.`
  };
}

/**
 * Fetch live current weather from Open-Meteo API for an Indian city
 */
export async function fetchLiveCityWeather(
  cityObj: (typeof MAJOR_INDIAN_CITIES)[0]
): Promise<WeatherEvent | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${cityObj.lat}&longitude=${cityObj.lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure&timezone=Asia%2FKolkata`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP error: ${response.status}`);
    }

    const data: OpenMeteoResponse = await response.json();
    const curr = data.current;

    const { category, severity, description, titlePrefix } = mapWmoToCategory(
      curr.weather_code,
      curr.temperature_2m,
      curr.wind_gusts_10m || curr.wind_speed_10m,
      curr.precipitation
    );

    const newEvent: WeatherEvent = {
      id: `evt-live-${cityObj.name.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      source: 'api',
      sourceAuthor: `Open-Meteo Station [${cityObj.name.toUpperCase()}]`,
      isOfficialSource: true,
      timestamp: new Date().toISOString(),
      city: cityObj.name,
      state: cityObj.state,
      latitude: cityObj.lat,
      longitude: cityObj.lng,
      category,
      severity,
      title: `${titlePrefix} in ${cityObj.name}`,
      description: `${description} Open-Meteo live surface observation at ${cityObj.name}, ${cityObj.state}.`,
      rawText: `METAR ${cityObj.name.toUpperCase()} TEMP=${curr.temperature_2m}C HUM=${curr.relative_humidity_2m}% WIND=${curr.wind_speed_10m}KMH RAIN=${curr.precipitation}MM PRESS=${curr.surface_pressure}HPA`,
      mediaType: 'none',
      verificationStatus: 'verified',
      confidenceScore: 99,
      aiClassificationCategory: category,
      aiClassificationConfidence: 98,
      telemetry: {
        temperatureC: curr.temperature_2m,
        humidityPct: curr.relative_humidity_2m,
        windSpeedKmh: curr.wind_speed_10m,
        precipitationMm: curr.precipitation,
        pressureHpa: curr.surface_pressure
      }
    };

    return newEvent;
  } catch (error) {
    console.error(`Failed to fetch live weather for ${cityObj.name}:`, error);
    return null;
  }
}

/**
 * Parallel National Sync: Fetches LIVE real-world weather data across ALL major Indian cities simultaneously
 */
export async function fetchAllIndianCitiesLiveWeather(): Promise<WeatherEvent[]> {
  try {
    const fetchPromises = MAJOR_INDIAN_CITIES.map(city => fetchLiveCityWeather(city));
    const results = await Promise.allSettled(fetchPromises);
    
    const liveEvents: WeatherEvent[] = [];
    results.forEach(res => {
      if (res.status === 'fulfilled' && res.value !== null) {
        liveEvents.push(res.value);
      }
    });

    return liveEvents;
  } catch (e) {
    console.error('Failed to sync all Indian cities live weather:', e);
    return [];
  }
}

/**
 * Generates an active social tweet tracking live meteorological conditions
 */
export function generateSimulatedTweet(): Omit<WeatherEvent, 'id' | 'verificationStatus' | 'confidenceScore'> {
  const cityObj = MAJOR_INDIAN_CITIES[Math.floor(Math.random() * MAJOR_INDIAN_CITIES.length)];
  const isRain = Math.random() > 0.5;
  const category: EventCategory = isRain ? 'rainfall' : 'thunderstorm';

  return {
    source: 'twitter',
    sourceAuthor: `IMD_Live_Citizen_${Math.floor(Math.random() * 900 + 100)}`,
    sourceHandle: `@weather_${cityObj.name.toLowerCase()}`,
    isOfficialSource: false,
    timestamp: new Date().toISOString(),
    city: cityObj.name,
    state: cityObj.state,
    latitude: parseFloat((cityObj.lat + (Math.random() - 0.5) * 0.05).toFixed(4)),
    longitude: parseFloat((cityObj.lng + (Math.random() - 0.5) * 0.05).toFixed(4)),
    category,
    severity: isRain ? 'moderate' : 'severe',
    title: `${isRain ? 'Heavy showers' : 'Loud lightning'} reported in ${cityObj.name}`,
    description: `Citizen reports active weather conditions over ${cityObj.name}. Doppler radar tracking convective cluster. #IMD #${cityObj.name}Weather`,
    rawText: `Heavy storm rolling over ${cityObj.name} right now! #IMD #WeatherAlert #${cityObj.name}Rains`,
    hashtags: ['#IMD', '#WeatherAlert', `#${cityObj.name}Rains`]
  };
}
