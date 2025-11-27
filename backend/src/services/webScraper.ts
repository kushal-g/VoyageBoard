import puppeteer, { Browser, Page } from 'puppeteer';
import Anthropic from '@anthropic-ai/sdk';
import { getPlaceAutocomplete, getPlaceDetails, PlaceLocation } from './googleMaps';

export interface TravelPlace {
  name: string;
  description?: string;
  type?: string; // e.g., "city", "attraction", "restaurant", "hotel", "beach", etc.
  location?: string; // e.g., "Paris, France" or "Manhattan, New York"
  recommendations?: string; // Any specific recommendations or tips
  placeId?: string; // Google Maps Place ID
  coordinates?: PlaceLocation; // Google Maps coordinates
  formattedAddress?: string; // Formatted address from Google Maps
  photoReference?: string; // Google Maps photo name for fetching images
}

export interface ScrapedData {
  url: string;
  html: string;
  title?: string;
  description?: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  links: Array<{
    text: string;
    href: string;
  }>;
  images: Array<{
    src: string;
    alt: string;
  }>;
  paragraphs: string[];
  metadata: {
    author?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
  textContent?: string;
  extractedPlaces?: TravelPlace[];
}

let browserInstance: Browser | null = null;
let anthropicClient: Anthropic | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browserInstance;
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Enriches a place with Google Maps data (place ID, coordinates, formatted address)
 * @param place - The travel place extracted from the blog
 * @param googleMapsApiKey - Google Maps API key
 * @returns The enriched place with Google Maps data
 */
async function enrichPlaceWithGoogleMaps(
  place: TravelPlace,
  googleMapsApiKey: string
): Promise<TravelPlace> {
  try {
    // Create a search query combining name and location
    const searchQuery = place.location
      ? `${place.name}, ${place.location}`
      : place.name;

    // Get autocomplete results to find the place ID
    // Use includeAllTypes=true to get all place types (not just geographic)
    const autocompleteResults = await getPlaceAutocomplete(
      searchQuery,
      googleMapsApiKey,
      undefined, // no session token
      true // includeAllTypes
    );

    if (autocompleteResults.predictions.length === 0) {
      console.log(`No Google Maps results found for: ${searchQuery}`);
      return place;
    }

    // Use the first (best) match
    const topResult = autocompleteResults.predictions[0];

    // Get detailed information including coordinates
    const placeDetails = await getPlaceDetails(topResult.placeId, googleMapsApiKey);

    // Extract the first photo reference if available
    const photoReference = placeDetails.photos && placeDetails.photos.length > 0
      ? placeDetails.photos[0].name
      : undefined;

    return {
      ...place,
      placeId: placeDetails.id,
      coordinates: placeDetails.location,
      formattedAddress: placeDetails.formattedAddress,
      photoReference,
    };
  } catch (error) {
    console.error(`Error enriching place "${place.name}" with Google Maps data:`, error);
    // Return the original place without Google Maps data on error
    return place;
  }
}

async function extractPlacesWithClaude(
  textContent: string,
  googleMapsApiKey?: string,
  title?: string
): Promise<TravelPlace[]> {
  try {
    const client = getAnthropicClient();

    const prompt = `You are analyzing a travel blog post. Extract all places, destinations, attractions, restaurants, hotels, or points of interest mentioned that the author recommends visiting.

Blog Title: ${title || 'N/A'}

Blog Content:
${textContent}

Please extract all travel destinations and places mentioned in this blog post. For each place, provide:
1. Name of the place
2. Brief description (if available in the content)
3. Type (e.g., city, attraction, restaurant, hotel, beach, museum, park, etc.)
4. Location (country, region, or city context if mentioned)
5. Any specific recommendations or tips mentioned

Return ONLY a valid JSON array of objects with this structure:
[
  {
    "name": "Place Name",
    "description": "Brief description from the blog",
    "type": "city/attraction/restaurant/hotel/etc",
    "location": "City, Country or Region",
    "recommendations": "Any tips or recommendations mentioned"
  }
]

If no travel places are mentioned, return an empty array: []

Important: Return ONLY the JSON array, no additional text or explanation.`;

    const message = await client.messages.create({
      model: 'claude-3-7-sonnet-latest',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse the JSON response
    const places = JSON.parse(responseText.trim()) as TravelPlace[];

    // Enrich places with Google Maps data if API key is provided
    if (googleMapsApiKey && places.length > 0) {
      console.log(`Enriching ${places.length} places with Google Maps data...`);

      // Process places in parallel with a small delay to avoid rate limits
      const enrichedPlaces = await Promise.all(
        places.map(async (place, index) => {
          // Add a small delay between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, index * 100));
          return enrichPlaceWithGoogleMaps(place, googleMapsApiKey);
        })
      );

      return enrichedPlaces;
    }

    return places;
  } catch (error) {
    console.error('Error extracting places with Claude:', error);
    // Return empty array on error rather than failing the entire request
    return [];
  }
}

export async function scrapeWebsite(
  url: string,
  waitForSelector?: string,
  extractPlaces = false,
  googleMapsApiKey?: string
): Promise<ScrapedData> {
  let page: Page | null = null;

  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are supported');
    }

    const browser = await getBrowser();
    page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to the page
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for a specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    // Get the fully rendered HTML
    const html = await page.content();

    // Extract data using page.evaluate to run code in browser context
    const scrapedData = await page.evaluate(() => {
      // Extract title
      const title = document.title || document.querySelector('h1')?.textContent?.trim();

      // Extract meta description
      const descriptionMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      const ogDescriptionMeta = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
      const description = descriptionMeta?.content || ogDescriptionMeta?.content;

      // Extract headings
      const h1Elements = Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim() || '').filter(Boolean);
      const h2Elements = Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim() || '').filter(Boolean);
      const h3Elements = Array.from(document.querySelectorAll('h3')).map(el => el.textContent?.trim() || '').filter(Boolean);

      // Extract links
      const links = Array.from(document.querySelectorAll('a[href]')).map(el => {
        const anchor = el as HTMLAnchorElement;
        return {
          text: anchor.textContent?.trim() || '',
          href: anchor.href,
        };
      }).filter(link => link.text && link.href);

      // Extract images
      const images = Array.from(document.querySelectorAll('img[src]')).map(el => {
        const img = el as HTMLImageElement;
        return {
          src: img.src,
          alt: img.alt || '',
        };
      });

      // Extract paragraphs
      const paragraphs = Array.from(document.querySelectorAll('p'))
        .map(el => el.textContent?.trim() || '')
        .filter(text => text.length > 20);

      // Extract metadata
      const authorMeta = document.querySelector('meta[name="author"]') as HTMLMetaElement;
      const keywordsMeta = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
      const ogTitleMeta = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
      const ogDescMeta = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
      const ogImageMeta = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;

      const metadata = {
        author: authorMeta?.content,
        keywords: keywordsMeta?.content,
        ogTitle: ogTitleMeta?.content,
        ogDescription: ogDescMeta?.content,
        ogImage: ogImageMeta?.content,
      };

      // Extract main text content
      const textContent = document.body.innerText;

      return {
        title,
        description,
        headings: {
          h1: h1Elements,
          h2: h2Elements,
          h3: h3Elements,
        },
        links: links.slice(0, 100),
        images: images.slice(0, 50),
        paragraphs: paragraphs.slice(0, 50),
        metadata,
        textContent: textContent.slice(0, 10000), // Limit text content to 10k chars
      };
    });

    // Extract places using Claude if requested
    let extractedPlaces: TravelPlace[] | undefined;
    if (extractPlaces && scrapedData.textContent) {
      extractedPlaces = await extractPlacesWithClaude(
        scrapedData.textContent,
        googleMapsApiKey,
        scrapedData.title
      );
    }

    return {
      url,
      html,
      ...scrapedData,
      extractedPlaces,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        throw new Error('Website not found');
      }
      if (error.message.includes('Navigation timeout')) {
        throw new Error('Request timeout - website took too long to load');
      }
      if (error.message.includes('net::ERR_')) {
        throw new Error(`Network error: ${error.message}`);
      }
    }
    throw error;
  } finally {
    if (page) {
      await page.close();
    }
  }
}

// Cleanup function to close browser when process exits
export async function closeBrowser(): Promise<void> {
  if (browserInstance && browserInstance.connected) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
