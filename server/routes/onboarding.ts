import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { analytics } from '@shared/schema';

// Middleware to check if the user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "You must be logged in to access this resource" });
};

const router = express.Router();

// Middleware to ensure user is authenticated
router.use(isAuthenticated);

/**
 * Get popular films for onboarding rating
 * Returns a list of popular films with a mix of genres for the user to rate
 * Supports a "count" parameter to get a larger batch of films for client-side filtering
 */
router.get('/popular-films', async (req: Request, res: Response) => {
  try {
    // Allow requesting a larger count for client-side filtering
    const count = req.query.count ? parseInt(req.query.count as string) : 12;
    const maxCount = 100; // Set a reasonable maximum
    
    // Generate a cache-busting random seed to ensure we get varied films
    const randomSeed = req.query.seed ? parseInt(req.query.seed as string) : Date.now();
    
    console.log(`Fetching popular films, count=${Math.min(count, maxCount)}, seed=${randomSeed}`);
    
    // Get popular films for the user to rate
    // Pass 0 for offset since we're handling batching on the client
    const films = await storage.getPopularFilmsForOnboarding(Math.min(count, maxCount), 0, randomSeed);
    
    // Log the first 3 film titles
    console.log(`Returning ${films.length} films. First few titles: ${films.slice(0, 3).map(f => f.title).join(', ')}`);
    
    res.json(films);
  } catch (error) {
    console.error('Error fetching popular films for onboarding:', error);
    res.status(500).json({ message: 'Failed to fetch popular films' });
  }
});

/**
 * Schema for film rating data
 */
const filmRatingSchema = z.object({
  filmId: z.number(),
  status: z.enum(['not_seen', 'not_interested', 'loved', 'liked', 'meh', 'hated']),
  rating: z.number().optional(),
});

/**
 * Save user ratings from onboarding
 * Accepts an array of film ratings and saves them to the user's watchlist
 */
router.post('/save-ratings', async (req: Request, res: Response) => {
  try {
    const { ratings } = req.body;
    
    // Validate ratings array
    if (!Array.isArray(ratings)) {
      return res.status(400).json({ message: 'Ratings must be an array' });
    }
    
    // Parse and validate each rating
    const validatedRatings = [];
    for (const rating of ratings) {
      try {
        const validRating = filmRatingSchema.parse(rating);
        validatedRatings.push(validRating);
      } catch (error) {
        console.warn('Invalid rating format:', rating, error);
        // Skip invalid ratings
      }
    }
    
    if (validatedRatings.length === 0) {
      return res.status(400).json({ message: 'No valid ratings provided' });
    }
    
    // Process each validated rating
    const userId = req.user!.id;
    const results = [];
    
    for (const rating of validatedRatings) {
      try {
        // Check if film exists
        const film = await storage.getFilmById(rating.filmId);
        if (!film) {
          console.warn(`Film with ID ${rating.filmId} not found, skipping`);
          continue;
        }
        
        // Get existing watchlist item if any
        const existingItem = await storage.getWatchlistItemByFilmId(userId, rating.filmId);
        
        // Add to watchlist with appropriate status
        let isWatched = false;
        switch (rating.status) {
          case 'loved':
          case 'liked':
          case 'meh':
          case 'hated':
            isWatched = true;
            break;
          default:
            isWatched = false;
        }
        
        let result;
        if (existingItem) {
          // Update existing item
          result = await storage.updateWatchlistItem(existingItem.id, {
            watched: isWatched,
            userRating: rating.rating,
          });
        } else {
          // Create new watchlist item
          result = await storage.addToWatchlist({
            userId,
            filmId: rating.filmId,
            filmTitle: film.title,
            filmGenres: film.genres,
            watched: isWatched,
            userRating: rating.rating,
            dateAdded: new Date(),
            filmType: film.type,
          });
        }
        
        results.push(result);
      } catch (error) {
        console.error('Error processing rating:', rating, error);
        // Continue with other ratings even if one fails
      }
    }
    
    // Track onboarding completion event for analytics
    await storage.trackEvent({
      userId,
      eventType: 'onboarding_ratings_saved',
      data: {
        count: [results.length],
        date: [new Date().toISOString()]
      },
      timestamp: new Date(),
    });
    
    res.json({
      message: 'Ratings saved successfully',
      count: results.length,
    });
  } catch (error) {
    console.error('Error saving ratings:', error);
    res.status(500).json({ message: 'Failed to save ratings' });
  }
});

/**
 * Track onboarding progress for analytics
 */
router.post('/track-progress', async (req: Request, res: Response) => {
  try {
    const { step } = req.body;
    
    if (!step || typeof step !== 'string') {
      return res.status(400).json({ message: 'Valid step is required' });
    }
    
    // Track the step in analytics
    await storage.trackEvent({
      userId: req.user!.id,
      eventType: 'onboarding_progress',
      data: {
        step: [step],
        date: [new Date().toISOString()]
      },
      timestamp: new Date(),
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking onboarding progress:', error);
    res.status(500).json({ message: 'Failed to track progress' });
  }
});

/**
 * Mark onboarding as complete
 * This endpoint is called when a user completes the onboarding process
 */
router.post('/complete', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Update user to mark onboarding as complete
    const updatedUser = await storage.updateOnboardingStatus(userId, false);
    
    // Track completion in analytics
    await storage.trackEvent({
      userId,
      eventType: 'onboarding_completed',
      data: {
        date: [new Date().toISOString()]
      },
      timestamp: new Date(),
    });
    
    res.json({ 
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ message: 'Failed to complete onboarding' });
  }
});

/**
 * For testing: Reset onboarding status
 * This endpoint allows testing the onboarding flow with existing users
 * It's for development purposes only and should be removed in production
 */
router.post('/reset-status', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'This endpoint is not available in production' });
    }
    
    const userId = req.user!.id;
    
    // Update user to reset onboarding status
    const updatedUser = await storage.updateOnboardingStatus(userId, true);
    
    res.json({ 
      success: true,
      message: 'Onboarding status reset for testing',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
    res.status(500).json({ message: 'Failed to reset onboarding status' });
  }
});

export default router;