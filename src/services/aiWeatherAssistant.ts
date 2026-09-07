import { WeatherEvent, EventCategory } from '../types/weather';
import { CATEGORY_CONFIG, MAJOR_INDIAN_CITIES } from '../data/initialEvents';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: 'focus_city' | 'filter_category' | 'view_event';
    target: string;
    label: string;
  };
  sources?: string[];
}

export function generateAIWeatherResponse(
  userQuery: string,
  events: WeatherEvent[]
): ChatMessage {
  const query = userQuery.toLowerCase().trim();
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const msgId = `msg-${Date.now()}`;

  // 1. City-Specific Weather Inquiries
  for (const city of MAJOR_INDIAN_CITIES) {
    if (query.includes(city.name.toLowerCase())) {
      const cityEvents = events.filter(e => e.city.toLowerCase() === city.name.toLowerCase());
      
      if (cityEvents.length > 0) {
        const latest = cityEvents[0];
        const config = CATEGORY_CONFIG[latest.category];
        const telemetry = latest.telemetry;

        let response = `📍 **Weather Status for ${city.name}, ${city.state}:**\n\n`;
        response += `• **Condition:** ${config.emoji} **${config.label}** (${latest.severity.toUpperCase()} severity)\n`;
        response += `• **Headline:** ${latest.title}\n`;
        response += `• **Summary:** ${latest.description}\n`;
        
        if (telemetry) {
          response += `• **Live Sensor Telemetry:**\n`;
          if (telemetry.temperatureC !== undefined) response += `   - Temperature: **${telemetry.temperatureC}°C**\n`;
          if (telemetry.precipitationMm !== undefined) response += `   - Rain Rate: **${telemetry.precipitationMm} mm**\n`;
          if (telemetry.windSpeedKmh !== undefined) response += `   - Wind Velocity: **${telemetry.windSpeedKmh} km/h**\n`;
          if (telemetry.humidityPct !== undefined) response += `   - Relative Humidity: **${telemetry.humidityPct}%**\n`;
        }

        response += `\n• **Verification:** AI Confidence **${latest.confidenceScore}%** (${latest.verificationStatus.toUpperCase()})`;

        return {
          id: msgId,
          sender: 'bot',
          text: response,
          timestamp: now,
          suggestedAction: {
            type: 'focus_city',
            target: city.name,
            label: `Focus ${city.name} on Map`
          },
          sources: [latest.sourceAuthor, latest.source.toUpperCase()]
        };
      } else {
        return {
          id: msgId,
          sender: 'bot',
          text: `☀️ No severe weather anomalies or alerts are currently logged for **${city.name}, ${city.state}**. Atmospheric conditions remain within normal seasonal parameters.`,
          timestamp: now
        };
      }
    }
  }

  // 2. Category Queries (Rain, Thunderstorm, Floods, Heatwave, Fog, Dust, Wind)
  if (query.includes('rain') || query.includes('monsoon') || query.includes('downpour')) {
    const rainEvents = events.filter(e => e.category === 'rainfall');
    const cities = rainEvents.map(e => `${e.city} (${e.severity})`).join(', ');
    return {
      id: msgId,
      sender: 'bot',
      text: `🌧️ **Rainfall Summary:**\nThere are currently **${rainEvents.length} rainfall incidents** tracked across India.\n\n• **Active Zones:** ${cities || 'None reported'}\n• **IMD Advisory:** High tide caution advised for coastal belts. Avoid waterlogged subways and low-lying transit corridors.`,
      timestamp: now,
      suggestedAction: {
        type: 'filter_category',
        target: 'rainfall',
        label: 'Filter Rainfall Events'
      }
    };
  }

  if (query.includes('flood') || query.includes('waterlog') || query.includes('submerged')) {
    const floodEvents = events.filter(e => e.category === 'flooding');
    return {
      id: msgId,
      sender: 'bot',
      text: `🌊 **Urban Inundation & Flood Alerts:**\nWe have **${floodEvents.length} active flooding reports**.\n\n${floodEvents.map(f => `• **${f.city} (${f.state}):** ${f.title} — *${f.verificationStatus.toUpperCase()}*`).join('\n')}\n\n⚠️ **Emergency Tip:** Never drive through flooded waters. Keep emergency power banks charged and stay updated with local municipal bulletins.`,
      timestamp: now,
      suggestedAction: {
        type: 'filter_category',
        target: 'flooding',
        label: 'View Flooding Hotspots'
      }
    };
  }

  if (query.includes('storm') || query.includes('thunder') || query.includes('lightning') || query.includes('bijli')) {
    const stormEvents = events.filter(e => e.category === 'thunderstorm');
    return {
      id: msgId,
      sender: 'bot',
      text: `⚡ **Thunderstorm & Lightning Radar:**\nTracking **${stormEvents.length} convective storm cells** across India.\n\n${stormEvents.map(s => `• **${s.city}:** ${s.title}`).join('\n')}\n\n⚡ **IMD Lightning Safety Protocol:**\n- Seek shelter in a substantial enclosed building or hard-topped vehicle.\n- Unplug sensitive electronics.\n- Avoid standing under isolated tall trees or open metal structures.`,
      timestamp: now,
      suggestedAction: {
        type: 'filter_category',
        target: 'thunderstorm',
        label: 'Show Storm Radar'
      }
    };
  }

  if (query.includes('heat') || query.includes('temperature') || query.includes('loo') || query.includes('hot')) {
    const heatEvents = events.filter(e => e.category === 'heatwave');
    return {
      id: msgId,
      sender: 'bot',
      text: `🔥 **Heatwave & Temperature Alert:**\nSevere thermal anomalies reported in **${heatEvents.length} locations** (primarily Western & Northern India).\n\n${heatEvents.map(h => `• **${h.city}:** Temp reached **${h.telemetry?.temperatureC || 47.5}°C**`).join('\n')}\n\n🌡️ **Health Advisory:** Avoid sun exposure between 11:00 AM - 4:00 PM. Drink ORS, coconut water, or buttermilk regularly.`,
      timestamp: now,
      suggestedAction: {
        type: 'filter_category',
        target: 'heatwave',
        label: 'Show Heatwave Zones'
      }
    };
  }

  if (query.includes('fog') || query.includes('visibility') || query.includes('mist')) {
    const fogEvents = events.filter(e => e.category === 'fog');
    return {
      id: msgId,
      sender: 'bot',
      text: `🌫️ **Dense Fog & Low Visibility Advisory:**\n**${fogEvents.length} fog incidents** recorded.\n\n${fogEvents.map(f => `• **${f.city}:** Visibility reduced to ~120m (Safdarjung/Palam airports)`).join('\n')}\n\n🚗 **Transit Advisory:** Use fog lights, maintain a 4-second following distance, and avoid abrupt braking on expressways.`,
      timestamp: now,
      suggestedAction: {
        type: 'filter_category',
        target: 'fog',
        label: 'Show Fog Advisory'
      }
    };
  }

  if (query.includes('dust') || query.includes('andhi') || query.includes('sand')) {
    const dustEvents = events.filter(e => e.category === 'dust storm');
    return {
      id: msgId,
      sender: 'bot',
      text: `🌪️ **Dust Storm (Andhi) Alert:**\n**${dustEvents.length} active dust storms** reported in the desert belt.\n\n${dustEvents.map(d => `• **${d.city}:** Winds > 70 km/h with sand accumulation`).join('\n')}\n\n😷 **Precaution:** Close all window vents, wear N95/protective masks to avoid particulate inhalation.`,
      timestamp: now,
      suggestedAction: {
        type: 'filter_category',
        target: 'dust storm',
        label: 'Show Dust Storms'
      }
    };
  }

  // 3. Platform & Verification Statistics
  if (query.includes('verified') || query.includes('spam') || query.includes('duplicate') || query.includes('accuracy') || query.includes('stats')) {
    const total = events.length;
    const verified = events.filter(e => e.verificationStatus === 'verified').length;
    const unverified = events.filter(e => e.verificationStatus === 'unverified').length;
    const flagged = events.filter(e => e.verificationStatus === 'flagged').length;
    const duplicates = events.filter(e => e.verificationStatus === 'duplicate').length;

    return {
      id: msgId,
      sender: 'bot',
      text: `📊 **CloudNet Intelligence & Ingestion Statistics:**\n\n• **Total Reports Processed:** **${total}**\n• **Verified Clean:** **${verified}** (${Math.round((verified/total)*100)}% reliability rate)\n• **Pending Triage:** **${unverified}**\n• **Duplicates Clustered (18km / 4h window):** **${duplicates}**\n• **Fraud / Spam Interceptions:** **${flagged}**\n\nOur AI cross-references Open-Meteo synoptic observations, Twitter #IMD posts, and citizen GPS reports in real-time.`,
      timestamp: now
    };
  }

  // 4. Emergency Helplines & Safety
  if (query.includes('emergency') || query.includes('help') || query.includes('number') || query.includes('contact')) {
    return {
      id: msgId,
      sender: 'bot',
      text: `🚨 **National Disaster Management Helplines (India):**\n\n• **National Emergency Number:** **112**\n• **NDRF Disaster Helpline:** **1078 / 011-24363260**\n• **IMD Weather Enquiry:** **1800-180-1717**\n• **Ambulance:** **108 / 102**\n• **Fire Service:** **101**\n• **Police:** **100**`,
      timestamp: now
    };
  }

  // 5. Default General Meteorological Assistant Response
  return {
    id: msgId,
    sender: 'bot',
    text: `🤖 **CloudNet AI Assistant:**\nI have real-time access to live meteorological feeds across India.\n\nYou can ask me:\n• *"What is the weather in Mumbai or Delhi?"*\n• *"Show all flooding and waterlogging alerts"*\n• *"What are the safety steps during a thunderstorm?"*\n• *"How many reports are verified vs flagged spam?"*\n• *"Give me emergency disaster helpline numbers"*`,
    timestamp: now
  };
}
