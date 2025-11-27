import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { getPlaceAutocomplete, getPlaceDetails, getRoutes, getDistanceMatrix } from './services/googleMaps';
import { usageStatsService } from './services/usageStats';
import { searchAllTravelOptions } from './services/travelSearch';
import { scrapeWebsite } from './services/webScraper';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'VoyageBoard API' });
});

// Google Maps autocomplete endpoint
app.get('/api/places/autocomplete', async (req: Request, res: Response): Promise<void> => {
  const sessionToken = req.query.sessionToken as string | undefined;

  try {
    const { input } = req.query;

    if (!input || typeof input !== 'string') {
      usageStatsService.trackRequest('autocomplete', false, sessionToken, 'missing_input');
      res.status(400).json({
        error: 'Missing or invalid "input" query parameter',
      });
      return;
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      usageStatsService.trackRequest('autocomplete', false, sessionToken, 'missing_api_key');
      res.status(500).json({
        error: 'Google Maps API key not configured',
      });
      return;
    }

    const results = await getPlaceAutocomplete(
      input,
      apiKey,
      sessionToken
    );

    usageStatsService.trackRequest('autocomplete', true, sessionToken);
    res.json(results);
  } catch (error) {
    console.error('Autocomplete error:', error);
    usageStatsService.trackRequest('autocomplete', false, sessionToken, 'api_error');
    res.status(500).json({
      error: 'Failed to fetch autocomplete results',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Google Maps place details endpoint
app.get('/api/places/details/:placeId', async (req: Request, res: Response): Promise<void> => {
  const sessionToken = req.query.sessionToken as string | undefined;

  try {
    const { placeId } = req.params;

    if (!placeId) {
      usageStatsService.trackRequest('place-details', false, sessionToken, 'missing_place_id');
      res.status(400).json({
        error: 'Missing placeId parameter',
      });
      return;
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      usageStatsService.trackRequest('place-details', false, sessionToken, 'missing_api_key');
      res.status(500).json({
        error: 'Google Maps API key not configured',
      });
      return;
    }

    const details = await getPlaceDetails(placeId, apiKey);

    usageStatsService.trackRequest('place-details', true, sessionToken);
    res.json(details);
  } catch (error) {
    console.error('Place details error:', error);
    usageStatsService.trackRequest('place-details', false, sessionToken, 'api_error');
    res.status(500).json({
      error: 'Failed to fetch place details',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Usage statistics endpoints
app.get('/api/stats', (_req: Request, res: Response): void => {
  try {
    const days = parseInt(_req.query.days as string) || 7;
    const stats = usageStatsService.getStats(days);
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch usage statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/stats/summary', (_req: Request, res: Response): void => {
  try {
    const summary = usageStatsService.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Stats summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch usage summary',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/stats/reset', (_req: Request, res: Response): void => {
  try {
    usageStatsService.reset();
    res.json({ message: 'Usage statistics reset successfully' });
  } catch (error) {
    console.error('Stats reset error:', error);
    res.status(500).json({
      error: 'Failed to reset usage statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Web scraping endpoint
app.post('/api/scrape', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, waitForSelector, extractPlaces } = req.body;
    console.log("req.body", req.body)
    if (!url || typeof url !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid "url" in request body',
      });
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      res.status(400).json({
        error: 'Invalid URL format',
      });
      return;
    }

    // Get Google Maps API key if extractPlaces is true
    const googleMapsApiKey = extractPlaces ? process.env.GOOGLE_MAPS_API_KEY : undefined;

    if (extractPlaces && !googleMapsApiKey) {
      console.warn('Google Maps API key not configured. Places will be extracted without Google Maps enrichment.');
    }

    const scrapedData = await scrapeWebsite(url, waitForSelector, extractPlaces, googleMapsApiKey);
    res.json(scrapedData);
  } catch (error) {
    console.error('Web scraping error:', error);
    res.status(500).json({
      error: 'Failed to scrape website',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
