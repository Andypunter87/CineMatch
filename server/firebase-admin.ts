/**
 * Firebase Admin SDK implementation for server-side Firebase operations
 * 
 * This module handles:
 * 1. Firebase Admin SDK initialization for server-side operations
 * 2. Firestore database access for server-side writes
 * 3. Custom token generation for client authentication
 */
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Global settings
let projectId = 'unknown';
let isFirebaseAdminInitialized = false;
let firebaseApp: App | null = null;
let firestoreDb: Firestore | null = null;

// Initialize the Firebase Admin SDK
try {
  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    const credStr = process.env.FIREBASE_ADMIN_CREDENTIALS;
    console.log(`Firebase Admin credentials string length: ${credStr.length}`);
    console.log(`First 20 chars: ${credStr.substring(0, 20)}...`);
    
    try {
      // Parse the service account credential string
      const serviceAccount = JSON.parse(credStr);
      
      if (serviceAccount && typeof serviceAccount === 'object' && serviceAccount.project_id) {
        projectId = serviceAccount.project_id;
        console.log(`Target Firebase project ID: ${projectId}`);
        
        // Initialize Firebase Admin with the modular SDK
        try {
          // Use modular initialization
          firebaseApp = initializeApp({
            credential: cert(serviceAccount),
            databaseURL: `https://${projectId}.firebaseio.com`
          });
          
          isFirebaseAdminInitialized = true;
          console.log('Firebase Admin SDK initialized successfully');
          
          // Get Firestore instance with modular API
          firestoreDb = getFirestore(firebaseApp);
          console.log('Firestore database initialized');
          
          // Run a simple test write to verify connectivity
          testWrite().then(result => {
            if (result.success) {
              console.log('Firestore test write successful');
            } else {
              console.error('Firestore test write failed:', result.error);
            }
          });
        } catch (initError) {
          console.error('Error initializing Firebase Admin:', initError);
        }
      } else {
        console.error('Invalid service account format, missing project_id');
      }
    } catch (parseError) {
      console.error('Error parsing Firebase Admin credentials:', parseError);
    }
  } else {
    console.warn('FIREBASE_ADMIN_CREDENTIALS not set');
  }
} catch (e) {
  console.error('Error setting up Firebase Admin:', e);
}

/**
 * Run a simple test write to Firestore to verify connectivity
 */
