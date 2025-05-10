import express, { Request, Response, NextFunction } from 'express';
import { createFirebaseToken, testFirestoreConnection } from '../firebase-admin';

// Function to check if user is authenticated, return 401 otherwise
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "You must be logged in to access this resource" });
};

const router = express.Router();

/**
 * Get a test token for the current user
 */
router.get('/token-test', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Create a token
    const token = await createFirebaseToken(userId);
    
    if (!token) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create Firebase token'
      });
    }
    
    // Send detailed token information for debugging
    res.json({
      success: true,
      uid: userId,
      token,
      tokenLength: token.length,
      tokenType: 'Firebase Custom Auth Token',
      instructions: 'Use this token with firebase.auth().signInWithCustomToken(token)',
    });
  } catch (error) {
    console.error('Error generating test token:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Test Firestore connectivity from the server
 */
router.get('/firestore-status', isAuthenticated, async (req, res) => {
  try {
    const result = await testFirestoreConnection();
    res.json(result);
  } catch (error) {
    console.error('Error testing Firestore connection:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;