import axios from 'axios';
import { getRoutes, getPlaceDetails, PlaceLocation } from './googleMaps';
import { getTransitFareForRoute } from './transitFares';
import { searchFlights } from './amadeus';

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
}

export interface CombinedTravelResults {
  origin: PlaceLocation;
  destination: PlaceLocation;
  options: TravelOption[];
  summary: {
    totalOptions: number;
    cheapest?: TravelOption;
    fastest?: TravelOption;
    recommended?: TravelOption;
  };
}


const getIntraCityTransit = async (origin: PlaceLocation, destination: PlaceLocation): Promise<TravelOption[]> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key not configured');
  }

  const options: TravelOption[] = [];

  try {
    // Fetch multiple travel modes in parallel for intra-city travel
    const [driveRoute, walkRoute, bicycleRoute, transitRoute] = await Promise.allSettled([
      getRoutes(
        `${origin.latitude},${origin.longitude}`,
        `${destination.latitude},${destination.longitude}`,
        apiKey,
        'DRIVE'
      ),
      getRoutes(
        `${origin.latitude},${origin.longitude}`,
        `${destination.latitude},${destination.longitude}`,
        apiKey,
        'WALK'
      ),
      getRoutes(
        `${origin.latitude},${origin.longitude}`,
        `${destination.latitude},${destination.longitude}`,
        apiKey,
        'BICYCLE'
      ),
      getRoutes(
        `${origin.latitude},${origin.longitude}`,
        `${destination.latitude},${destination.longitude}`,
        apiKey,
        'TRANSIT'
      ),
    ]);

    // Process drive option
    if (driveRoute.status === 'fulfilled') {
      options.push({
        type: 'drive',
        provider: 'Google Maps',
        duration: driveRoute.value.overview.duration,
        distance: driveRoute.value.overview.distance,
      });
    }

    // Process walk option
    if (walkRoute.status === 'fulfilled') {
      options.push({
        type: 'walk',
        provider: 'Google Maps',
        duration: walkRoute.value.overview.duration,
        distance: walkRoute.value.overview.distance,
      });
    }

    // Process bicycle option
    if (bicycleRoute.status === 'fulfilled') {
      options.push({
        type: 'bicycle',
        provider: 'Google Maps',
        duration: bicycleRoute.value.overview.duration,
        distance: bicycleRoute.value.overview.distance,
      });
    }

    // Process transit option
    if (transitRoute.status === 'fulfilled') {
      const transitOption: TravelOption = {
        type: 'bus', // Default to bus, but could include train/subway
        provider: 'Google Maps Transit',
        duration: transitRoute.value.overview.duration,
        distance: transitRoute.value.overview.distance,
      };

      // Add fare if available from Google Maps
      if (transitRoute.value.fare) {
        transitOption.price = {
          amount: parseFloat(transitRoute.value.fare.amount),
          currency: transitRoute.value.fare.currencyCode,
        };
      } else {
        // Fallback to hardcoded fare data for known cities
        const hardcodedFare = getTransitFareForRoute(origin, destination);
        if (hardcodedFare) {
          transitOption.price = {
            amount: hardcodedFare.amount,
            currency: hardcodedFare.currency,
          };
          transitOption.provider = hardcodedFare.name;
        }
      }

      options.push(transitOption);
    }
  } catch (error) {
    console.error('Error fetching intra-city transit options:', error);
  }

  return options;
}

/**
 * Get inter-city travel options (flights, trains, driving)
 * For distances between 80km - 1000km
 */
const getInterCityTravel = async (origin: PlaceLocation, destination: PlaceLocation): Promise<TravelOption[]> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key not configured');
  }

  const options: TravelOption[] = [];

  try {
    // Get driving option
    const drivePromise = getRoutes(
      `${origin.latitude},${origin.longitude}`,
      `${destination.latitude},${destination.longitude}`,
      apiKey,
      'DRIVE'
    );

    // Get train option from Google Maps Transit
    const transitPromise = getRoutes(
      `${origin.latitude},${origin.longitude}`,
      `${destination.latitude},${destination.longitude}`,
      apiKey,
      'TRANSIT'
    );

    // Get flights if Amadeus API is configured
    let flightPromise: Promise<any> = Promise.resolve({ status: 'rejected' });
    const amadeusKey = process.env.AMADEUS_API_KEY;
    const amadeusSecret = process.env.AMADEUS_API_SECRET;

    if (amadeusKey && amadeusSecret) {
      flightPromise = searchFlights(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
        amadeusKey,
        amadeusSecret
      ).then(flights => ({ status: 'fulfilled', value: flights }))
        .catch(() => ({ status: 'rejected' }));
    }

    const [driveResult, transitResult, flightResult] = await Promise.allSettled([
      drivePromise,
      transitPromise,
      flightPromise,
    ]);

    // Process driving option
    if (driveResult.status === 'fulfilled') {
      options.push({
        type: 'drive',
        provider: 'Google Maps',
        duration: driveResult.value.overview.duration,
        distance: driveResult.value.overview.distance,
      });
    }

    // Process transit/train option
    if (transitResult.status === 'fulfilled') {
      const trainOption: TravelOption = {
        type: 'train',
        provider: 'Google Maps Transit',
        duration: transitResult.value.overview.duration,
        distance: transitResult.value.overview.distance,
      };

      // Add fare if available
      if (transitResult.value.fare) {
        trainOption.price = {
          amount: parseFloat(transitResult.value.fare.amount),
          currency: transitResult.value.fare.currencyCode,
        };
      }

      options.push(trainOption);
    }

    // Process flight options
    if (flightResult.status === 'fulfilled' && flightResult.value?.status === 'fulfilled') {
      const flights = flightResult.value.value;
      if (flights && flights.length > 0) {
        // Add the cheapest flight option
        const cheapestFlight = flights.reduce((min: any, flight: any) =>
          flight.price.amount < min.price.amount ? flight : min
        );

        options.push({
          type: 'flight',
          provider: `Flight (${cheapestFlight.carrier})`,
          duration: cheapestFlight.duration,
          price: {
            amount: cheapestFlight.price.amount,
            currency: cheapestFlight.price.currency,
          },
          departure: cheapestFlight.departure.time,
          arrival: cheapestFlight.arrival.time,
        });
      }
    }
  } catch (error) {
    console.error('Error fetching inter-city travel options:', error);
  }

  return options;
};

