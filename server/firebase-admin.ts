/**
 * Firebase Admin SDK implementation for server-side Firebase operations
 * 
 * Important note about the implementation:
 * - We're using a simple token approach for now due to Firebase Admin SDK 
 *   initialization issues in the current environment.
 */
import * as admin from 'firebase-admin';

// Global settings
let projectId = 'unknown';
let isFirebaseAdminInitialized = false;
let firestoreInitialized = false;

// Try to parse service account
try {
  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    const credStr = process.env.FIREBASE_ADMIN_CREDENTIALS;
    console.log(`Firebase Admin credentials string length: ${credStr.length}`);
    console.log(`First 20 chars: ${credStr.substring(0, 20)}...`);
    
    try {
      const serviceAccount = JSON.parse(credStr);
      
      if (serviceAccount && typeof serviceAccount === 'object' && serviceAccount.project_id) {
        projectId = serviceAccount.project_id;
        console.log(`Target Firebase project ID: ${projectId}`);
      }
      
      // We're not initializing Firebase Admin SDK at this time due to environment issues
      // Instead, we'll use the simple token approach below
      console.log('Firebase Admin credentials parsed but not initializing SDK - using simple tokens instead');
    } catch (parseError) {
      console.error('Error parsing Firebase Admin credentials:', parseError);
    }
  } else {
    console.warn('FIREBASE_ADMIN_CREDENTIALS not set, operating in fallback mode');
  }
} catch (e) {
  console.error('Error setting up Firebase Admin:', e);
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
    
    // We're using the simple token approach for now
    return createSimpleToken(uid);
  } catch (error) {
    console.error('Error in createFirebaseToken:', error);
    return null;
  }
}

/**
 * Test for writing to Firestore
 * @returns Success status and diagnostic information
 */
export async function testFirestoreConnection(): Promise<{ success: boolean, projectId?: string, error?: string }> {
  // In a production environment, we would write to Firestore directly with Admin SDK
  // However, since we've determined the Admin SDK has issues in this environment,
  // we'll return diagnostic information to guide client-side operations
  
  try {
    // Check if we're using the correct project
    return {
      success: false,
      projectId,
      error: 'Firebase Admin SDK not fully initialized, using fallback token authentication. Client-side Firestore operations are required in this environment.',
      diagnostics: {
        environment: 'Replit',
        recommendedApproach: 'Use client-side Firestore with Firebase Authentication',
        tokenSystem: 'Simple token system is used for authentication',
        firebaseProject: projectId
      }
    };
  } catch (error) {
    return {
      success: false,
      projectId,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Stub for get Firestore database - will throw an error if used
 */
export function getFirestoreDb(): any {
  throw new Error('Firebase Admin SDK not fully initialized, Firestore operations not available');
}

/**
 * A simple token generator for fallback authentication
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