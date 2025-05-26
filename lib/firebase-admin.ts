/**
 * Firebase Admin SDK for server-side operations
 * 
 * This module provides server-side Firebase/Firestore access for the
 * enhanced recommendation system.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS || '{}');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
    
    console.log('Firebase Admin SDK initialized for enhanced recommendations');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error('Firebase Admin SDK initialization failed');
  }
}

// Export Firestore database instance
export const db = admin.firestore();

// Export admin instance for additional operations if needed
export { admin };