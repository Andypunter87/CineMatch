/**
 * Firebase Admin SDK implementation for server-side Firebase operations
 */
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with service account credentials
let firebaseAdmin: admin.app.App | undefined;
let firestoreDb: admin.firestore.Firestore | undefined;

try {
  // Check if credentials are provided
  if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
    throw new Error('FIREBASE_ADMIN_CREDENTIALS environment variable not set');
  }

  // Parse the service account credentials
  // Log the first few characters to ensure it's a valid JSON string without exposing the full credentials
  const credStr = process.env.FIREBASE_ADMIN_CREDENTIALS;
  console.log(`Firebase Admin credentials string length: ${credStr.length}`);
  console.log(`First 20 chars: ${credStr.substring(0, 20)}...`);
  
  // Try parsing as JSON
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(credStr);
    console.log('Successfully parsed credentials as JSON');
  } catch (parseError) {
    console.error('Error parsing credentials as JSON:', parseError);
    throw new Error('Invalid JSON format in FIREBASE_ADMIN_CREDENTIALS');
  }
  
  // Log the service account keys to debug
  console.log('Service account keys:', Object.keys(serviceAccount));
  
  // Check if the service account has the required fields for cert
  if (serviceAccount && 
      typeof serviceAccount === 'object' && 
      'project_id' in serviceAccount && 
      'private_key' in serviceAccount && 
      'client_email' in serviceAccount) {
    
    console.log(`Using service account for project: ${serviceAccount.project_id}`);
    
    // Initialize Firebase Admin if not already initialized
    // Check if apps exists and has length property before accessing it
    if (!admin.apps || admin.apps.length === 0) {
      try {
        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: serviceAccount.project_id,
            privateKey: serviceAccount.private_key,
            clientEmail: serviceAccount.client_email
          }),
        });
        console.log(`Firebase Admin initialized successfully for project: ${serviceAccount.project_id}`);
      } catch (initError) {
        console.error('Error initializing Firebase Admin:', initError);
        throw initError;
      }
    } else {
      // Get the existing app
      firebaseAdmin = admin.app();
    }
  } else {
    console.error('Invalid service account format - missing required fields');
    throw new Error('Invalid service account format - missing required fields');
  }
  
  // Initialize Firestore
  if (firebaseAdmin) {
    firestoreDb = getFirestore(firebaseAdmin);
    console.log('Firestore initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

/**
 * Get the Firestore database instance
 * @returns The Firestore database instance
 */
export function getFirestoreDb(): admin.firestore.Firestore {
  if (!firestoreDb) {
    throw new Error('Firestore not initialized');
  }
  return firestoreDb;
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
    
    if (!firebaseAdmin) {
      // Fallback to simple token if admin SDK is not available
      console.warn('Firebase Admin not initialized, using simple token');
      return createSimpleToken(uid);
    }
    
    // Create a proper Firebase custom token
    const customToken = await firebaseAdmin.auth().createCustomToken(uid);
    console.log(`Created custom token for user ${uid}`);
    return customToken;
  } catch (error) {
    console.error('Error creating Firebase token:', error);
    const uid = userId.toString();
    return createSimpleToken(uid);
  }
}

/**
 * Test writing to Firestore to verify admin SDK is working properly
 * @returns Success status and optional error message
 */
export async function testFirestoreConnection(): Promise<{ success: boolean, projectId?: string, error?: string }> {
  try {
    if (!firestoreDb) {
      return { 
        success: false, 
        error: 'Firestore not initialized'
      };
    }
    
    // Get the project ID
    let projectId = 'unknown';
    if (admin.apps && admin.apps.length > 0) {
      projectId = admin.apps[0].options.projectId || 'unknown';
    }
    
    // Write a test document
    const testDoc = firestoreDb.collection('admin-tests').doc('connection-test');
    await testDoc.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Connection test successful',
      testId: `test-${Date.now()}`
    });
    
    console.log(`Firestore write test successful for project: ${projectId}`);
    return {
      success: true,
      projectId
    };
  } catch (error) {
    console.error('Firestore write test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * A fallback function to generate a simple base64 token
 * Used as a fallback when Firebase Admin SDK is not available
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