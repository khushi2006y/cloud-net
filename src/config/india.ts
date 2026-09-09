/**
 * india.ts — Geographic Configuration Constants
 *
 * Centralised lookup tables for Indian cities, districts, and states.
 * These are static geographic metadata used across the platform for
 * location resolution, filtering, and API requests. They are NOT event data.
 *
 * Sources:
 *  - IMD Station Network (https://imd.gov.in)
 *  - Open-Meteo Geocoding API (https://open-meteo.com)
 *  - Census of India 2011 district boundaries
 */

// ─── States ──────────────────────────────────────────────────────────────────

export const INDIAN_STATES: string[] = [
  'All States',
  'Andaman and Nicobar',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli',
  'Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

// ─── Major Cities ─────────────────────────────────────────────────────────────

export interface CityNode {
  name: string;
  state: string;
  lat: number;
  lng: number;
}

/**
 * 40 representative Indian cities used for:
 *  - Open-Meteo live weather polling
 *  - Synthetic event generation (simulation/testbed)
 *  - Map auto-centre and city glance bar
 */
export const MAJOR_INDIAN_CITIES: CityNode[] = [
  // Tier-1 Metros
  { name: 'Mumbai',           state: 'Maharashtra',       lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi',            state: 'Delhi',             lat: 28.6139, lng: 77.2090 },
  { name: 'Noida',            state: 'Uttar Pradesh',     lat: 28.5355, lng: 77.3910 },
  { name: 'Gurugram',         state: 'Haryana',           lat: 28.4595, lng: 77.0266 },
  { name: 'Ghaziabad',        state: 'Uttar Pradesh',     lat: 28.6692, lng: 77.4538 },
  { name: 'Faridabad',        state: 'Haryana',           lat: 28.4089, lng: 77.3178 },
  { name: 'Bengaluru',        state: 'Karnataka',         lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai',          state: 'Tamil Nadu',        lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata',          state: 'West Bengal',       lat: 22.5726, lng: 88.3639 },
  { name: 'Hyderabad',        state: 'Telangana',         lat: 17.3850, lng: 78.4867 },
  { name: 'Ahmedabad',        state: 'Gujarat',           lat: 23.0225, lng: 72.5714 },
  { name: 'Pune',             state: 'Maharashtra',       lat: 18.5204, lng: 73.8567 },

  // Tier-2 Cities
  { name: 'Jaipur',           state: 'Rajasthan',         lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow',          state: 'Uttar Pradesh',     lat: 26.8467, lng: 80.9462 },
  { name: 'Kochi',            state: 'Kerala',            lat:  9.9312, lng: 76.2673 },
  { name: 'Guwahati',         state: 'Assam',             lat: 26.1445, lng: 91.7362 },
  { name: 'Bhubaneswar',      state: 'Odisha',            lat: 20.2961, lng: 85.8245 },
  { name: 'Thiruvananthapuram', state: 'Kerala',          lat:  8.5241, lng: 76.9366 },
  { name: 'Chandigarh',       state: 'Punjab',            lat: 30.7333, lng: 76.7794 },
  { name: 'Nagpur',           state: 'Maharashtra',       lat: 21.1458, lng: 79.0882 },
  { name: 'Surat',            state: 'Gujarat',           lat: 21.1702, lng: 72.8311 },
  { name: 'Visakhapatnam',    state: 'Andhra Pradesh',    lat: 17.6868, lng: 83.2185 },
  { name: 'Patna',            state: 'Bihar',             lat: 25.5941, lng: 85.1376 },
  { name: 'Bhopal',           state: 'Madhya Pradesh',    lat: 23.2599, lng: 77.4126 },

  // Climatically significant / IMD Observatories
  { name: 'Bikaner',          state: 'Rajasthan',         lat: 28.0229, lng: 73.3119 },
  { name: 'Jaisalmer',        state: 'Rajasthan',         lat: 26.9157, lng: 70.9083 },
  { name: 'Jodhpur',          state: 'Rajasthan',         lat: 26.2389, lng: 73.0243 },
  { name: 'Dehradun',         state: 'Uttarakhand',       lat: 30.3165, lng: 78.0322 },
  { name: 'Shillong',         state: 'Meghalaya',         lat: 25.5788, lng: 91.8933 },
  { name: 'Imphal',           state: 'Manipur',           lat: 24.8170, lng: 93.9368 },
  { name: 'Agartala',         state: 'Tripura',           lat: 23.8315, lng: 91.2868 },
  { name: 'Gangtok',          state: 'Sikkim',            lat: 27.3314, lng: 88.6138 },
  { name: 'Portblair',        state: 'Andaman and Nicobar', lat: 11.6234, lng: 92.7265 },
  { name: 'Ranchi',           state: 'Jharkhand',         lat: 23.3441, lng: 85.3096 },
  { name: 'Raipur',           state: 'Chhattisgarh',      lat: 21.2514, lng: 81.6296 },

  // Additional IMD Observatories
  { name: 'Amritsar',         state: 'Punjab',            lat: 31.6340, lng: 74.8723 },
  { name: 'Varanasi',         state: 'Uttar Pradesh',     lat: 25.3176, lng: 82.9739 },
  { name: 'Indore',           state: 'Madhya Pradesh',    lat: 22.7196, lng: 75.8577 },
  { name: 'Coimbatore',       state: 'Tamil Nadu',        lat: 11.0168, lng: 76.9558 },
  { name: 'Madurai',          state: 'Tamil Nadu',        lat:  9.9252, lng: 78.1198 },
  { name: 'Vijayawada',       state: 'Andhra Pradesh',    lat: 16.5062, lng: 80.6480 },
  { name: 'Mysuru',           state: 'Karnataka',         lat: 12.2958, lng: 76.6394 },
  { name: 'Calicut',          state: 'Kerala',            lat: 11.2588, lng: 75.7804 },
  { name: 'Dibrugarh',        state: 'Assam',             lat: 27.4728, lng: 94.9120 },
];

// ─── Districts (full national coverage for map pins) ──────────────────────────

export interface DistrictNode {
  name: string;
  state: string;
  lat: number;
  lng: number;
  isMetro: boolean;
}

export const MAJOR_INDIAN_DISTRICTS: DistrictNode[] = [
  // Major Metros
  { name: 'Mumbai',             state: 'Maharashtra',       lat: 19.0760, lng: 72.8777, isMetro: true  },
  { name: 'Delhi',              state: 'Delhi',             lat: 28.6139, lng: 77.2090, isMetro: true  },
  { name: 'Bengaluru',          state: 'Karnataka',         lat: 12.9716, lng: 77.5946, isMetro: true  },
  { name: 'Chennai',            state: 'Tamil Nadu',        lat: 13.0827, lng: 80.2707, isMetro: true  },
  { name: 'Kolkata',            state: 'West Bengal',       lat: 22.5726, lng: 88.3639, isMetro: true  },
  { name: 'Hyderabad',          state: 'Telangana',         lat: 17.3850, lng: 78.4867, isMetro: true  },
  { name: 'Ahmedabad',          state: 'Gujarat',           lat: 23.0225, lng: 72.5714, isMetro: true  },
  { name: 'Pune',               state: 'Maharashtra',       lat: 18.5204, lng: 73.8567, isMetro: true  },
  { name: 'Jaipur',             state: 'Rajasthan',         lat: 26.9124, lng: 75.7873, isMetro: true  },
  { name: 'Kochi',              state: 'Kerala',            lat:  9.9312, lng: 76.2673, isMetro: true  },
  { name: 'Guwahati',           state: 'Assam',             lat: 26.1445, lng: 91.7362, isMetro: true  },
  { name: 'Surat',              state: 'Gujarat',           lat: 21.1702, lng: 72.8311, isMetro: true  },
  { name: 'Lucknow',            state: 'Uttar Pradesh',     lat: 26.8467, lng: 80.9462, isMetro: true  },
  { name: 'Bhopal',             state: 'Madhya Pradesh',    lat: 23.2599, lng: 77.4126, isMetro: true  },
  { name: 'Chandigarh',         state: 'Punjab',            lat: 30.7333, lng: 76.7794, isMetro: true  },
  { name: 'Visakhapatnam',      state: 'Andhra Pradesh',    lat: 17.6868, lng: 83.2185, isMetro: true  },
  { name: 'Thiruvananthapuram', state: 'Kerala',            lat:  8.5241, lng: 76.9366, isMetro: true  },
  { name: 'Bhubaneswar',        state: 'Odisha',            lat: 20.2961, lng: 85.8245, isMetro: true  },
  { name: 'Patna',              state: 'Bihar',             lat: 25.5941, lng: 85.1376, isMetro: true  },
  { name: 'Nagpur',             state: 'Maharashtra',       lat: 21.1458, lng: 79.0882, isMetro: true  },

  // Districts (non-metro)
  { name: 'Bikaner',            state: 'Rajasthan',         lat: 28.0229, lng: 73.3119, isMetro: false },
  { name: 'Jaisalmer',          state: 'Rajasthan',         lat: 26.9157, lng: 70.9083, isMetro: false },
  { name: 'Jodhpur',            state: 'Rajasthan',         lat: 26.2389, lng: 73.0243, isMetro: false },
  { name: 'Udaipur',            state: 'Rajasthan',         lat: 24.5854, lng: 73.7125, isMetro: false },
  { name: 'Ajmer',              state: 'Rajasthan',         lat: 26.4521, lng: 74.6402, isMetro: false },
  { name: 'Nashik',             state: 'Maharashtra',       lat: 19.9975, lng: 73.7898, isMetro: false },
  { name: 'Aurangabad',         state: 'Maharashtra',       lat: 19.8762, lng: 75.3433, isMetro: false },
  { name: 'Kolhapur',           state: 'Maharashtra',       lat: 16.7050, lng: 74.2433, isMetro: false },
  { name: 'Madurai',            state: 'Tamil Nadu',        lat:  9.9252, lng: 78.1198, isMetro: false },
  { name: 'Coimbatore',         state: 'Tamil Nadu',        lat: 11.0168, lng: 76.9558, isMetro: false },
  { name: 'Salem',              state: 'Tamil Nadu',        lat: 11.6643, lng: 78.1460, isMetro: false },
  { name: 'Tiruchirappalli',    state: 'Tamil Nadu',        lat: 10.7905, lng: 78.7047, isMetro: false },
  { name: 'Varanasi',           state: 'Uttar Pradesh',     lat: 25.3176, lng: 82.9739, isMetro: false },
  { name: 'Kanpur',             state: 'Uttar Pradesh',     lat: 26.4499, lng: 80.3319, isMetro: false },
  { name: 'Agra',               state: 'Uttar Pradesh',     lat: 27.1767, lng: 78.0081, isMetro: false },
  { name: 'Allahabad',          state: 'Uttar Pradesh',     lat: 25.4358, lng: 81.8463, isMetro: false },
  { name: 'Meerut',             state: 'Uttar Pradesh',     lat: 28.9845, lng: 77.7064, isMetro: false },
  { name: 'Amritsar',           state: 'Punjab',            lat: 31.6340, lng: 74.8723, isMetro: false },
  { name: 'Ludhiana',           state: 'Punjab',            lat: 30.9010, lng: 75.8573, isMetro: false },
  { name: 'Jalandhar',          state: 'Punjab',            lat: 31.3260, lng: 75.5762, isMetro: false },
  { name: 'Indore',             state: 'Madhya Pradesh',    lat: 22.7196, lng: 75.8577, isMetro: false },
  { name: 'Gwalior',            state: 'Madhya Pradesh',    lat: 26.2183, lng: 78.1828, isMetro: false },
  { name: 'Jabalpur',           state: 'Madhya Pradesh',    lat: 23.1815, lng: 79.9864, isMetro: false },
  { name: 'Dibrugarh',          state: 'Assam',             lat: 27.4728, lng: 94.9120, isMetro: false },
  { name: 'Silchar',            state: 'Assam',             lat: 24.8333, lng: 92.7789, isMetro: false },
  { name: 'Mangalore',          state: 'Karnataka',         lat: 12.9141, lng: 74.8560, isMetro: false },
  { name: 'Mysuru',             state: 'Karnataka',         lat: 12.2958, lng: 76.6394, isMetro: false },
  { name: 'Hubli',              state: 'Karnataka',         lat: 15.3647, lng: 75.1240, isMetro: false },
  { name: 'Calicut',            state: 'Kerala',            lat: 11.2588, lng: 75.7804, isMetro: false },
  { name: 'Thrissur',           state: 'Kerala',            lat: 10.5276, lng: 76.2144, isMetro: false },
  { name: 'Raipur',             state: 'Chhattisgarh',      lat: 21.2514, lng: 81.6296, isMetro: false },
  { name: 'Dehradun',           state: 'Uttarakhand',       lat: 30.3165, lng: 78.0322, isMetro: false },
  { name: 'Haridwar',           state: 'Uttarakhand',       lat: 29.9457, lng: 78.1642, isMetro: false },
  { name: 'Ranchi',             state: 'Jharkhand',         lat: 23.3441, lng: 85.3096, isMetro: false },
  { name: 'Jamshedpur',         state: 'Jharkhand',         lat: 22.8046, lng: 86.2029, isMetro: false },
  { name: 'Imphal',             state: 'Manipur',           lat: 24.8170, lng: 93.9368, isMetro: false },
  { name: 'Shillong',           state: 'Meghalaya',         lat: 25.5788, lng: 91.8933, isMetro: false },
  { name: 'Agartala',           state: 'Tripura',           lat: 23.8315, lng: 91.2868, isMetro: false },
  { name: 'Gangtok',            state: 'Sikkim',            lat: 27.3314, lng: 88.6138, isMetro: false },
  { name: 'Portblair',          state: 'Andaman and Nicobar', lat: 11.6234, lng: 92.7265, isMetro: false },
  { name: 'Vijayawada',         state: 'Andhra Pradesh',    lat: 16.5062, lng: 80.6480, isMetro: false },
  { name: 'Guntur',             state: 'Andhra Pradesh',    lat: 16.3067, lng: 80.4365, isMetro: false },
  { name: 'Tirupati',           state: 'Andhra Pradesh',    lat: 13.6288, lng: 79.4192, isMetro: false },
  { name: 'Warangal',           state: 'Telangana',         lat: 17.9689, lng: 79.5941, isMetro: false },
  { name: 'Nizamabad',          state: 'Telangana',         lat: 18.6726, lng: 78.0941, isMetro: false },
];

// ─── India Geo Bounding Box ───────────────────────────────────────────────────

/** India territorial bounding box for GPS validation */
export const INDIA_BOUNDS = {
  latMin: 5.5,
  latMax: 37.6,
  lngMin: 67.0,
  lngMax: 97.5,
} as const;

/** Returns true if coordinates fall within Indian territory */
export function isWithinIndia(lat: number, lng: number): boolean {
  return (
    lat >= INDIA_BOUNDS.latMin &&
    lat <= INDIA_BOUNDS.latMax &&
    lng >= INDIA_BOUNDS.lngMin &&
    lng <= INDIA_BOUNDS.lngMax
  );
}

/** Returns a random city from the MAJOR_INDIAN_CITIES list */
export function getRandomIndianCity(): CityNode {
  return MAJOR_INDIAN_CITIES[Math.floor(Math.random() * MAJOR_INDIAN_CITIES.length)];
}
