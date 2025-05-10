import { Router } from 'express';
import { getFirestoreDb, testFirestoreConnection, createFirebaseToken } from '../firebase-admin';

const router = Router();

/**
 * This file contains endpoints for testing Firebase functionality
 * without requiring authentication.
 * 
 * WARNING: These endpoints should only be used during development
 * and debugging, and should be disabled in production.
 */

// Test Firebase Token Generation
router.get('/token-test', async (req, res) => {
  try {
    // Generate a test token with a dummy user ID
    const testToken = await createFirebaseToken('test-user-123');
    
    if (!testToken) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create Firebase token'
      });
    }
    
    res.json({
      success: true,
      token: testToken,
      preview: `${testToken.substring(0, 20)}...${testToken.substring(testToken.length - 20)}`
    });
  } catch (error) {
    console.error('Error generating test token:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    });
  }
});

// Test Firestore Connection
router.get('/firestore-test', async (req, res) => {
  try {
    // Test the Firestore connection
    const result = await testFirestoreConnection();
    
    res.json({
      success: result.success,
      message: result.message,
      details: result.details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing Firestore connection:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    });
  }
});

// Test Firestore Access to a specific collection
router.get('/firestore-collection/:collection', async (req, res) => {
  const collection = req.params.collection;
  
  try {
    const db = getFirestoreDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Firestore database not initialized'
      });
    }
    
    // Attempt to get all documents in the collection
    const snapshot = await db.collection(collection).get();
    
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      message: `Found ${documents.length} documents in '${collection}' collection`,
      documents: documents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error accessing Firestore collection '${collection}':`, error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    });
  }
});

// Test Firestore Access to a specific document
router.get('/firestore-document/:collection/:document', async (req, res) => {
  const { collection, document } = req.params;
  
  try {
    const db = getFirestoreDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Firestore database not initialized'
      });
    }
    
    // Attempt to get the document
    const docRef = db.collection(collection).doc(document);
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      return res.status(404).json({
        success: false,
        message: `Document '${document}' not found in collection '${collection}'`
      });
    }
    
    res.json({
      success: true,
      message: `Successfully retrieved document '${document}' from collection '${collection}'`,
      document: {
        id: snapshot.id,
        ...snapshot.data()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error accessing Firestore document '${collection}/${document}':`, error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    });
  }
});

export default router;