/**
 * Get long-distance travel options (primarily flights)
 * For distances > 1000km
 */
const getLongDistanceTravel = async (origin: PlaceLocation, destination: PlaceLocation): Promise<TravelOption[]> => {
  const options: TravelOption[] = [];

  try {
    // Only search for flights for long distances
    const amadeusKey = process.env.AMADEUS_API_KEY;
    const amadeusSecret = process.env.AMADEUS_API_SECRET;

    if (amadeusKey && amadeusSecret) {
      const flights = await searchFlights(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
        amadeusKey,
        amadeusSecret
      );

      if (flights && flights.length > 0) {
        // Add top 3 flight options
        flights.slice(0, 3).forEach((flight) => {
          options.push({
            type: 'flight',
            provider: `Flight (${flight.carrier})`,
            duration: flight.duration,
            price: {
              amount: flight.price.amount,
              currency: flight.price.currency,
            },
            departure: flight.departure.time,
            arrival: flight.arrival.time,
          });
        });
      }
    }
  } catch (error) {
    console.error('Error fetching long-distance travel options:', error);
  }

  return options;
};

const getTransitOptions = async (origin: PlaceLocation, destination: PlaceLocation): Promise<TravelOption[]> => {
  // Calculate distance between origin and destination
  const distance = calculateDistance(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

  console.log(`Distance: ${distance.toFixed(2)} km`);

  // Route based on distance
  if (distance < 80) {
    // Intra-city: local transit, walk, bike, drive
    return await getIntraCityTransit(origin, destination);
  } else if (distance < 1000) {
    // Inter-city: trains, flights, driving
    return await getInterCityTravel(origin, destination);
  } else {
    // Long distance: primarily flights
    return await getLongDistanceTravel(origin, destination);
  }
};

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

export const searchAllTravelOptions = async (origin: string, destination: string): Promise<CombinedTravelResults> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key not configured');
  }

  let originCoords: PlaceLocation | null = null;
  let destinationCoords: PlaceLocation | null = null;

  // If origin is a place ID, fetch its coordinates
  try {
    const originDetails = await getPlaceDetails(origin, apiKey);
    originCoords = originDetails.location
  } catch (error) {
    console.error('Error fetching origin coordinates:', error);
    throw new Error('Failed to fetch origin location details');
  }


  // If destination is a place ID, fetch its coordinates
  try {
    const destinationDetails = await getPlaceDetails(destination, apiKey);
    destinationCoords = destinationDetails.location
  } catch (error) {
    console.error('Error fetching destination coordinates:', error);
    throw new Error('Failed to fetch destination location details');
  }


  const options = await getTransitOptions(originCoords, destinationCoords);

  // Calculate summary statistics
  let cheapest: TravelOption | undefined;
  let fastest: TravelOption | undefined;
  let recommended: TravelOption | undefined;

  if (options.length > 0) {
    // Find cheapest option (only among those with price)
    const optionsWithPrice = options.filter(opt => opt.price);
    if (optionsWithPrice.length > 0) {
      cheapest = optionsWithPrice.reduce((min, opt) =>
        (opt.price && min.price && opt.price.amount < min.price.amount) ? opt : min
      );
    }

    // Find fastest option (parse duration and compare)
    fastest = options.reduce((min, opt) => {
      const minDuration = parseDuration(min.duration);
      const optDuration = parseDuration(opt.duration);
      return optDuration < minDuration ? opt : min;
    });

    // Recommended: balance of speed and cost
    // For now, prefer fastest if no prices, or cheapest among fast options
    if (optionsWithPrice.length > 0) {
      // Find options within 20% of fastest time
      const fastestDuration = parseDuration(fastest.duration);
      const reasonableFastOptions = optionsWithPrice.filter(opt => {
        const duration = parseDuration(opt.duration);
        return duration <= fastestDuration * 1.2;
      });

      if (reasonableFastOptions.length > 0) {
        recommended = reasonableFastOptions.reduce((min, opt) =>
          (opt.price && min.price && opt.price.amount < min.price.amount) ? opt : min
        );
      } else {
        recommended = fastest;
      }
    } else {
      recommended = fastest;
    }
  }

  return {
    origin: originCoords,
    destination: destinationCoords,
    options,
    summary: {
      totalOptions: options.length,
      cheapest,
      fastest,
      recommended,
    },
  };
}

// Helper function to parse duration string (e.g., "2h 30m" -> 150 minutes)
function parseDuration(duration: string): number {
  const hoursMatch = duration.match(/(\d+)h/);
  const minutesMatch = duration.match(/(\d+)m/);

  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

  return hours * 60 + minutes;
}