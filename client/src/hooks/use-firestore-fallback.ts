import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import * as firestoreDirect from '@/lib/firestore-direct';

/**
 * A hook that attempts to retrieve data from Firestore,
 * falling back to direct REST API access if Firebase auth fails
 */
export function useFirestoreFallback() {
  const [isFirebaseAuth, setIsFirebaseAuth] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if we have Firebase authentication
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsFirebaseAuth(!!user);
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase auth state error:", error);
      setIsFirebaseAuth(false);
      setError(error instanceof Error ? error : new Error(String(error)));
      setIsLoading(false);
    });

    // After 2 seconds, if we still don't have a definitive answer, assume no auth
    const timeout = setTimeout(() => {
      if (isFirebaseAuth === null) {
        console.warn("Firebase auth check timed out, assuming no authentication");
        setIsFirebaseAuth(false);
        setIsLoading(false);
      }
    }, 2000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Function to get a document, using the appropriate method based on auth status
  const getDocument = async (collectionPath: string, documentId: string) => {
    try {
      if (isFirebaseAuth) {
        // Use Firebase SDK
        const docRef = doc(db, collectionPath, documentId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
      } else {
        // Use direct REST API
        return await firestoreDirect.getFirestoreDocument(collectionPath, documentId);
      }
    } catch (error) {
      console.error(`Error getting document ${collectionPath}/${documentId}:`, error);
      // If Firebase SDK fails, try direct method as fallback
      if (isFirebaseAuth) {
        console.warn("Firebase SDK failed, trying direct API access");
        try {
          return await firestoreDirect.getFirestoreDocument(collectionPath, documentId);
        } catch (directError) {
          console.error("Direct API access also failed:", directError);
          throw directError;
        }
      }
      throw error;
    }
  };

  // Function to get all documents in a collection
  const getCollection = async (collectionPath: string) => {
    try {
      if (isFirebaseAuth) {
        // Use Firebase SDK
        const querySnapshot = await getDocs(collection(db, collectionPath));
        return querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
      } else {
        // Use direct REST API
        return await firestoreDirect.getFirestoreCollection(collectionPath);
      }
    } catch (error) {
      console.error(`Error getting collection ${collectionPath}:`, error);
      // If Firebase SDK fails, try direct method as fallback
      if (isFirebaseAuth) {
        console.warn("Firebase SDK failed, trying direct API access");
        try {
          return await firestoreDirect.getFirestoreCollection(collectionPath);
        } catch (directError) {
          console.error("Direct API access also failed:", directError);
          throw directError;
        }
      }
      throw error;
    }
  };

  // Get user preferences using the appropriate method
  const getUserPreferences = async () => {
    try {
      if (isFirebaseAuth) {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          throw new Error("No authenticated user");
        }
        return await getDocument(`users/${userId}/preferences`, 'settings');
      } else {
        return await firestoreDirect.getUserPreferences();
      }
    } catch (error) {
      console.error("Error getting user preferences:", error);
      throw error;
    }
  };

  // Get user onboarding ratings using the appropriate method
  const getUserOnboardingRatings = async () => {
    try {
      if (isFirebaseAuth) {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          throw new Error("No authenticated user");
        }
        return await getCollection(`users/${userId}/ratings/onboarding/films`);
      } else {
        return await firestoreDirect.getUserOnboardingRatings();
      }
    } catch (error) {
      console.error("Error getting user onboarding ratings:", error);
      throw error;
    }
  };

  return {
    isFirebaseAuth,
    isLoading,
    error,
    getDocument,
    getCollection,
    getUserPreferences,
    getUserOnboardingRatings
  };
}