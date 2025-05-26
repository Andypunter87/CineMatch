import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { RecommendationRequest, recommendationRequestSchema, watchlist, Film } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { initializeDatabase } from "./db";
import adminRoutes from "./admin";
import onboardingRoutes from "./routes/onboarding";
import imageProxyRoutes from "./routes/image-proxy";
import testApiRoutes from "./routes/test-api";
import firebaseTestRoutes from "./routes/firebase-test";
import publicFirebaseTestRoutes from "./routes/public-firebase-test";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { sendFriendInvitationEmail, sendFriendRequestAcceptedEmails } from "./services/email";
import { safelyParseRecommendations } from "./services/recommendation-helper";

const scryptAsync = promisify(scrypt);

// Function to check if user is authenticated, return 401 otherwise
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "You must be logged in to access this resource" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize the database
  await initializeDatabase();
  
  // Setup authentication routes and middleware
  setupAuth(app);
  
  // Register admin routes
  app.use('/api/admin', adminRoutes);
  
  // Register onboarding routes
  app.use('/api/onboarding', onboardingRoutes);
  
  // Register image proxy routes
  app.use('/api/image', imageProxyRoutes);
  console.log('Image proxy routes registered at /api/image');
  
  // Register test API routes
  app.use('/api/test', testApiRoutes);
  
  // Register Firebase/Firestore test routes
  app.use('/api/firebase', firebaseTestRoutes);
  
  // Register public Firebase test routes (no authentication required)
  app.use('/api/public-firebase', publicFirebaseTestRoutes);
  
  // Special endpoint specifically for "Show More Films" functionality
  app.post('/api/recommendations/more', async (req, res) => {
    try {
      console.log("Received request for more recommendations");
      
      // Validate the incoming request
      const preferences = recommendationRequestSchema.parse(req.body);
      
      // Get excluded film IDs or initialize an empty array
      const excludeFilmIds = preferences.excludeFilmIds || [];
      
      // Get batch size (default to 8 if not specified)
      const batchSize = preferences.requestedBatchSize || 8;
      
      console.log(`Requesting ${batchSize} more recommendations, excluding ${excludeFilmIds.length} films`);
      
      // Use our helper function that has special handling for additional recommendations
      // Import using ES modules syntax instead of require
      const additionalRecommendations = await storage.getRecommendations({
        ...preferences,
        excludeFilmIds: excludeFilmIds,
        requestedBatchSize: batchSize,
        _bypassStreamingFilter: true,  // Special flag to bypass streaming service filtering
        // Also disable other strict filters to get more diverse recommendations
        _disableRuntimeFilter: true,
        _disableMoodFilter: true
      });
      
      console.log(`Returning ${additionalRecommendations.length} additional recommendations`);
      
      // Return the recommendations
      res.json(additionalRecommendations);
    } catch (error) {
      console.error('Error getting more recommendations:', error);
      res.status(500).json({ message: 'Failed to get more recommendations' });
    }
  });
  
  // API endpoint for film recommendations
  app.post('/api/recommendations', async (req, res) => {
    try {
      // Extract user information if logged in
      const streamingServices = req.isAuthenticated() && req.user 
        ? req.user.streamingServices 
        : undefined;
        
      // Extract user country if logged in and not provided in request
      let country = req.body.country;
      if ((!country || country === '') && req.isAuthenticated() && req.user && req.user.country) {
        country = req.user.country;
      }
      
      // Check if user ratings were provided from Firestore
      let userRatings = req.body.userRatings || [];
      
      // Get user rated films if logged in
      let userRatedFilms: { filmId: number; title: string; genres: string[]; rating: number; filmType: string }[] = [];
      let ratedFilmIds: number[] = []; // Array to collect film IDs that should not be recommended again
      if (req.isAuthenticated() && req.user) {
        try {
          // Get the user's own rated films
          userRatedFilms = await storage.getUserRatedFilms(req.user.id);
          
          // Add all rated film IDs to exclusion list to prevent recommending films the user has already seen
          if (userRatedFilms && userRatedFilms.length > 0) {
            console.log(`Found ${userRatedFilms.length} rated films from user to exclude from recommendations`);
            ratedFilmIds = userRatedFilms.map(film => film.filmId);
            
            // Log the first few film IDs being excluded for debugging
            const filmSample = userRatedFilms.slice(0, 5).map(film => `${film.title} (ID: ${film.filmId})`);
            console.log(`Sample of excluded films: ${filmSample.join(', ')}`);
          }
          
          // If this is a group viewing (with friends), include friends' rated films too
          if (req.body.audience === "friends" && req.body.viewingParty && Array.isArray(req.body.viewingParty) && req.body.viewingParty.length > 0) {
            console.log(`Including preferences from ${req.body.viewingParty.length} friends in the viewing party`);
            
            // For each friend in the viewing party, get their rated films
            for (const friendId of req.body.viewingParty) {
              if (typeof friendId === 'number' && friendId > 0) {
                try {
                  const friendRatings = await storage.getUserRatedFilms(friendId);
                  if (friendRatings && friendRatings.length > 0) {
                    console.log(`Adding ${friendRatings.length} rated films from friend ID ${friendId}`);
                    userRatedFilms = [...userRatedFilms, ...friendRatings];
                    
                    // Also add friend's rated film IDs to exclusion list
                    ratedFilmIds = [...ratedFilmIds, ...friendRatings.map(film => film.filmId)];
                  }
                } catch (error) {
                  console.error(`Error getting rated films for friend ID ${friendId}:`, error);
                  // Continue with other friends if one fails
                }
              }
            }
            
            console.log(`Total group preferences: ${userRatedFilms.length} rated films`);
            console.log(`Total films to exclude from recommendations: ${ratedFilmIds.length}`);
          }
        } catch (error) {
          console.error("Error getting user rated films:", error);
          // Continue without user ratings if there's an error
        }
      }
      
      // Extract requestedBatchSize if present
      const requestedBatchSize = req.body.requestedBatchSize;
      
      // Validate input
      const preferences = recommendationRequestSchema.parse({
        ...req.body,
        streamingServices,
        country,
        userRatedFilms, // Add user rated films to the preferences
        requestedBatchSize, // Pass through the requested batch size
        // Add the film IDs to exclude - combine any existing excludeFilmIds with rated film IDs
        excludeFilmIds: [...(req.body.excludeFilmIds || []), ...ratedFilmIds]
      });
      
      // Check if this is a request for more recommendations (has requestedBatchSize)
      const isMoreRequest = !!preferences.requestedBatchSize;
      console.log(`Recommendation request with batch size: ${preferences.requestedBatchSize || "default"}`);
      
      // Get recommendations based on user preferences
      // Add userId to preferences for Firestore feedback integration
      if (req.isAuthenticated() && req.user) {
        preferences.userId = req.user.id;
      }
      
      let recommendations = await storage.getRecommendations(preferences);
      let originalRecommendations = [...recommendations]; // Store original recommendations
      
      // Minimum number of recommendations we want to display
      const MIN_RECOMMENDATIONS = 5;
      
      // If we don't have enough recommendations initially, skip the filtering
      if (recommendations.length < MIN_RECOMMENDATIONS) {
        console.log(`Not enough initial recommendations (${recommendations.length}). Skipping similarity filtering.`);
      }
      // Check for previous recommendations with similar preferences to avoid repetition
      else if (req.isAuthenticated() && req.user) {
        try {
          // Get the user's last recommendations
          const lastRecommendations = await storage.getUserLastRecommendations(req.user.id);
          
          if (lastRecommendations) {
            // Check if the preferences are similar (same mood, audience, location, etc.)
            const lastPrefs = lastRecommendations.preferences;
            const similarPreferences = 
              lastPrefs.mood === preferences.mood && 
              lastPrefs.audience === preferences.audience && 
              lastPrefs.location === preferences.location &&
              JSON.stringify(lastPrefs.timeOfDay) === JSON.stringify(preferences.timeOfDay);
            
            if (similarPreferences) {
              console.log("Similar preferences detected, ensuring variety in recommendations");
              
              // Parse the previous recommendations
              const prevRecommendations = safelyParseRecommendations(lastRecommendations.recommendations);
              const prevFilmIds = new Set(prevRecommendations.map(film => film.id));
              
              // Limit to at most one film from previous recommendations
              let sharedCount = 0;
              recommendations = recommendations.filter(film => {
                // If this film was in previous recommendations
                if (prevFilmIds.has(film.id)) {
                  // Allow only one previous film to remain
                  if (sharedCount === 0) {
                    sharedCount++;
                    return true;
                  }
                  return false;
                }
                return true;
              });
              
              // If we've filtered out too many films, restore original recommendations
              if (recommendations.length < MIN_RECOMMENDATIONS) {
                console.log(`Only ${recommendations.length} recommendations after filtering, restoring original set`);
                
                // If we have enough original recommendations, use those
                if (originalRecommendations.length >= MIN_RECOMMENDATIONS) {
                  recommendations = originalRecommendations;
                } 
                // Otherwise, get additional recommendations
                else {
                  console.log(`Not enough original recommendations either, getting more`);
                  const moreRecommendations = await storage.getRecommendations({
                    ...preferences,
                    excludeFilmIds: [...(preferences.excludeFilmIds || []), ...Array.from(prevFilmIds)],
                    _bypassStreamingFilter: true,
                    _disableMoodFilter: true,
                    _disableRuntimeFilter: true
                  });
                  
                  // Add new recommendations until we have enough
                  for (const film of moreRecommendations) {
                    if (!prevFilmIds.has(film.id) && !recommendations.some(r => r.id === film.id)) {
                      recommendations.push(film);
                      if (recommendations.length >= MIN_RECOMMENDATIONS) break;
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error comparing with previous recommendations:", error);
          // Continue with original recommendations if there's an error
        }
        
        // Save these recommendations to history
        await storage.saveUserRecommendations(req.user.id, preferences, recommendations);
      }
      
      res.json(recommendations);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('ZodError:', error.errors);
        res.status(400).json({ 
          message: 'Invalid request data', 
          errors: error.errors 
        });
      } else {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ message: 'Failed to get recommendations' });
      }
    }
  });
  
  // Alternative GET route for recommendations with query parameters
  app.get('/api/recommendations', async (req, res) => {
    try {
      // Extract query parameters - handle timeOfDay as array
      const { location, mood } = req.query;
      let timeOfDay = req.query.timeOfDay;
      let country = req.query.country as string | undefined;
      
      // Convert timeOfDay to array if it's a string
      if (typeof timeOfDay === 'string') {
        timeOfDay = [timeOfDay];
      }
      
      // Extract user information if logged in
      const streamingServices = req.isAuthenticated() && req.user 
        ? req.user.streamingServices 
        : undefined;
        
      // Use user's country if not provided and user is logged in
      if ((!country || country === '') && req.isAuthenticated() && req.user && req.user.country) {
        country = req.user.country;
      }
      
      // Get user rated films if logged in
      let userRatedFilms: { filmId: number; title: string; genres: string[]; rating: number; filmType: string }[] = [];
      let ratedFilmIds: number[] = []; // Array to collect film IDs that should not be recommended again
      if (req.isAuthenticated() && req.user) {
        try {
          // Get the user's own rated films
          userRatedFilms = await storage.getUserRatedFilms(req.user.id);
          
          // Add all rated film IDs to exclusion list to prevent recommending films the user has already seen
          if (userRatedFilms && userRatedFilms.length > 0) {
            console.log(`Found ${userRatedFilms.length} rated films from user to exclude from recommendations (GET route)`);
            ratedFilmIds = userRatedFilms.map(film => film.filmId);
            
            // Log the first few film IDs being excluded for debugging
            const filmSample = userRatedFilms.slice(0, 5).map(film => `${film.title} (ID: ${film.filmId})`);
            console.log(`Sample of excluded films (GET route): ${filmSample.join(', ')}`);
          }
          
          // If this is a group viewing (with friends), include friends' rated films too
          const audience = req.query.audience as string;
          const viewingParty = req.query.viewingParty 
            ? Array.isArray(req.query.viewingParty) 
                ? req.query.viewingParty.map(id => parseInt(id as string)).filter(id => !isNaN(id))
                : [parseInt(req.query.viewingParty as string)].filter(id => !isNaN(id))
            : [];
            
          if (audience === "friends" && viewingParty.length > 0) {
            console.log(`Including preferences from ${viewingParty.length} friends in the viewing party (GET route)`);
            
            // For each friend in the viewing party, get their rated films
            for (const friendId of viewingParty) {
              try {
                const friendRatings = await storage.getUserRatedFilms(friendId);
                if (friendRatings && friendRatings.length > 0) {
                  console.log(`Adding ${friendRatings.length} rated films from friend ID ${friendId}`);
                  userRatedFilms = [...userRatedFilms, ...friendRatings];
                  
                  // Also add friend's rated film IDs to exclusion list
                  ratedFilmIds = [...ratedFilmIds, ...friendRatings.map(film => film.filmId)];
                }
              } catch (error) {
                console.error(`Error getting rated films for friend ID ${friendId}:`, error);
                // Continue with other friends if one fails
              }
            }
            
            console.log(`Total group preferences: ${userRatedFilms.length} rated films`);
            console.log(`Total films to exclude from recommendations: ${ratedFilmIds.length} (GET route)`);
          }
        } catch (error) {
          console.error("Error getting user rated films:", error);
          // Continue without user ratings if there's an error
        }
      }
      
      // Validate input
      const preferences = recommendationRequestSchema.parse({
        location,
        timeOfDay, 
        mood,
        streamingServices,
        country,
        userRatedFilms,
        // Add the film IDs to exclude - combine any existing excludeFilmIds with rated film IDs
        excludeFilmIds: [...(req.query.excludeFilmIds ? 
          (Array.isArray(req.query.excludeFilmIds) ? 
            req.query.excludeFilmIds.map(id => parseInt(id as string)).filter(id => !isNaN(id)) : 
            [parseInt(req.query.excludeFilmIds as string)].filter(id => !isNaN(id))) : 
          []), ...ratedFilmIds]
      });
      
      // Get recommendations
      let recommendations = await storage.getRecommendations(preferences);
      let originalRecommendations = [...recommendations]; // Store original recommendations
      
      // Minimum number of recommendations we want to display
      const MIN_RECOMMENDATIONS = 5;
      
      // If we don't have enough recommendations initially, skip the filtering
      if (recommendations.length < MIN_RECOMMENDATIONS) {
        console.log(`Not enough initial recommendations (${recommendations.length}). Skipping similarity filtering.`);
      }
      // Check for previous recommendations with similar preferences to avoid repetition
      else if (req.isAuthenticated() && req.user) {
        try {
          // Get the user's last recommendations
          const lastRecommendations = await storage.getUserLastRecommendations(req.user.id);
          
          if (lastRecommendations) {
            // Check if the preferences are similar (same mood, audience, location, etc.)
            const lastPrefs = lastRecommendations.preferences;
            const similarPreferences = 
              lastPrefs.mood === preferences.mood && 
              lastPrefs.audience === preferences.audience && 
              lastPrefs.location === preferences.location &&
              JSON.stringify(lastPrefs.timeOfDay) === JSON.stringify(preferences.timeOfDay);
            
            if (similarPreferences) {
              console.log("Similar preferences detected, ensuring variety in recommendations");
              
              // Parse the previous recommendations
              const prevRecommendations = safelyParseRecommendations(lastRecommendations.recommendations);
              const prevFilmIds = new Set(prevRecommendations.map(film => film.id));
              
              // Limit to at most one film from previous recommendations
              let sharedCount = 0;
              recommendations = recommendations.filter(film => {
                // If this film was in previous recommendations
                if (prevFilmIds.has(film.id)) {
                  // Allow only one previous film to remain
                  if (sharedCount === 0) {
                    sharedCount++;
                    return true;
                  }
                  return false;
                }
                return true;
              });
              
              // If we've filtered out too many films, restore original recommendations
              if (recommendations.length < MIN_RECOMMENDATIONS) {
                console.log(`Only ${recommendations.length} recommendations after filtering, restoring original set`);
                
                // If we have enough original recommendations, use those
                if (originalRecommendations.length >= MIN_RECOMMENDATIONS) {
                  recommendations = originalRecommendations;
                } 
                // Otherwise, get additional recommendations
                else {
                  console.log(`Not enough original recommendations either, getting more`);
                  const moreRecommendations = await storage.getRecommendations({
                    ...preferences,
                    excludeFilmIds: [...(preferences.excludeFilmIds || []), ...Array.from(prevFilmIds)],
                    _bypassStreamingFilter: true,
                    _disableMoodFilter: true,
                    _disableRuntimeFilter: true
                  });
                  
                  // Add new recommendations until we have enough
                  for (const film of moreRecommendations) {
                    if (!prevFilmIds.has(film.id) && !recommendations.some(r => r.id === film.id)) {
                      recommendations.push(film);
                      if (recommendations.length >= MIN_RECOMMENDATIONS) break;
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error comparing with previous recommendations:", error);
          // Continue with original recommendations if there's an error
        }
        
        // Save these recommendations to history
        await storage.saveUserRecommendations(req.user.id, preferences, recommendations);
      }
      
      // Track recommendation request
      const userId = req.isAuthenticated() && req.user ? req.user.id : undefined;
      storage.trackEvent({
        eventType: 'recommendation_request',
        userId,
        data: {
          location: preferences.location,
          mood: preferences.mood,
          timeOfDay: preferences.timeOfDay,
          hasStreamingServices: !!preferences.streamingServices?.length,
          country: preferences.country || 'unknown',
          resultCount: recommendations.length
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      }).catch(err => console.error('Error tracking recommendation event:', err));
      
      res.json(recommendations);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('ZodError:', error.errors);
        res.status(400).json({ 
          message: 'Invalid request data', 
          errors: error.errors 
        });
      } else {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ message: 'Failed to get recommendations' });
      }
    }
  });

  // Enhanced recommendation endpoints using the new preference logic
  
  // Get user preference profile
  app.get('/api/enhanced/user-profile/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify user can access this profile (only their own or admin)
      if (req.user!.id.toString() !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Import the recommendation functions dynamically
      const { getUserPreferenceProfile } = await import('../lib/recommendation.js');
      
      const profile = await getUserPreferenceProfile(userId);
      
      res.json({
        userId,
        profile,
        movieCount: Object.keys(profile).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting user preference profile:', error);
      res.status(500).json({ message: 'Failed to get preference profile' });
    }
  });

  // Get blended session profile for two users
  app.get('/api/enhanced/session-profile/:userIdA/:userIdB', isAuthenticated, async (req, res) => {
    try {
      const { userIdA, userIdB } = req.params;
      
      // Verify user can access these profiles (must be one of the users or admin)
      const currentUserId = req.user!.id.toString();
      if (currentUserId !== userIdA && currentUserId !== userIdB && !req.user!.isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Import the recommendation functions dynamically
      const { getBlendedSessionProfile } = await import('../lib/recommendation.js');
      
      const blendedProfile = await getBlendedSessionProfile(userIdA, userIdB);
      
      res.json({
        userIdA,
        userIdB,
        blendedProfile,
        movieCount: Object.keys(blendedProfile).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting blended session profile:', error);
      res.status(500).json({ message: 'Failed to get blended session profile' });
    }
  });

  // Get top recommendations from a user's profile
  app.get('/api/enhanced/top-recommendations/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Verify user can access this profile
      if (req.user!.id.toString() !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Import the recommendation functions dynamically
      const { getUserPreferenceProfile, getTopRecommendations } = await import('../lib/recommendation.js');
      
      const profile = await getUserPreferenceProfile(userId);
      const topMovieIds = getTopRecommendations(profile, limit);
      
      // Get film details for the top recommendations
      const filmDetails = await Promise.all(
        topMovieIds.map(async (movieId) => {
          try {
            const film = await storage.getFilmById(parseInt(movieId));
            return film ? { 
              ...film, 
              preferenceScore: profile[movieId] 
            } : null;
          } catch (error) {
            console.error(`Error getting film ${movieId}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null results
      const validFilms = filmDetails.filter(film => film !== null);
      
      res.json({
        userId,
        recommendations: validFilms,
        totalMoviesInProfile: Object.keys(profile).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting top recommendations:', error);
      res.status(500).json({ message: 'Failed to get top recommendations' });
    }
  });

  // Cache a user's preference profile
  app.post('/api/enhanced/cache-profile/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify user can cache this profile
      if (req.user!.id.toString() !== userId && !req.user!.isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Import the recommendation functions dynamically
      const { getUserPreferenceProfile, cachePreferenceProfile } = await import('../lib/recommendation.js');
      
      const profile = await getUserPreferenceProfile(userId);
      const success = await cachePreferenceProfile(userId, profile);
      
      if (success) {
        res.json({
          message: 'Profile cached successfully',
          userId,
          movieCount: Object.keys(profile).length,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ message: 'Failed to cache profile' });
      }
    } catch (error) {
      console.error('Error caching preference profile:', error);
      res.status(500).json({ message: 'Failed to cache preference profile' });
    }
  });

  // Handle user feedback on recommendations (for "Because you liked X" feature)
  app.post('/api/feedback', isAuthenticated, async (req, res) => {
    try {
      const { filmId, filmTitle, feedback, recommendationContext } = req.body;
      const userId = req.user!.id;
      
      console.log(`Saving feedback for user ${userId}: film ${filmId} (${filmTitle}) - ${feedback}`);
      
      // Import Firebase admin to save to Firestore
      const { getFirestoreDb } = await import('./firebase-admin.js');
      const db = getFirestoreDb();
      
      if (!db) {
        console.error('Firestore not available for saving feedback');
        return res.status(500).json({ message: 'Database not available' });
      }
      
      // Save to Firestore recommendationFeedback collection
      const feedbackPath = `users/${userId}/recommendationFeedback/${filmId}`;
      const feedbackData = {
        liked: feedback === 'like',
        timestamp: new Date().toISOString(),
        filmTitle: filmTitle || 'Unknown',
        recommendationContext: recommendationContext || null
      };
      
      await db.doc(feedbackPath).set(feedbackData, { merge: true });
      
      console.log(`Successfully saved feedback to Firestore: ${feedbackPath}`);
      
      // Track the feedback event
      storage.trackEvent({
        eventType: 'recommendation_feedback',
        userId,
        data: {
          filmId,
          filmTitle,
          feedback,
          hasRecommendationContext: !!recommendationContext
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      }).catch(err => console.error('Error tracking feedback event:', err));
      
      res.json({ 
        success: true, 
        message: 'Feedback saved successfully',
        feedbackSaved: true
      });
      
    } catch (error) {
      console.error('Error saving feedback:', error);
      res.status(500).json({ message: 'Failed to save feedback' });
    }
  });

  // Get list of available streaming services 
  app.get('/api/streaming-services', (req, res) => {
    // List of popular streaming services
    const streamingServices = [
      "Netflix", 
      "Amazon Prime", 
      "Hulu", 
      "Disney+", 
      "HBO Max", 
      "Apple TV+", 
      "Peacock", 
      "Paramount+", 
      "Crunchyroll",
      "Mubi",
      "Criterion Channel",
      "BBC iPlayer",
      "ITVX",
      "Channel 4"
    ];
    
    res.json(streamingServices);
  });

  // API routes for user profile management
  // Update user streaming services
  app.put('/api/user/streaming', isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        streamingServices: z.array(z.string())
      });
      
      const { streamingServices } = schema.parse(req.body);
      const userId = req.user!.id;
      
      const updatedUser = await storage.updateUserStreamingServices(userId, streamingServices);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error updating streaming services:', error);
        res.status(500).json({ message: 'Failed to update streaming services' });
      }
    }
  });

  // Update user country
  app.put('/api/user/country', isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        country: z.string().min(1, 'Country is required')
      });
      
      const { country } = schema.parse(req.body);
      const userId = req.user!.id;
      
      const updatedUser = await storage.updateUserCountry(userId, country);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error updating country:', error);
        res.status(500).json({ message: 'Failed to update country' });
      }
    }
  });

  // Change user password
  app.put('/api/user/password', isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(6, 'New password must be at least 6 characters')
      });
      
      const { currentPassword, newPassword } = schema.parse(req.body);
      const userId = req.user!.id;
      
      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify user has a password
      if (!user.password) {
        return res.status(400).json({ message: 'User has no password set' });
      }
      
      // Compare passwords
      const parts = user.password.split('.');
      if (parts.length !== 2) {
        return res.status(400).json({ message: 'Password format is invalid' });
      }
      
      const [hashedPassword, salt] = parts;
      const hashedInputBuffer = (await scryptAsync(currentPassword, salt, 64)) as Buffer;
      const storedHashBuffer = Buffer.from(hashedPassword, 'hex');
      
      if (!timingSafeEqual(hashedInputBuffer, storedHashBuffer)) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const newSalt = randomBytes(16).toString('hex');
      const newHashedBuffer = (await scryptAsync(newPassword, newSalt, 64)) as Buffer;
      const newPasswordHash = `${newHashedBuffer.toString('hex')}.${newSalt}`;
      
      // Update the password
      const updatedUser = await storage.updateUserPassword(userId, newPasswordHash);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Failed to update password' });
      }
    }
  });
  
  // SEO Routes
  // Google site verification
  app.get('/googleq9bwQxn38m7f86Zoa3bZBVq6zEOBulsJO4QPJdpmCN4.html', (_req, res) => {
    res.type('text/html');
    res.send('google-site-verification: googleq9bwQxn38m7f86Zoa3bZBVq6zEOBulsJO4QPJdpmCN4.html');
  });
  
  // Serve robots.txt
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /

# Sitemap location
Sitemap: https://cine-match.replit.app/sitemap.xml`);
  });
  
  // Serve sitemap.xml
  app.get('/sitemap.xml', (_req, res) => {
    res.header('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cine-match.replit.app/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/auth</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/watchlist</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/profile</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/terms</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/privacy</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/admin</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`);
  });
  
  // Recommendation Feedback API route
  app.post('/api/feedback', async (req, res) => {
    try {
      const schema = z.object({
        filmId: z.number(),
        filmTitle: z.string(),
        feedback: z.enum(['like', 'dislike']),
        recommendationContext: z.any().optional()
      });
      
      const { filmId, filmTitle, feedback, recommendationContext } = schema.parse(req.body);
      
      // Get user ID if authenticated
      const userId = req.isAuthenticated() && req.user ? req.user.id : undefined;
      
      // Track feedback event in analytics
      await storage.trackEvent({
        eventType: feedback === 'like' ? 'recommendation_liked' : 'recommendation_disliked',
        userId,
        data: {
          filmId,
          filmTitle,
          feedback,
          recommendationContext: JSON.stringify(recommendationContext)
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      });
      
      res.status(200).json({ 
        success: true, 
        message: `Feedback recorded: ${feedback === 'like' ? 'positive' : 'negative'}`
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error recording feedback:', error);
        res.status(500).json({ message: 'Failed to record feedback' });
      }
    }
  });
  
  // Watchlist API Routes
  
  // Get user watchlist
  app.get('/api/watchlist', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const watchlistItems = await storage.getWatchlistItems(userId);
      res.json(watchlistItems);
    } catch (error) {
      console.error('Error retrieving watchlist:', error);
      res.status(500).json({ message: 'Failed to retrieve watchlist' });
    }
  });
  
  // Add a film to the watchlist
  app.post('/api/watchlist', isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        filmId: z.number(),
        filmTitle: z.string(),
        filmYear: z.number().optional(),
        filmDirector: z.string().optional(),
        filmType: z.string().optional(),
        filmGenres: z.array(z.string()).optional(),
        filmPosterUrl: z.string().optional(),
        recommendationContext: z.any().optional() // Context of the recommendation
      });
      
      const filmData = schema.parse(req.body);
      const userId = req.user!.id;
      
      const newWatchlistItem = await storage.addToWatchlist({
        userId,
        ...filmData
      });
      
      // Track watchlist add event
      storage.trackEvent({
        eventType: 'watchlist_add',
        userId,
        data: {
          filmId: filmData.filmId,
          filmTitle: filmData.filmTitle,
          filmYear: filmData.filmYear,
          filmGenres: filmData.filmGenres?.join(',') || ''
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      }).catch(err => console.error('Error tracking watchlist add event:', err));
      
      res.status(201).json(newWatchlistItem);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error adding to watchlist:', error);
        res.status(500).json({ message: 'Failed to add film to watchlist' });
      }
    }
  });
  
  // Update a watchlist item (mark as watched, rate, etc.)
  app.put('/api/watchlist/:id', isAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // First check if the item exists and belongs to the user
      const existingItem = await storage.getWatchlistItem(userId, itemId);
      if (!existingItem) {
        return res.status(404).json({ message: 'Watchlist item not found' });
      }
      
      const schema = z.object({
        watched: z.boolean().optional(),
        userRating: z.number().min(1).max(5).optional(),
        userNotes: z.string().optional()
      });
      
      const { watched, userRating, userNotes } = schema.parse(req.body);
      
      // Create update object with proper types
      const updates: Partial<typeof watchlist.$inferInsert> = {
        watched,
        userRating,
        userNotes
      };
      
      // If marking as watched, set the date to now
      if (watched) {
        updates.dateWatched = new Date();
      }
      
      const updatedItem = await storage.updateWatchlistItem(itemId, updates);
      
      // Track watched film if that's being updated
      if (watched) {
        storage.trackEvent({
          eventType: 'film_watched',
          userId,
          data: {
            filmId: existingItem.filmId,
            filmTitle: existingItem.filmTitle,
            userRating,
            hasNotes: !!userNotes
          } as Record<string, any>,
          ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
          userAgent: req.headers['user-agent'] as string || 'unknown'
        }).catch(err => console.error('Error tracking film watched event:', err));
      }
      
      // Track if rating was added
      if (userRating && (!existingItem.userRating || existingItem.userRating !== userRating)) {
        storage.trackEvent({
          eventType: 'film_rated',
          userId,
          data: {
            filmId: existingItem.filmId,
            filmTitle: existingItem.filmTitle,
            rating: userRating
          } as Record<string, any>,
          ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
          userAgent: req.headers['user-agent'] as string || 'unknown'
        }).catch(err => console.error('Error tracking film rating event:', err));
      }
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error updating watchlist item:', error);
        res.status(500).json({ message: 'Failed to update watchlist item' });
      }
    }
  });
  
  // Remove a film from the watchlist
  app.delete('/api/watchlist/:id', isAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // First check if the item exists and belongs to the user
      const existingItem = await storage.getWatchlistItem(userId, itemId);
      if (!existingItem) {
        return res.status(404).json({ message: 'Watchlist item not found' });
      }
      
      await storage.removeFromWatchlist(userId, itemId);
      
      // Track watchlist remove event
      storage.trackEvent({
        eventType: 'watchlist_remove',
        userId,
        data: {
          filmId: existingItem.filmId,
          filmTitle: existingItem.filmTitle,
          wasWatched: !!existingItem.watched
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      }).catch(err => console.error('Error tracking watchlist remove event:', err));
      
      res.status(204).end();
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      res.status(500).json({ message: 'Failed to remove film from watchlist' });
    }
  });

  // ============ FRIENDS API ROUTES ============

  // Get user's friends
  app.get('/api/friends', isAuthenticated, async (req, res) => {
    try {
      const friends = await storage.getFriends(req.user!.id);
      
      // Don't send password or other sensitive fields to client
      const safeUserData = friends.map(friend => ({
        id: friend.id,
        username: friend.username,
        name: friend.name,
        email: friend.email,
        streamingServices: friend.streamingServices,
        country: friend.country
      }));
      
      res.status(200).json(safeUserData);
    } catch (error) {
      console.error("Error getting friends:", error);
      res.status(500).json({ message: "Failed to retrieve friends" });
    }
  });

  // Create a new friend request
  app.post('/api/friend-requests', isAuthenticated, async (req, res) => {
    try {
      const { email, friendName } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Validate email format
      if (!email.includes('@') || !email.includes('.')) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      if (!friendName || friendName.trim() === '') {
        return res.status(400).json({ message: "Friend's name is required" });
      }
      
      // Check if the user is trying to invite themselves
      if (req.user!.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({ message: "You cannot invite yourself" });
      }
      
      // Check if the user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // If they are already friends, don't create duplicate
        const friends = await storage.getFriends(req.user!.id);
        const isAlreadyFriend = friends.some(friend => friend.id === existingUser.id);
        
        if (isAlreadyFriend) {
          return res.status(400).json({ message: "You are already friends with this user" });
        }
        
        // Even for existing users, we'll create a friend request first
        // This allows the other user to accept or reject the request
        // Generate a unique invite code
        const inviteCode = randomBytes(16).toString('hex');
        
        // Create the friend request
        const newRequest = await storage.createFriendRequest({
          userId: req.user!.id,
          email,
          friendName,
          inviteCode,
          status: 'pending'
        });
        
        // Send invitation email with the existing user template
        const senderName = req.user!.name || req.user!.username || 'A friend';
        const senderEmail = req.user!.email; // Get the sender's email for notification
        const emailSent = await sendFriendInvitationEmail(
          senderName,
          email,
          inviteCode,
          true, // This is an existing user
          senderEmail, // Pass sender email for confirmation notification
          friendName // Pass the recipient's name
        );
        
        // Track the event
        await storage.trackEvent({
          eventType: 'create_friend_request',
          userId: req.user!.id,
          data: { 
            requestId: newRequest.id,
            email,
            friendName,
            emailSent,
            existingUser: true
          } as Record<string, any>,
          timestamp: new Date()
        });
        
        return res.status(201).json({
          ...newRequest,
          emailSent,
          message: "Friend invitation sent",
          existingUser: true
        });
      }
      
      // Generate a unique invite code
      const inviteCode = randomBytes(16).toString('hex');
      
      // Create the friend request with the email and name
      const newRequest = await storage.createFriendRequest({
        userId: req.user!.id,
        email,
        friendName,
        inviteCode,
        status: 'pending'
      });
      
      // Send invitation email for new users
      const senderName = req.user!.name || req.user!.username || 'A friend';
      const senderEmail = req.user!.email; // Get the sender's email for notification
      const emailSent = await sendFriendInvitationEmail(
        senderName,
        email,
        inviteCode,
        false, // This is a new user
        senderEmail, // Pass sender email for confirmation notification
        friendName // Pass the recipient's name
      );
      
      // Track the event
      await storage.trackEvent({
        eventType: 'create_friend_request',
        userId: req.user!.id,
        data: { 
          requestId: newRequest.id,
          email,
          friendName,
          emailSent
        } as Record<string, any>,
        timestamp: new Date()
      });
      
      res.status(201).json({
        ...newRequest,
        emailSent
      });
    } catch (error) {
      console.error("Error creating friend request:", error);
      res.status(500).json({ message: "Failed to create friend request" });
    }
  });

  // Get friend requests created by the user
  app.get('/api/friend-requests', isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getFriendRequestsByUserId(req.user!.id);
      res.status(200).json(requests);
    } catch (error) {
      console.error("Error retrieving friend requests:", error);
      res.status(500).json({ message: "Failed to retrieve friend requests" });
    }
  });

  // Accept a friend request by invite code
  // Handle PATCH requests for friend requests (accept/reject)
  app.patch('/api/friend-requests/:requestId', isAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId, 10);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }
      
      const { status } = req.body;
      if (!status || !['accept', 'reject'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'accept' or 'reject'" });
      }
      
      // Update request status
      const updatedRequest = await storage.updateFriendRequestStatus(requestId, status);
      
      // If accepting, create friend connection
      if (status === 'accept') {
        // Add each other as friends
        if (updatedRequest.userId) {
          try {
            await storage.addFriend(req.user!.id, updatedRequest.userId);
            await storage.addFriend(updatedRequest.userId, req.user!.id);
            
            // Get user objects for both parties
            const requesterUser = await storage.getUser(updatedRequest.userId);
            const accepterUser = req.user;
            
            // Send email notifications if both users are found
            if (requesterUser && accepterUser) {
              await sendFriendRequestAcceptedEmails(requesterUser, accepterUser);
              
              // Create notification for the requester
              await storage.createNotification({
                userId: updatedRequest.userId,
                type: 'friend_request_accepted',
                message: `${accepterUser.name || accepterUser.username} accepted your friend request.`,
                relatedUserId: req.user!.id,
                read: false
              });
              
              // Track email sent event
              await storage.trackEvent({
                eventType: 'friend_accept_email_sent',
                userId: req.user!.id,
                data: { 
                  requestId: requestId,
                  friendId: updatedRequest.userId
                } as Record<string, any>,
                timestamp: new Date()
              });
            }
          } catch (error) {
            const friendError = error as Error;
            // If friendship already exists, just continue
            if (friendError.message !== "Friendship already exists") {
              throw friendError;
            }
          }
        }
      }
      
      res.status(200).json(updatedRequest);
    } catch (error) {
      console.error("Error updating friend request:", error);
      res.status(500).json({ message: "Failed to update friend request" });
    }
  });
  
  app.post('/api/friend-requests/accept', isAuthenticated, async (req, res) => {
    try {
      const { inviteCode } = req.body;
      
      if (!inviteCode) {
        return res.status(400).json({ message: "Invite code is required" });
      }
      
      // Find the friend request
      const request = await storage.getFriendRequestByInviteCode(inviteCode);
      
      if (!request) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Friend request is not pending" });
      }
      
      // Cannot accept your own friend request
      if (request.userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot accept your own friend request" });
      }
      
      // Update the request status - using 'accept' to be consistent with PATCH route
      const updatedRequest = await storage.updateFriendRequestStatus(request.id, 'accept');
      
      // Add each other as friends - making it bidirectional like in the other route
      try {
        await storage.addFriend(request.userId, req.user!.id);
        await storage.addFriend(req.user!.id, request.userId);
        
        // Get user objects for both parties
        const requesterUser = await storage.getUser(request.userId);
        const accepterUser = req.user;
        
        // Send email notifications if both users are found
        if (requesterUser && accepterUser) {
          await sendFriendRequestAcceptedEmails(requesterUser, accepterUser);
          
          // Create notification for the requester
          await storage.createNotification({
            userId: request.userId,
            type: 'friend_request_accepted',
            message: `${accepterUser.name || accepterUser.username} accepted your friend request.`,
            relatedUserId: req.user!.id,
            read: false
          });
          
          // Track email sent event
          await storage.trackEvent({
            eventType: 'friend_accept_email_sent',
            userId: req.user!.id,
            data: { 
              requestId: request.id,
              friendId: request.userId
            } as Record<string, any>,
            timestamp: new Date()
          });
        }
      } catch (error) {
        const friendError = error as Error;
        // If friendship already exists, just continue
        if (friendError.message !== "Friendship already exists") {
          throw friendError;
        }
      }
      
      // Track the event
      await storage.trackEvent({
        eventType: 'accept_friend_request',
        userId: req.user!.id,
        data: { 
          requestId: request.id, 
          friendId: request.userId 
        } as Record<string, any>,
        timestamp: new Date()
      });
      
      res.status(200).json({ 
        message: "Friend request accepted", 
        request: updatedRequest 
      });
    } catch (error) {
      console.error("Error accepting friend request:", error);
      res.status(500).json({ message: "Failed to accept friend request" });
    }
  });

  // Remove a friend
  app.delete('/api/friends/:friendId', isAuthenticated, async (req, res) => {
    try {
      const friendId = parseInt(req.params.friendId);
      
      if (isNaN(friendId)) {
        return res.status(400).json({ message: "Invalid friend ID" });
      }
      
      await storage.removeFriend(req.user!.id, friendId);
      
      // Track the event
      await storage.trackEvent({
        eventType: 'remove_friend',
        userId: req.user!.id,
        data: { 
          friendId: friendId 
        } as Record<string, any>,
        timestamp: new Date()
      });
      
      res.status(200).json({ message: "Friend removed successfully" });
    }
    catch (error) {
      console.error("Error removing friend:", error);
      res.status(500).json({ message: "Failed to remove friend" });
    }
  });

  // Notifications endpoints
  // Get notifications for the current user
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      res.status(200).json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // Mark a notification as read
  app.patch('/api/notifications/:notificationId', isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.notificationId, 10);
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      
      const notification = await storage.markNotificationAsRead(notificationId);
      res.status(200).json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/mark-all-read', isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user!.id);
      res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread-count', isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationsCount(req.user!.id);
      res.status(200).json({ count });
    } catch (error) {
      console.error("Error getting unread notification count:", error);
      res.status(500).json({ message: "Failed to get unread notification count" });
    }
  });

  // Get last recommendations for a user
  app.get('/api/recommendations/history', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const lastRecommendations = await storage.getUserLastRecommendations(userId);
      
      if (lastRecommendations) {
        // Return the recommendations history
        res.json(lastRecommendations);
      } else {
        // No recommendations history found
        res.status(404).json({ message: 'No recommendation history found' });
      }
    } catch (error) {
      console.error('Error getting last recommendations:', error);
      res.status(500).json({ message: 'Failed to get recommendation history' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