async function testWrite(): Promise<{ success: boolean, error?: string }> {
  if (!firestoreDb) {
    return { success: false, error: 'Firestore not initialized' };
  }
  
  try {
    const testRef = firestoreDb.collection('system').doc('test');
    
    // Using modular Firestore API
    const { FieldValue } = await import('firebase-admin/firestore');
    
    await testRef.set({
      timestamp: FieldValue.serverTimestamp(),
      environment: 'server',
      test: 'connectivity',
      server: 'replit'
    });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create a Firebase custom token for authentication
 * @param userId The user ID from our database
 * @returns A Firebase custom token
 */
export async function createFirebaseToken(userId: number | string): Promise<string | null> {
  try {
    // Convert userId to string if it's a number
    const uid = userId.toString();
    
    if (isFirebaseAdminInitialized && firebaseApp) {
      // Create a custom token using the Firebase Admin SDK
      const auth = getAuth(firebaseApp);
      const token = await auth.createCustomToken(uid);
      console.log(`Created Firebase custom token for user ${uid}`);
      return token;
    } else {
      // Fall back to simple token only if Firebase Admin isn't initialized
      console.warn('Firebase Admin not initialized, using fallback token system');
      return createSimpleToken(uid);
    }
  } catch (error) {
    console.error('Error in createFirebaseToken:', error);
    return null;
  }
}

/**
 * Test for writing to Firestore
 * @returns Success status and diagnostic information
 */
export async function testFirestoreConnection(): Promise<{ 
  success: boolean, 
  projectId?: string, 
  error?: string,
  diagnostics?: {
    environment: string,
    recommendedApproach: string,
    tokenSystem: string,
    firebaseProject: string
  }
}> {
  if (!isFirebaseAdminInitialized || !firestoreDb) {
    return {
      success: false,
      projectId,
      error: 'Firebase Admin SDK not initialized',
      diagnostics: {
        environment: 'Replit',
        recommendedApproach: 'Initialize Firebase Admin SDK',
        tokenSystem: 'Using fallback token system',
        firebaseProject: projectId
      }
    };
  }
  
  try {
    // Get FieldValue for server timestamp
    const { FieldValue } = await import('firebase-admin/firestore');
    
    // Attempt a test write to verify Firestore connectivity
    const testDocId = `connection_test_${Date.now()}`;
    const testRef = firestoreDb.collection('debug_tests').doc(testDocId);
    await testRef.set({
      timestamp: FieldValue.serverTimestamp(),
      environment: 'server',
      test: 'connection_test',
      server: 'replit'
    });
    
    return {
      success: true,
      projectId,
      diagnostics: {
        environment: 'Replit',
        recommendedApproach: 'Server-side Firestore operations are working',
        tokenSystem: 'Using Firebase Admin SDK authentication',
        firebaseProject: projectId
      }
    };
  } catch (error) {
    console.error('Error in testFirestoreConnection:', error);
    return {
      success: false,
      projectId,
      error: error instanceof Error ? error.message : String(error),
      diagnostics: {
        environment: 'Replit',
        recommendedApproach: 'Fix Firestore permissions or configuration',
        tokenSystem: isFirebaseAdminInitialized ? 'Firebase Admin SDK' : 'Fallback token',
        firebaseProject: projectId
      }
    };
  }
}

/**
 * Get the Firestore database instance for server-side operations
 * @returns Firestore database instance or null if not initialized
 */
export function getFirestoreDb(): Firestore | null {
  if (!firestoreDb) {
    console.warn('Firestore not initialized, returning null');
  }
  return firestoreDb;
}

/**
 * Save user onboarding ratings to Firestore
 * @param userId User ID
 * @param ratings Array of film ratings
 * @returns Result of the operation
 */
export async function saveOnboardingRatings(
  userId: number | string,
  ratings: Array<{
    filmId: number;
    rating: number;
    filmTitle: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  if (!firestoreDb) {
    return { success: false, error: 'Firestore not initialized' };
  }
  
  try {
    const uid = userId.toString();
    
    // Get FieldValue for server timestamp
    const { FieldValue } = await import('firebase-admin/firestore');
    
    const batch = firestoreDb.batch();
    
    // Create a map of ratings by film ID for efficient access
    const ratingsMap: Record<string, {
      rating: number;
      title: string;
      timestamp: any; // Using any for FieldValue
    }> = {};
    
    // Process ratings into the map
    for (const item of ratings) {
      ratingsMap[item.filmId.toString()] = {
        rating: item.rating,
        title: item.filmTitle,
        timestamp: FieldValue.serverTimestamp()
      };
    }
    
    // Create onboarding ratings document
    const onboardingRatingsRef = firestoreDb
      .collection('users')
      .doc(uid)
      .collection('ratings')
      .doc('onboarding');
      
    batch.set(onboardingRatingsRef, {
      films: ratingsMap,
      count: ratings.length,
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Execute batch write
    await batch.commit();
    
    console.log(`Saved ${ratings.length} onboarding ratings to Firestore for user ${uid}`);
    return { success: true };
  } catch (error) {
    console.error('Error saving onboarding ratings to Firestore:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Save user preferences to Firestore
 * @param userId User ID
 * @param preferences User preferences data
 * @returns Result of the operation
 */
export async function saveUserPreferences(
  userId: number | string,
  preferences: {
    country: string;
    streamingServices: string[];
    language?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!firestoreDb) {
    return { success: false, error: 'Firestore not initialized' };
  }
  
  try {
    // Get FieldValue for server timestamp
    const { FieldValue } = await import('firebase-admin/firestore');
    
    const uid = userId.toString();
    const userPrefsRef = firestoreDb
      .collection('users')
      .doc(uid)
      .collection('preferences')
      .doc('settings');
    
    await userPrefsRef.set({
      country: preferences.country,
      streamingServices: preferences.streamingServices,
      language: preferences.language || 'en',
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`Saved preferences to Firestore for user ${uid}`);
    return { success: true };
  } catch (error) {
    console.error('Error saving preferences to Firestore:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * A simple token generator for fallback authentication
 * This is only used if Firebase Admin SDK initialization fails
 */
function createSimpleToken(uid: string): string {
  const timestamp = Date.now();
  const payload = {
    uid,
    timestamp,
    // Add a simple expiration time (24 hours)
    exp: timestamp + (24 * 60 * 60 * 1000)
  };
  
  const token = Buffer.from(JSON.stringify(payload)).toString('base64');
  console.log(`Created simple token for user ${uid}`);
  return token;
}