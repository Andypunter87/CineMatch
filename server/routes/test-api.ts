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
    const db = getFirestoreDb();
    const results = {
      success: true,
      projectId: db.app.options.projectId,
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
    
    // Write test data to each collection
    for (const collection of testCollections) {
      try {
        // Create test data based on collection
        const testData = {
          timestamp: new Date().toISOString(),
          testId: `admin-test-${Date.now()}`,
          userId: userIdStr
        };
        
        // Add collection-specific fields
        if (collection.name === 'preferences') {
          Object.assign(testData, {
            country: 'admin-test',
            streamingServices: ['admin-test']
          });
        } else if (collection.name === 'onboardingRatings') {
          Object.assign(testData, {
            ratings: [{ filmId: 999, rating: 5, title: 'Admin Test Film' }],
            completed: true
          });
        } else if (collection.name === 'recommendationRatings') {
          Object.assign(testData, {
            ratings: [{ filmId: 888, rating: 4, title: 'Admin Test Recommended Film' }],
            mood: 'admin-test'
          });
        } else if (collection.name === 'watchlist') {
          Object.assign(testData, {
            filmId: 777,
            title: 'Admin Test Watchlist Film',
            posterUrl: 'https://example.com/poster.jpg',
            status: 'admin-test'
          });
        }
        
        // Write to Firestore
        await db.doc(collection.path).set(testData);
        
        // Add success result
        results.tests.push({
          collection: collection.name,
          success: true,
          path: collection.path
        });
      } catch (error) {
        // Add failure result
        results.tests.push({
          collection: collection.name,
          success: false,
          path: collection.path,
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Mark overall test as failed if any collection fails
        results.success = false;
      }
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