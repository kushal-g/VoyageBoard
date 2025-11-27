import axios from 'axios';
import { getRoutes } from './googleMaps';

export interface TravelOption {
  type: 'flight' | 'train' | 'bus' | 'drive' | 'walk' | 'bicycle';
  provider: string;
  duration: string;
  distance?: string;
  price?: {
    amount: number;
    currency: string;
  };
  departure?: string;
  arrival?: string;
  details?: any;
}

export interface CombinedTravelResults {
  origin: string;
  destination: string;
  options: TravelOption[];
  summary: {
    totalOptions: number;
    cheapest?: TravelOption;
    fastest?: TravelOption;
    recommended?: TravelOption;
  };
}

/**
 * Search flights using Kiwi.com free API
 */
async function searchFlights(
  origin: string,
  destination: string,
  dateFrom?: string,
  dateTo?: string
): Promise<TravelOption[]> {
  try {
    // Kiwi.com API is free for testing (100 requests/month)
    // For production, you'd need to sign up at https://tequila.kiwi.com/

    // Note: This is a simplified version - you'll need actual IATA codes
    // For now, we'll return a placeholder
    console.log('Searching flights from', origin, 'to', destination);

    // In production, you would:
    // const response = await axios.get('https://api.tequila.kiwi.com/v2/search', {
    //   params: {
    //     fly_from: origin,
    //     fly_to: destination,
    //     date_from: dateFrom || new Date().toISOString().split('T')[0],
    //     date_to: dateTo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    //   },
    //   headers: {
    //     'apikey': process.env.KIWI_API_KEY || '',
    //   },
    // });

    // For now, return empty array (will be populated when you add API key)
    return [];
  } catch (error) {
    console.error('Error searching flights:', error);
    return [];
  }
}

/**
 * Get transit options (trains, buses) using Google Maps
 */
async function searchTransit(
  origin: string,
  destination: string,
  apiKey: string
): Promise<TravelOption[]> {
  try {
    const routes = await getRoutes(origin, destination, apiKey, 'TRANSIT');

    return [{
      type: 'train',
      provider: 'Google Transit',
      duration: routes.overview.duration,
      distance: routes.overview.distance,
      details: routes,
    }];
  } catch (error) {
    console.error('Error searching transit:', error);
    return [];
  }
}

/**
 * Get driving directions using Google Maps
 */
async function searchDriving(
  origin: string,
  destination: string,
  apiKey: string
): Promise<TravelOption[]> {
  try {
    const routes = await getRoutes(origin, destination, apiKey, 'DRIVE');

    return [{
      type: 'drive',
      provider: 'Google Maps',
      duration: routes.overview.duration,
      distance: routes.overview.distance,
      details: routes,
    }];
  } catch (error) {
    console.error('Error searching driving:', error);
    return [];
  }
}

/**
 * Search all travel options and combine results
 */
export async function searchAllTravelOptions(
  origin: string,
  destination: string,
  googleMapsApiKey: string,
  options?: {
    includeFlights?: boolean;
    includeTransit?: boolean;
    includeDriving?: boolean;
    includeWalking?: boolean;
    includeBicycling?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<CombinedTravelResults> {
  const {
    includeFlights = true,
    includeTransit = true,
    includeDriving = true,
    includeWalking = false,
    includeBicycling = false,
    dateFrom,
    dateTo,
  } = options || {};

  const allOptions: TravelOption[] = [];

  // Fetch all options in parallel for better performance
  const promises: Promise<TravelOption[]>[] = [];

  if (includeFlights) {
    promises.push(searchFlights(origin, destination, dateFrom, dateTo));
  }

  if (includeTransit) {
    promises.push(searchTransit(origin, destination, googleMapsApiKey));
  }

  if (includeDriving) {
    promises.push(searchDriving(origin, destination, googleMapsApiKey));
  }

  if (includeWalking) {
    promises.push(
      getRoutes(origin, destination, googleMapsApiKey, 'WALK')
        .then((routes) => [{
          type: 'walk' as const,
          provider: 'Google Maps',
          duration: routes.overview.duration,
          distance: routes.overview.distance,
          details: routes,
        }])
        .catch(() => [])
    );
  }

  if (includeBicycling) {
    promises.push(
      getRoutes(origin, destination, googleMapsApiKey, 'BICYCLE')
        .then((routes) => [{
          type: 'bicycle' as const,
          provider: 'Google Maps',
          duration: routes.overview.duration,
          distance: routes.overview.distance,
          details: routes,
        }])
        .catch(() => [])
    );
  }

  // Wait for all searches to complete
  const results = await Promise.all(promises);

  // Flatten results
  results.forEach((optionArray) => {
    allOptions.push(...optionArray);
  });

  // Find cheapest and fastest
  const cheapest = allOptions
    .filter((opt) => opt.price)
    .sort((a, b) => (a.price?.amount || 0) - (b.price?.amount || 0))[0];

  const fastest = allOptions
    .sort((a, b) => {
      const aDuration = parseDuration(a.duration);
      const bDuration = parseDuration(b.duration);
      return aDuration - bDuration;
    })[0];

  // Recommended is fastest if available, otherwise cheapest
  const recommended = fastest || cheapest || allOptions[0];

  return {
    origin,
    destination,
    options: allOptions,
    summary: {
      totalOptions: allOptions.length,
      cheapest,
      fastest,
      recommended,
    },
  };
}

/**
 * Parse duration string like "1h 25m" to minutes
 */
function parseDuration(duration: string): number {
  const hourMatch = duration.match(/(\d+)h/);
  const minuteMatch = duration.match(/(\d+)m/);

  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;

  return hours * 60 + minutes;
}
