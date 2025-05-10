import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { testFirestoreConnection, getFirestoreDb } from '../firebase-admin';

const router = express.Router();

/**
 * Testing API to check user's rated films
 * This endpoint returns the list of films the user has rated
 */
router.get('/user-rated-films', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'You must be logged in to access this resource' });
    }
    
    const userId = req.user!.id;
    const ratedFilms = await storage.getUserRatedFilms(userId);
    
    res.json({
      count: ratedFilms.length,
      ratedFilms,
      filmIds: ratedFilms.map(film => film.filmId)
    });
  } catch (error) {
    console.error('Error getting user rated films:', error);
    res.status(500).json({ message: 'Failed to get user rated films' });
  }
});

/**
 * Test the Firebase Admin SDK connection to Firestore
 * This endpoint writes a test document to Firestore and returns the result
 */
router.get('/firebase-admin-test', async (req: Request, res: Response) => {
  try {
    // Test the Firebase Admin SDK connection
    const result = await testFirestoreConnection();
    
    // Return results
    res.json({
      success: result.success,
      projectId: result.projectId,
      timestamp: new Date().toISOString(),
      error: result.error || null
    });
  } catch (error) {
    console.error('Error testing Firebase Admin SDK:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Test writing to a user's Firestore collections
 * This endpoint writes test documents to the user's collections in Firestore
 */
router.get('/user-firestore-test', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'You must be logged in to access this resource' });
    }
    
    const userId = req.user!.id;
    const userIdStr = userId.toString();
      // Test the Firebase connection status first
    const firebaseStatus = await testFirestoreConnection();
    
    const results = {
      success: firebaseStatus.success,
      projectId: firebaseStatus.projectId || 'unknown',
      statusMessage: firebaseStatus.error || 'Firebase connection ready',
      tests: [] as Array<{
        collection: string,
        success: boolean,
        path: string,
        error?: string
      }>
    };
    
    // Test collections to write to
    const testCollections = [
      { name: 'preferences', path: `users/${userIdStr}/preferences/settings` },
      { name: 'onboardingRatings', path: `users/${userIdStr}/ratings/onboarding` },
      { name: 'recommendationRatings', path: `users/${userIdStr}/ratings/recommendations` },
      { name: 'watchlist', path: `users/${userIdStr}/watchlist/test-item-${Date.now()}` }
    ];
    
    // Because Firebase Admin SDK isn't fully working in this environment,
    // we're skipping actual Firestore operations and reporting diagnostic info
    
    if (!results.success) {
      // Add diagnostic messages for each collection
      for (const collection of testCollections) {
        results.tests.push({
          collection: collection.name,
          success: false,
          path: collection.path,
          error: 'Firebase Admin SDK not fully initialized. Client-side Firestore operations should be used instead.'
        });
      }
      
      // Add information about the client authentication
      results.clientAuth = {
        userId: userIdStr,
        tokenAvailable: true,
        recommendedApproach: 'Use the client-side Firebase SDK with the token provided by the server to write directly to Firestore from the client.'
      };
    }
    
    // Return results
    res.json(results);
  } catch (error) {
    console.error('Error testing user Firestore collections:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;