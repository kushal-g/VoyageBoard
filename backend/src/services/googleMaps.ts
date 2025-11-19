import axios from 'axios';

const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';

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

export interface PlaceDetailsResult {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  location: PlaceLocation;
  types: string[];
}

/**
 * Get autocomplete suggestions using Places API (New)
 * @param input - The search query string
 * @param apiKey - Google Maps API key
 * @param sessionToken - Optional session token for billing optimization
 * @returns Autocomplete predictions
 */
export async function getPlaceAutocomplete(
  input: string,
  apiKey: string,
  sessionToken?: string
): Promise<AutocompleteResponse> {
  try {
    const response = await axios.post(
      `${PLACES_API_BASE_URL}/places:autocomplete`,
      {
        input,
        sessionToken,
        includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'country'],
        languageCode: 'en',
      },
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
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types',
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
