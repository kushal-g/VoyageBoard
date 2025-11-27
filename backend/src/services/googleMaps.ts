import axios from 'axios';

const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';
const ROUTES_API_BASE_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export interface AutocompleteResult {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface AutocompleteResponse {
  predictions: AutocompleteResult[];
}

export interface PlaceLocation {
  latitude: number;
  longitude: number;
}

export interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{
    displayName: string;
    uri: string;
    photoUri: string;
  }>;
}

export interface PlaceDetailsResult {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  location: PlaceLocation;
  types: string[];
  photos?: PlacePhoto[];
}

/**
 * Get autocomplete suggestions using Places API (New)
 * @param input - The search query string
 * @param apiKey - Google Maps API key
 * @param sessionToken - Optional session token for billing optimization
 * @param includeAllTypes - If true, includes all place types (attractions, restaurants, etc.). If false, only includes geographic types
 * @returns Autocomplete predictions
 */
export async function getPlaceAutocomplete(
  input: string,
  apiKey: string,
  sessionToken?: string,
  includeAllTypes = false
): Promise<AutocompleteResponse> {
  try {
    const requestBody: any = {
      input,
      sessionToken,
      languageCode: 'en',
    };

    // Only restrict to geographic types if includeAllTypes is false
    if (!includeAllTypes) {
      requestBody.includedPrimaryTypes = ['locality', 'administrative_area_level_1', 'country'];
    }

    const response = await axios.post(
      `${PLACES_API_BASE_URL}/places:autocomplete`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
      }
    );

    const predictions: AutocompleteResult[] = (response.data.suggestions || []).map((suggestion: any) => {
      const placePrediction = suggestion.placePrediction;
      return {
        description: placePrediction.text.text,
        placeId: placePrediction.placeId,
        mainText: placePrediction.structuredFormat.mainText.text,
        secondaryText: placePrediction.structuredFormat.secondaryText.text,
        types: placePrediction.types || [],
      };
    });

    return {
      predictions,
    };
  } catch (error) {
    console.error('Error fetching autocomplete results:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API Error:', error.response.data);
    }
    throw error;
  }
}

/**
 * Get place details using Places API (New)
 * @param placeId - The Google Place ID
 * @param apiKey - Google Maps API key
 * @returns Place details including coordinates
 */
export async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<PlaceDetailsResult> {
  try {
    const response = await axios.get(
      `${PLACES_API_BASE_URL}/places/${placeId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types,photos',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching place details:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API Error:', error.response.data);
    }
    throw error;
  }
}

export interface Routeleg {
  distanceMeters: number;
  duration: string;
  startLocation: PlaceLocation;
  endLocation: PlaceLocation;
}

export interface Route {
  distanceMeters: number;
  duration: string;
  polyline: {
    encodedPolyline: string;
  };
  legs: Routeleg[];
}

export interface TransitDetails {
  arrivalTime: string;
  departureTime: string;
  numberOfStops: number;
  line: {
    name: string;
    type: string;
    color?: string;
  };
}

export interface RouteStep {
  distanceMeters: number;
  duration: string;
  startLocation: PlaceLocation;
  endLocation: PlaceLocation;
  navigationInstruction?: string;
  travelMode: string;
  transitDetails?: TransitDetails;
}

export interface RoutesResponse {
  routes: Route[];
  distanceMeters: number;
  duration: string;
  travelMode: string;
  overview: {
    distance: string;
    duration: string;
    startAddress: string;
    endAddress: string;
  };
}

/**
 * Get routes between two places with distance and transit options
 * @param origin - Origin place ID or coordinates
 * @param destination - Destination place ID or coordinates
 * @param apiKey - Google Maps API key
 * @param travelMode - Travel mode: DRIVE, WALK, BICYCLE, TRANSIT, TWO_WHEELER
 * @returns Route information with distance and transit details
 */
export async function getRoutes(
  origin: string,
  destination: string,
  apiKey: string,
  travelMode: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT' | 'TWO_WHEELER' = 'DRIVE'
): Promise<RoutesResponse> {
  try {
    const requestBody: any = {
      origin: {},
      destination: {},
      travelMode,
      computeAlternativeRoutes: true,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
      },
      languageCode: 'en-US',
      units: 'METRIC',
    };

    // Check if origin is a place ID or coordinates
    if (origin.startsWith('ChIJ')) {
      requestBody.origin.placeId = origin;
    } else {
      const [lat, lng] = origin.split(',').map((s) => parseFloat(s.trim()));
      requestBody.origin.location = {
        latLng: { latitude: lat, longitude: lng },
      };
    }

    // Check if destination is a place ID or coordinates
    if (destination.startsWith('ChIJ')) {
      requestBody.destination.placeId = destination;
    } else {
      const [lat, lng] = destination.split(',').map((s) => parseFloat(s.trim()));
      requestBody.destination.location = {
        latLng: { latitude: lat, longitude: lng },
      };
    }

    const response = await axios.post(ROUTES_API_BASE_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs',
      },
    });

    const routes = response.data.routes || [];
    const primaryRoute = routes[0];

    if (!primaryRoute) {
      throw new Error('No routes found');
    }

    // Calculate totals
    const distanceMeters = primaryRoute.distanceMeters || 0;
    const duration = primaryRoute.duration || '0s';

    // Format distance
    const distanceKm = (distanceMeters / 1000).toFixed(2);
    const distanceMiles = (distanceMeters / 1609.34).toFixed(2);

    // Format duration
    const durationSeconds = parseInt(duration.replace('s', ''));
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const durationFormatted =
      hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      routes: routes.map((route: any) => ({
        distanceMeters: route.distanceMeters,
        duration: route.duration,
        polyline: route.polyline,
        legs: route.legs || [],
      })),
      distanceMeters,
      duration,
      travelMode,
      overview: {
        distance: `${distanceKm} km (${distanceMiles} mi)`,
        duration: durationFormatted,
        startAddress: 'Origin',
        endAddress: 'Destination',
      },
    };
  } catch (error) {
    console.error('Error fetching routes:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('API Error:', error.response.data);
    }
    throw error;
  }
}

/**
 * Get distance matrix between multiple origins and destinations
 * @param origins - Array of place IDs or coordinates
 * @param destinations - Array of place IDs or coordinates
 * @param apiKey - Google Maps API key
 * @param travelMode - Travel mode
 * @returns Distance matrix with all combinations
 */
export async function getDistanceMatrix(
  origins: string[],
  destinations: string[],
  apiKey: string,
  travelMode: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT' | 'TWO_WHEELER' = 'DRIVE'
): Promise<any> {
  try {
    const results = [];

    for (const origin of origins) {
      for (const destination of destinations) {
        const route = await getRoutes(origin, destination, apiKey, travelMode);
        results.push({
          origin,
          destination,
          distance: route.overview.distance,
          duration: route.overview.duration,
          distanceMeters: route.distanceMeters,
        });
      }
    }

    return {
      origins,
      destinations,
      travelMode,
      results,
    };
  } catch (error) {
    console.error('Error calculating distance matrix:', error);
    throw error;
  }
}
