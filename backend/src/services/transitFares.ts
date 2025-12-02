import { PlaceLocation } from './googleMaps';

interface TransitFare {
  amount: number;
  currency: string;
  name: string;
  lastUpdated: string; // Date when fare was last verified
}

interface CityFareData {
  cityName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  radius: number; // km - area where this fare applies
  fare: TransitFare;
}

// Common transit fares for major cities
// Note: These are base fares and may vary based on distance, time, or zones
const CITY_TRANSIT_FARES: CityFareData[] = [
  // North America
  {
    cityName: 'New York City',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    radius: 50,
    fare: { amount: 2.90, currency: 'USD', name: 'MTA Subway/Bus', lastUpdated: '2024-08' }
  },
  {
    cityName: 'San Francisco',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    radius: 30,
    fare: { amount: 2.50, currency: 'USD', name: 'SFMTA Muni', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Los Angeles',
    coordinates: { lat: 34.0522, lng: -118.2437 },
    radius: 50,
    fare: { amount: 1.75, currency: 'USD', name: 'LA Metro', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Chicago',
    coordinates: { lat: 41.8781, lng: -87.6298 },
    radius: 40,
    fare: { amount: 2.50, currency: 'USD', name: 'CTA', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Boston',
    coordinates: { lat: 42.3601, lng: -71.0589 },
    radius: 30,
    fare: { amount: 2.40, currency: 'USD', name: 'MBTA', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Washington DC',
    coordinates: { lat: 38.9072, lng: -77.0369 },
    radius: 40,
    fare: { amount: 2.00, currency: 'USD', name: 'WMATA Metro', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Toronto',
    coordinates: { lat: 43.6532, lng: -79.3832 },
    radius: 40,
    fare: { amount: 3.35, currency: 'CAD', name: 'TTC', lastUpdated: '2024-08' }
  },

  // Europe
  {
    cityName: 'London',
    coordinates: { lat: 51.5074, lng: -0.1278 },
    radius: 50,
    fare: { amount: 2.80, currency: 'GBP', name: 'Transport for London', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Paris',
    coordinates: { lat: 48.8566, lng: 2.3522 },
    radius: 40,
    fare: { amount: 2.10, currency: 'EUR', name: 'RATP Metro', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Berlin',
    coordinates: { lat: 52.5200, lng: 13.4050 },
    radius: 40,
    fare: { amount: 3.20, currency: 'EUR', name: 'BVG', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Amsterdam',
    coordinates: { lat: 52.3676, lng: 4.9041 },
    radius: 30,
    fare: { amount: 3.40, currency: 'EUR', name: 'GVB', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Madrid',
    coordinates: { lat: 40.4168, lng: -3.7038 },
    radius: 40,
    fare: { amount: 1.50, currency: 'EUR', name: 'Metro de Madrid', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Barcelona',
    coordinates: { lat: 41.3851, lng: 2.1734 },
    radius: 35,
    fare: { amount: 2.40, currency: 'EUR', name: 'TMB', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Rome',
    coordinates: { lat: 41.9028, lng: 12.4964 },
    radius: 35,
    fare: { amount: 1.50, currency: 'EUR', name: 'ATAC', lastUpdated: '2024-08' }
  },

  // Asia
  {
    cityName: 'Tokyo',
    coordinates: { lat: 35.6762, lng: 139.6503 },
    radius: 50,
    fare: { amount: 170, currency: 'JPY', name: 'Tokyo Metro', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Osaka',
    coordinates: { lat: 34.6937, lng: 135.5023 },
    radius: 40,
    fare: { amount: 180, currency: 'JPY', name: 'Osaka Metro', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Seoul',
    coordinates: { lat: 37.5665, lng: 126.9780 },
    radius: 50,
    fare: { amount: 1400, currency: 'KRW', name: 'Seoul Metro', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Singapore',
    coordinates: { lat: 1.3521, lng: 103.8198 },
    radius: 30,
    fare: { amount: 1.50, currency: 'SGD', name: 'SMRT/SBS Transit', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Hong Kong',
    coordinates: { lat: 22.3193, lng: 114.1694 },
    radius: 30,
    fare: { amount: 5.50, currency: 'HKD', name: 'MTR', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Bangkok',
    coordinates: { lat: 13.7563, lng: 100.5018 },
    radius: 40,
    fare: { amount: 16, currency: 'THB', name: 'BTS/MRT', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Mumbai',
    coordinates: { lat: 19.0760, lng: 72.8777 },
    radius: 40,
    fare: { amount: 10, currency: 'INR', name: 'Mumbai Metro', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Delhi',
    coordinates: { lat: 28.6139, lng: 77.2090 },
    radius: 50,
    fare: { amount: 10, currency: 'INR', name: 'Delhi Metro', lastUpdated: '2024-08' }
  },

  // Australia & Oceania
  {
    cityName: 'Sydney',
    coordinates: { lat: -33.8688, lng: 151.2093 },
    radius: 50,
    fare: { amount: 4.00, currency: 'AUD', name: 'Transport NSW', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Melbourne',
    coordinates: { lat: -37.8136, lng: 144.9631 },
    radius: 40,
    fare: { amount: 4.90, currency: 'AUD', name: 'PTV', lastUpdated: '2024-08' }
  },

  // South America
  {
    cityName: 'São Paulo',
    coordinates: { lat: -23.5505, lng: -46.6333 },
    radius: 50,
    fare: { amount: 5.00, currency: 'BRL', name: 'São Paulo Metro', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Mexico City',
    coordinates: { lat: 19.4326, lng: -99.1332 },
    radius: 50,
    fare: { amount: 5, currency: 'MXN', name: 'Mexico City Metro', lastUpdated: '2024-08' }
  },
  {
    cityName: 'Buenos Aires',
    coordinates: { lat: -34.6037, lng: -58.3816 },
    radius: 40,
    fare: { amount: 125, currency: 'ARS', name: 'Buenos Aires Metro', lastUpdated: '2024-08' }
  }
];

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get transit fare for a location based on hardcoded city data
 * @param location - Location to check
 * @returns Transit fare if location is within a known city, undefined otherwise
 */
export function getHardcodedTransitFare(location: PlaceLocation): TransitFare | undefined {
  for (const cityData of CITY_TRANSIT_FARES) {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      cityData.coordinates.lat,
      cityData.coordinates.lng
    );

    if (distance <= cityData.radius) {
      return cityData.fare;
    }
  }

  return undefined;
}

/**
 * Get transit fare between two locations
 * Uses the origin location to determine which city's transit system applies
 * @param origin - Origin location
 * @param destination - Destination location (not used currently, but available for future distance-based pricing)
 * @returns Transit fare if available
 */
export function getTransitFareForRoute(origin: PlaceLocation, destination: PlaceLocation): TransitFare | undefined {
  // For intra-city transit, use the origin location to determine the fare
  return getHardcodedTransitFare(origin);
}
