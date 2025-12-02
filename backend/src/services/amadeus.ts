import axios from 'axios';

const AMADEUS_AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_FLIGHT_OFFERS_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers';
const AMADEUS_AIRPORT_SEARCH_URL = 'https://test.api.amadeus.com/v1/reference-data/locations';

interface AmadeusToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AmadeusFlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
  };
  itineraries: Array<{
    duration: string; // Format: PT2H30M
    segments: Array<{
      departure: {
        iataCode: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        at: string;
      };
      carrierCode: string;
      number: string;
    }>;
  }>;
}

interface AmadeusFlightSearchResponse {
  data: AmadeusFlightOffer[];
}

interface AmadeusLocation {
  type: string;
  subType: string;
  name: string;
  iataCode: string;
  address: {
    cityName: string;
    countryName: string;
  };
  geoCode: {
    latitude: number;
    longitude: number;
  };
}

interface AmadeusLocationSearchResponse {
  data: AmadeusLocation[];
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get Amadeus API access token
 * Caches the token until it expires
 */
async function getAmadeusToken(apiKey: string, apiSecret: string): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  try {
    const response = await axios.post<AmadeusToken>(
      AMADEUS_AUTH_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: apiKey,
        client_secret: apiSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const token = response.data.access_token;
    const expiresIn = response.data.expires_in;

    // Cache token with a 60-second buffer before expiration
    cachedToken = {
      token,
      expiresAt: Date.now() + (expiresIn - 60) * 1000,
    };

    return token;
  } catch (error) {
    console.error('Error getting Amadeus token:', error);
    throw new Error('Failed to authenticate with Amadeus API');
  }
}

/**
 * Convert ISO 8601 duration (PT2H30M) to readable format
 */
function parseDuration(isoDuration: string): string {
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!matches) return isoDuration;

  const hours = parseInt(matches[1] || '0');
  const minutes = parseInt(matches[2] || '0');

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

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
 * Find nearest airport to given coordinates using Amadeus Airport Search API
 */
async function findNearestAirport(
  lat: number,
  lng: number,
  token: string
): Promise<string | null> {
  try {
    console.log(`Searching for airport near coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    // Use the correct endpoint for airport search by coordinates
    const response = await axios.get<AmadeusLocationSearchResponse>(
      `${AMADEUS_AIRPORT_SEARCH_URL}/airports`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
          radius: 150,
          'page[limit]': 1,
          sort: 'relevance',
        },
        timeout: 5000,
      }
    );

    if (response.data.data && response.data.data.length > 0) {
      const airport = response.data.data[0];
      const distance = calculateDistance(lat, lng, airport.geoCode.latitude, airport.geoCode.longitude);
      console.log(`✓ Found airport: ${airport.iataCode} - ${airport.name} (${airport.address.cityName}) - ${distance.toFixed(1)}km away`);
      return airport.iataCode;
    }

    console.log(`✗ No airport found within 150km of ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Amadeus Airport Search error:', error.response?.status, error.response?.data);
    } else {
      console.error('Error finding nearest airport:', error);
    }
    return null;
  }
}

export interface FlightOption {
  price: {
    amount: number;
    currency: string;
  };
  duration: string;
  departure: {
    airport: string;
    time: string;
  };
  arrival: {
    airport: string;
    time: string;
  };
  carrier: string;
}

/**
 * Search for flights between two locations
 * @param originLat - Origin latitude
 * @param originLng - Origin longitude
 * @param destLat - Destination latitude
 * @param destLng - Destination longitude
 * @param apiKey - Amadeus API key
 * @param apiSecret - Amadeus API secret
 * @returns Flight options if available
 */
export async function searchFlights(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey: string,
  apiSecret: string
): Promise<FlightOption[]> {
  console.log('\n=== AMADEUS FLIGHT SEARCH ===');
  console.log(`Origin: ${originLat.toFixed(4)}, ${originLng.toFixed(4)}`);
  console.log(`Destination: ${destLat.toFixed(4)}, ${destLng.toFixed(4)}`);

  try {
    // Get authentication token
    const token = await getAmadeusToken(apiKey, apiSecret);
    console.log('✓ Authenticated with Amadeus');

    // Find nearest airports to both origin and destination
    console.log('\nLooking up airports...');
    const [originCode, destCode] = await Promise.all([
      findNearestAirport(originLat, originLng, token),
      findNearestAirport(destLat, destLng, token),
    ]);

    if (!originCode) {
      console.log(`✗ Could not find origin airport near ${originLat.toFixed(4)}, ${originLng.toFixed(4)}`);
      console.log('=== END FLIGHT SEARCH ===\n');
      return [];
    }

    if (!destCode) {
      console.log(`✗ Could not find destination airport near ${destLat.toFixed(4)}, ${destLng.toFixed(4)}`);
      console.log('=== END FLIGHT SEARCH ===\n');
      return [];
    }

    if (originCode === destCode) {
      console.log(`✗ Origin and destination airports are the same (${originCode})`);
      console.log('=== END FLIGHT SEARCH ===\n');
      return [];
    }

    // Search for flights
    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() + 7); // Search for flights 7 days from now
    const formattedDate = departureDate.toISOString().split('T')[0];

    console.log(`\nSearching flights: ${originCode} → ${destCode} on ${formattedDate}`);

    const response = await axios.get<AmadeusFlightSearchResponse>(
      AMADEUS_FLIGHT_OFFERS_URL,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          originLocationCode: originCode,
          destinationLocationCode: destCode,
          departureDate: formattedDate,
          adults: 1,
          max: 5, // Limit to top 5 results
          currencyCode: 'USD',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    if (!response.data.data || response.data.data.length === 0) {
      console.log('✗ No flights found for this route');
      console.log('=== END FLIGHT SEARCH ===\n');
      return [];
    }

    // Transform Amadeus response to our format
    const flights: FlightOption[] = response.data.data.map((offer) => {
      const firstItinerary = offer.itineraries[0];
      const firstSegment = firstItinerary.segments[0];
      const lastSegment = firstItinerary.segments[firstItinerary.segments.length - 1];

      return {
        price: {
          amount: parseFloat(offer.price.total),
          currency: offer.price.currency,
        },
        duration: parseDuration(firstItinerary.duration),
        departure: {
          airport: firstSegment.departure.iataCode,
          time: firstSegment.departure.at,
        },
        arrival: {
          airport: lastSegment.arrival.iataCode,
          time: lastSegment.arrival.at,
        },
        carrier: firstSegment.carrierCode,
      };
    });

    console.log(`✓ Found ${flights.length} flight options`);
    if (flights.length > 0) {
      const cheapest = flights.reduce((min, f) => f.price.amount < min.price.amount ? f : min);
      console.log(`  Cheapest: $${cheapest.price.amount} ${cheapest.price.currency} (${cheapest.duration})`);
    }
    console.log('=== END FLIGHT SEARCH ===\n');

    return flights;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('✗ Amadeus API error:', error.response?.status, error.response?.data?.errors || error.message);
    } else {
      console.error('✗ Error searching flights:', error);
    }
    console.log('=== END FLIGHT SEARCH ===\n');
    return [];
  }
}
