import { useState } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  orderBy, 
  serverTimestamp,
  QueryConstraint,
  OrderByDirection, 
  Timestamp,
  WithFieldValue,
  DocumentData,
  writeBatch,
  WriteBatch,
  DocumentReference
} from 'firebase/firestore';

import { db, auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { 
  LogCategory, 
  LogLevel, 
  logDebug, 
  logError, 
  logQuery, 
  logWrite, 
  logSuccess 
} from '@/lib/firestore-test-logger';
import { OnboardingRating, RecommendationRating } from '@/lib/types/film-rating';
import { FirestorePaths, formatUserPath, getFilmDocId } from '@/lib/firestore-paths';

/**
 * Local wrapper around the imported formatUserPath to maintain backward compatibility
 * @param userId The user ID (string or number)
 * @param subcollection Optional subcollection name
 * @param documentId Optional document ID within the subcollection
 * @returns Properly formatted Firestore path
 * @deprecated Use the imported formatUserPath from @/lib/firestore-paths instead
 */
function _formatUserPathLegacy(
  userId: string | number,
  subcollection?: string,
  documentId?: string | number
): string {
  // Base user path with just the subcollection
  let path = formatUserPath(userId, subcollection || '');
  
  // Add document ID if specified
  if (documentId !== undefined && subcollection) {
    path += `/${String(documentId)}`;
  }
  
  return path;
}

type FirestoreLog = {
  logCategory?: LogCategory;
  additionalInfo?: Record<string, any>;
};

/**
 * This hook provides a unified interface for interacting with Firestore collections
 * following the new hierarchical schema with subcollections
 */
export function useFirestoreCollections() {
  // Track error state
  const [error, setError] = useState<Error | null>(null);
  
  /**
   * Get a document from Firestore by path and ID
   */
  const getDocumentById = async <T>(
    collection: string,
    id: string | number,
    options: FirestoreLog = {}
  ): Promise<T | null> => {
    const { logCategory = LogCategory.OTHER, additionalInfo = {} } = options;
    
    try {
      // Log the query operation
      logQuery(logCategory, `Getting document from ${collection}/${id}`, { path: `${collection}/${id}`, ...additionalInfo });
      
      // Get the document
      const docRef = doc(db, collection, String(id));
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Log success
        logSuccess(logCategory, `Document retrieved from ${collection}/${id}`, { 
          status: 'success', 
          path: `${collection}/${id}`,
          ...additionalInfo 
        });
        
        return { id: docSnap.id, ...docSnap.data() } as T;
      } else {
        // Log not found
        logDebug(LogLevel.INFO, `Document not found at ${collection}/${id}`, { 
          status: 'not_found', 
          path: `${collection}/${id}`,
          ...additionalInfo 
        });
        
        return null;
      }
    } catch (err) {
      const error = err as Error;
      
      // Log error
      logError(logCategory, `Error getting document from ${collection}/${id}`, { 
        error: error.message, 
        path: `${collection}/${id}`,
        ...additionalInfo 
      });
      
      setError(error);
      return null;
    }
  };
  
  /**
   * Query a collection with filters, ordering, and limits
   */
  const queryCollection = async <T>(
    collectionPath: string,
    queryConstraints: QueryConstraint[] = [],
    orderByFields: [string, OrderByDirection][] = [],
    limitCount: number = 0,
    options: FirestoreLog = {}
  ): Promise<T[]> => {
    const { logCategory = LogCategory.OTHER, additionalInfo = {} } = options;
    
    try {
      // Build the query constraints
      const constraints: QueryConstraint[] = [...queryConstraints];
      
      // Add ordering if specified
      if (orderByFields.length > 0) {
        orderByFields.forEach(([field, direction]) => {
          constraints.push(orderBy(field, direction));
        });
      }
      
      // Add limit if specified
      if (limitCount > 0) {
        constraints.push(limit(limitCount));
      }
      
      // Log the query operation
      logQuery(logCategory, `Querying collection ${collectionPath}`, { 
        path: collectionPath, 
        constraints: JSON.stringify(constraints),
        ...additionalInfo 
      });
      
      // Get the collection reference and apply constraints
      const collectionRef = collection(db, collectionPath);
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : query(collectionRef);
      
      // Get the documents
      const querySnapshot = await getDocs(q);
      
      // Extract and transform data
      const results = querySnapshot.docs.map(doc => {
        return { id: doc.id, ...doc.data() } as T;
      });
      
      // Log success
      logSuccess(logCategory, `Retrieved ${results.length} documents from ${collectionPath}`, { 
        status: 'success', 
        count: results.length,
        path: collectionPath,
        ...additionalInfo 
      });
      
      return results;
    } catch (err) {
      const error = err as Error;
      
      // Log error
      logError(logCategory, `Error querying collection ${collectionPath}`, { 
        error: error.message, 
        path: collectionPath,
        ...additionalInfo 
      });
      
      setError(error);
      return [];
    }
  };
  
  /**
   * Add a document to a collection or subcollection
   */
  const addDocument = async <T extends DocumentData>(
    collectionPath: string,
    data: WithFieldValue<T>,
    options: FirestoreLog = {}
  ): Promise<string | null> => {
    const { logCategory = LogCategory.OTHER, additionalInfo = {} } = options;
    
    try {
      // Add server timestamp to the data
      const dataWithTimestamp = {
        ...data,
        timestamp: serverTimestamp()
      };
      
      // Log the write operation
      logWrite(logCategory, `Adding document to ${collectionPath}`, { 
        path: collectionPath, 
        operation: 'add',
        ...additionalInfo 
      });
      
      // Add the document
      const collectionRef = collection(db, collectionPath);
      const docRef = await addDoc(collectionRef, dataWithTimestamp);
      
      // Log success
      logSuccess(logCategory, `Document added to ${collectionPath} with ID ${docRef.id}`, { 
        status: 'success', 
        path: `${collectionPath}/${docRef.id}`,
        operation: 'add',
        ...additionalInfo 
      });
      
      return docRef.id;
    } catch (err) {
      const error = err as Error;
      
      // Log error
      logError(logCategory, `Error adding document to ${collectionPath}`, { 
        error: error.message, 
        path: collectionPath,
        operation: 'add',
        ...additionalInfo 
      });
      
      setError(error);
      return null;
    }
  };
  
  /**
   * Set a document at a specific path (create or replace)
   */
  const setDocument = async <T extends DocumentData>(
    documentPath: string,
    data: WithFieldValue<T>,
    merge: boolean = true,
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    const { logCategory = LogCategory.OTHER, additionalInfo = {} } = options;
    
    try {
      // Get current Firebase auth state for verification
      const currentUser = auth.currentUser;
      const authUID = currentUser?.uid;
      
      // Extract userId from path for comparison (if it's a user path)
      const userPathMatch = documentPath.match(/^users\/(\d+|[^\/]+)/);
      const pathUserId = userPathMatch ? userPathMatch[1] : null;
      
      // Check if server-side auth token user ID exists in additionalInfo
      const serverUserId = additionalInfo.userId || null;
      
      // Log auth verification details
      console.log('AUTH VERIFICATION:', {
        documentPath,
        firebaseUID: authUID,
        pathUserId,
        serverUserId,
        authMatch: authUID === pathUserId,
        serverMatch: serverUserId && (serverUserId.toString() === pathUserId)
      });
      
      // Add server timestamp to the data
      const dataWithTimestamp = {
        ...data,
        timestamp: serverTimestamp()
      };
      
      // Log the write operation with auth details
      logWrite(logCategory, `Setting document at ${documentPath}`, { 
        path: documentPath, 
        operation: merge ? 'merge' : 'set',
        authUID,
        pathUserId,
        serverUserId,
        ...additionalInfo 
      });
      
      // Set the document
      const docRef = doc(db, documentPath);
      await setDoc(docRef, dataWithTimestamp, { merge });
      
      // Immediately verify write by reading back
      try {
        const verifyDoc = await getDoc(docRef);
        const writeVerified = verifyDoc.exists();
        // Log success with verification
        logSuccess(logCategory, `Document set at ${documentPath} (Verified: ${writeVerified})`, { 
          status: 'success', 
          path: documentPath,
          operation: merge ? 'merge' : 'set',
          writeVerified,
          authUID,
          pathUserId,
          serverUserId,
          ...additionalInfo 
        });
      } catch (verifyErr) {
        console.warn('Write verification failed:', verifyErr);
      }
      
      return true;
    } catch (err) {
      const error = err as Error;
      
      // Get additional Firestore error details
      const firebaseError = error as FirebaseError;
      const errorCode = firebaseError.code || 'unknown';
      
      // Extract userId from path for comparison (if it's a user path)
      const userPathMatch = documentPath.match(/^users\/(\d+|[^\/]+)/);
      const pathUserId = userPathMatch ? userPathMatch[1] : null;
      
      const errorDetails = {
        code: errorCode,
        documentPath,
        authUID: auth.currentUser?.uid,
        pathUserId,
        serverUserId: additionalInfo.userId || null,
        isAuthenticated: !!auth.currentUser
      };
      
      // Full diagnosis logging for Firestore errors
      console.error('FIREBASE ERROR DIAGNOSIS:', {
        ...errorDetails,
        message: error.message,
        stack: error.stack
      });
      
      // Log detailed error
      logError(logCategory, `Error setting document at ${documentPath}`, { 
        error: error.message, 
        errorCode,
        path: documentPath,
        operation: merge ? 'merge' : 'set',
        ...errorDetails,
        ...additionalInfo 
      });
      
      setError(error);
      return false;
    }
  };
  
  /**
   * Update a document at a specific path (partial update)
   */
  const updateDocument = async (
    documentPath: string,
    data: WithFieldValue<DocumentData>,
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    const { logCategory = LogCategory.OTHER, additionalInfo = {} } = options;
    
    try {
      // Add last updated timestamp
      const dataWithTimestamp = {
        ...data,
        lastUpdated: serverTimestamp()
      };
      
      // Log the write operation
      logWrite(logCategory, `Updating document at ${documentPath}`, { 
        path: documentPath, 
        operation: 'update',
        ...additionalInfo 
      });
      
      // Update the document
      const docRef = doc(db, documentPath);
      await updateDoc(docRef, dataWithTimestamp);
      
      // Log success
      logSuccess(logCategory, `Document updated at ${documentPath}`, { 
        status: 'success', 
        path: documentPath,
        operation: 'update',
        ...additionalInfo 
      });
      
      return true;
    } catch (err) {
      const error = err as Error;
      
      // Log error
      logError(logCategory, `Error updating document at ${documentPath}`, { 
        error: error.message, 
        path: documentPath,
        operation: 'update',
        ...additionalInfo 
      });
      
      setError(error);
      return false;
    }
  };
  
  /**
   * Delete a document at a specific path
   */
  const deleteDocument = async (
    documentPath: string,
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    const { logCategory = LogCategory.OTHER, additionalInfo = {} } = options;
    
    try {
      // Log the write operation
      logWrite(logCategory, `Deleting document at ${documentPath}`, { 
        path: documentPath, 
        operation: 'delete',
        ...additionalInfo 
      });
      
      // Delete the document
      const docRef = doc(db, documentPath);
      await deleteDoc(docRef);
      
      // Log success
      logSuccess(logCategory, `Document deleted at ${documentPath}`, { 
        status: 'success', 
        path: documentPath,
        operation: 'delete',
        ...additionalInfo 
      });
      
      return true;
    } catch (err) {
      const error = err as Error;
      
      // Log error
      logError(logCategory, `Error deleting document at ${documentPath}`, { 
        error: error.message, 
        path: documentPath,
        operation: 'delete',
        ...additionalInfo 
      });
      
      setError(error);
      return false;
    }
  };
  
  /**
   * Create a new Firestore batch operation
   */
  const createBatch = (): WriteBatch => {
    return writeBatch(db);
  };
  
  /**
   * Commit a batch operation with error handling and logging
   */
  const commitBatch = async (
    batch: WriteBatch,
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    const { logCategory = LogCategory.OTHER, additionalInfo = {} } = options;
    
    try {
      // Log the batch operation
      logWrite(logCategory, `Committing batch operation`, { 
        operation: 'batch',
        ...additionalInfo 
      });
      
      // Commit the batch
      await batch.commit();
      
      // Log success
      logSuccess(logCategory, `Batch operation committed successfully`, { 
        status: 'success', 
        operation: 'batch',
        ...additionalInfo 
      });
      
      return true;
    } catch (err) {
      const error = err as Error;
      
      // Log error
      logError(logCategory, `Error committing batch operation`, { 
        error: error.message, 
        operation: 'batch',
        ...additionalInfo 
      });
      
      setError(error);
      return false;
    }
  };
  
  /**
   * Get reference to a document
   */
  const getDocumentRef = (documentPath: string): DocumentReference => {
    return doc(db, documentPath);
  };
  
  /**
   * Get a user's data from Firestore with the new schema
   */
  const getUserData = async (
    userId: string | number,
    options: FirestoreLog = {}
  ): Promise<any | null> => {
    // Get document directly from the users collection
    return await getDocumentById(
      'users',
      String(userId),
      {
        logCategory: LogCategory.USER,
        additionalInfo: { ...options.additionalInfo, userId }
      }
    );
  };
  
  /**
   * Get a user's preferences from Firestore with the new schema
   * Preferences now stored at /users/{userId}/preferences/settings
   */
  const getUserPreferences = async (
    userId: string | number,
    options: FirestoreLog = {}
  ): Promise<any | null> => {
    // Use the FirestorePaths constant for consistent path handling
    const preferencesPath = FirestorePaths.USER_PREFERENCES(userId);
    
    // Extract just the collection path and document ID
    const lastSlashIndex = preferencesPath.lastIndexOf('/');
    const collectionPath = preferencesPath.substring(0, lastSlashIndex);
    const docId = preferencesPath.substring(lastSlashIndex + 1);
    
    // Get document from the preferences/settings path
    const result = await getDocumentById(
      collectionPath,
      docId,
      {
        logCategory: LogCategory.USER_PREFERENCES,
        additionalInfo: { ...options.additionalInfo, userId }
      }
    );
    
    return result;
  };
  
  /**
   * Save a user's preferences to Firestore with the new schema
   * Preferences are now stored at /users/{userId}/preferences/settings
   */
  const saveUserPreferences = async (
    userId: string | number,
    preferences: {
      country?: string;
      streamingServices?: string[];
      [key: string]: any;
    },
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    // Use the FirestorePaths constant for consistent path handling
    const preferencesPath = FirestorePaths.USER_PREFERENCES(userId);
    
    return await setDocument(
      preferencesPath,
      { 
        ...preferences,
        updatedAt: new Date().toISOString()
      },
      true, // merge
      {
        logCategory: LogCategory.USER_PREFERENCES,
        additionalInfo: { ...options.additionalInfo, userId }
      }
    );
  };
  
  /**
   * Update a user's onboarding status in Firestore with the new schema
   */
  const updateOnboardingStatus = async (
    userId: string | number,
    status: {
      step?: number;
      progress?: number;
      completed?: boolean;
      [key: string]: any;
    },
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    // Use the formatUserPath utility to get the correct path
    const userPath = formatUserPath(userId);
    
    return await setDocument(
      userPath,
      { 
        onboardingStatus: status,
        updatedAt: new Date().toISOString()
      },
      true, // merge
      {
        logCategory: LogCategory.USER,
        additionalInfo: { ...options.additionalInfo, userId }
      }
    );
  };
  
  /**
   * Save an onboarding rating to Firestore with the new schema
   * Ratings now stored at /users/{userId}/ratings/onboarding/{filmId}
   */
  const saveOnboardingRating = async (
    userId: string | number,
    filmId: number,
    rating: number,
    title: string,
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    // Use the formatUserPath utility with subcollection path and document ID
    // First create path to ratings/onboarding subcollection
    const ratingPath = formatUserPath(userId, 'ratings/onboarding', filmId);
    
    // Prepare the rating data
    const ratingData: OnboardingRating = {
      filmId,
      title,
      rating,
      status: 'completed',
      timestamp: new Date().toISOString()
    };
    
    return await setDocument(
      ratingPath,
      ratingData,
      true, // merge
      {
        logCategory: LogCategory.RATING,
        additionalInfo: { ...options.additionalInfo, userId, filmId }
      }
    );
  };
  
  /**
   * Save a recommendation rating (good/bad) to Firestore with the new schema
   * Ratings now stored at /users/{userId}/ratings/recommendations/{filmId}
   */
  const saveRecommendationRating = async (
    userId: string | number,
    filmId: number,
    rating: 'good' | 'bad',
    title: string,
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    // Use the formatUserPath utility with subcollection path and document ID
    const ratingPath = formatUserPath(userId, 'ratings/recommendations', filmId);
    
    // Prepare the rating data
    const ratingData: RecommendationRating = {
      filmId,
      title,
      rating,
      timestamp: new Date().toISOString()
    };
    
    return await setDocument(
      ratingPath,
      ratingData,
      true, // merge
      {
        logCategory: LogCategory.RATING,
        additionalInfo: { ...options.additionalInfo, userId, filmId }
      }
    );
  };
  
  /**
   * Get all onboarding ratings for a user from Firestore with the new schema
   * Ratings now stored at /users/{userId}/ratings/onboarding/{filmId}
   */
  const getOnboardingRatings = async (
    userId: string | number,
    options: FirestoreLog = {}
  ): Promise<OnboardingRating[]> => {
    // Use the formatUserPath utility with subcollection path
    // Path to ratings/onboarding subcollection
    const ratingsPath = formatUserPath(userId, 'ratings/onboarding');
    
    return await queryCollection<OnboardingRating>(
      ratingsPath,
      [], // no constraints
      [['timestamp', 'desc']], // order by timestamp descending
      0, // no limit
      {
        logCategory: LogCategory.RATING,
        additionalInfo: { ...options.additionalInfo, userId }
      }
    );
  };
  
  /**
   * Get all recommendation ratings for a user from Firestore with the new schema
   * Ratings now stored at /users/{userId}/ratings/recommendations/{filmId}
   */
  const getRecommendationRatings = async (
    userId: string | number,
    options: FirestoreLog = {}
  ): Promise<RecommendationRating[]> => {
    // Use the formatUserPath utility with subcollection path
    const ratingsPath = formatUserPath(userId, 'ratings/recommendations');
    
    return await queryCollection<RecommendationRating>(
      ratingsPath,
      [], // no constraints
      [['timestamp', 'desc']], // order by timestamp descending
      0, // no limit
      {
        logCategory: LogCategory.RATING,
        additionalInfo: { ...options.additionalInfo, userId }
      }
    );
  };
  
  /**
   * Save a watchlist item to Firestore with the new schema
   */
  const saveWatchlistItem = async (
    userId: string | number,
    item: {
      filmId: number;
      title: string;
      posterUrl?: string;
      year?: number;
      genres?: string[];
      watched?: boolean;
      [key: string]: any;
    },
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    // Use the formatUserPath utility with subcollection and document ID
    const itemPath = formatUserPath(userId, 'watchlist', item.filmId);
    
    // Prepare the watchlist item data
    const watchlistData = {
      ...item,
      addedAt: new Date().toISOString(),
    };
    
    return await setDocument(
      itemPath,
      watchlistData,
      true, // merge
      {
        logCategory: LogCategory.WATCHLIST,
        additionalInfo: { ...options.additionalInfo, userId, filmId: item.filmId }
      }
    );
  };
  
  /**
   * Get a user's watchlist items from Firestore with the new schema
   */
  const getWatchlist = async (
    userId: string | number,
    options: FirestoreLog = {}
  ): Promise<any[]> => {
    // Use the formatUserPath utility with subcollection
    const watchlistPath = formatUserPath(userId, 'watchlist');
    
    return await queryCollection(
      watchlistPath,
      [], // no constraints
      [['addedAt', 'desc']], // order by addedAt descending
      0, // no limit
      {
        logCategory: LogCategory.WATCHLIST,
        additionalInfo: { ...options.additionalInfo, userId }
      }
    );
  };
  
  /**
   * Add a film to the user's watchlist with the new schema
   */
  const addToWatchlist = async (
    userId: string | number,
    filmId: number,
    filmData: {
      title: string;
      posterUrl?: string;
      year?: number;
      genres?: string[];
      [key: string]: any;
    },
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    // Use the formatUserPath utility with subcollection and document ID
    const itemPath = formatUserPath(userId, 'watchlist', filmId);
    
    // Prepare the watchlist item data
    const watchlistData = {
      filmId,
      ...filmData,
      addedAt: new Date().toISOString(),
      watched: false
    };
    
    return await setDocument(
      itemPath,
      watchlistData,
      true, // merge
      {
        logCategory: LogCategory.WATCHLIST,
        additionalInfo: { ...options.additionalInfo, userId, filmId }
      }
    );
  };

  /**
   * Remove a watchlist item from Firestore with the new schema
   */
  const removeFromWatchlist = async (
    userId: string | number,
    filmId: number,
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    // Use the formatUserPath utility with subcollection and document ID
    const itemPath = formatUserPath(userId, 'watchlist', filmId);
    
    return await deleteDocument(
      itemPath,
      {
        logCategory: LogCategory.WATCHLIST,
        additionalInfo: { ...options.additionalInfo, userId, filmId }
      }
    );
  };
  
  /**
   * Save friend data to Firestore with the new schema
   */
  const saveFriend = async (
    userId: string | number,
    friend: {
      friendId: string | number;
      status: 'pending' | 'accepted' | 'blocked';
      username?: string;
      name?: string;
      email?: string;
      [key: string]: any;
    },
    options: FirestoreLog = {}
  ): Promise<boolean> => {
    // Use the formatUserPath utility with subcollection and document ID
    // No "friend-" prefix is needed anymore
    const friendPath = formatUserPath(userId, 'friends', String(friend.friendId));
    
    // Prepare the friend data
    const friendData = {
      ...friend,
      friendSince: new Date().toISOString(),
    };
    
    return await setDocument(
      friendPath,
      friendData,
      true, // merge
      {
        logCategory: LogCategory.FRIENDS,
        additionalInfo: { ...options.additionalInfo, userId, friendId: friend.friendId }
      }
    );
  };
  
  /**
   * Get a user's friends from Firestore with the new schema
   */
  const getFriends = async (
    userId: string | number,
    status?: 'pending' | 'accepted' | 'blocked',
    options: FirestoreLog = {}
  ): Promise<any[]> => {
    // Use the formatUserPath utility with subcollection
    const friendsPath = formatUserPath(userId, 'friends');
    
    // Create constraints if status is specified
    const constraints: QueryConstraint[] = [];
    if (status) {
      constraints.push(where('status', '==', status));
    }
    
    return await queryCollection(
      friendsPath,
      constraints,
      [['friendSince', 'desc']], // order by friendSince descending
      0, // no limit
      {
        logCategory: LogCategory.FRIENDS,
        additionalInfo: { ...options.additionalInfo, userId, status }
      }
    );
  };
  
  /**
   * Save a shared recommendation session to Firestore with the new schema
   */
  const saveSharedRecommendation = async (
    userId: string | number,
    session: {
      friends: (string | number)[];
      recommendedFilms?: number[];
      context?: any;
      [key: string]: any;
    },
    options: FirestoreLog = {}
  ): Promise<string | null> => {
    // Use the formatUserPath utility with subcollection
    const sessionsPath = formatUserPath(userId, 'sharedRecommendations');
    
    // Prepare the session data
    const sessionData = {
      ...session,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };
    
    // Add the document and get its ID
    return await addDocument(
      sessionsPath,
      sessionData,
      {
        logCategory: LogCategory.RECOMMENDATIONS,
        additionalInfo: { ...options.additionalInfo, userId }
      }
    );
  };
  
  /**
   * Get a user's shared recommendation sessions from Firestore with the new schema
   */
  const getSharedRecommendations = async (
    userId: string | number,
    options: FirestoreLog = {}
  ): Promise<any[]> => {
    // Use the formatUserPath utility with subcollection
    const sessionsPath = formatUserPath(userId, 'sharedRecommendations');
    
    return await queryCollection(
      sessionsPath,
      [], // no constraints
      [['createdAt', 'desc']], // order by createdAt descending
      0, // no limit
      {
        logCategory: LogCategory.RECOMMENDATIONS,
        additionalInfo: { ...options.additionalInfo, userId }
      }
    );
  };
  
  // Return all the functions
  return {
    // Base Firestore operations
    getDocumentById,
    queryCollection,
    addDocument,
    setDocument,
    updateDocument,
    deleteDocument,
    createBatch,
    commitBatch,
    getDocumentRef,
    
    // User data operations
    getUserData,
    getUserPreferences,
    saveUserPreferences,
    updateOnboardingStatus,
    
    // Rating operations
    saveOnboardingRating,
    saveRecommendationRating,
    getOnboardingRatings,
    getRecommendationRatings,
    
    // Watchlist operations
    addToWatchlist,
    getWatchlist,
    removeFromWatchlist,
    
    // Friend operations
    saveFriend,
    getFriends,
    
    // Shared recommendation operations
    saveSharedRecommendation,
    getSharedRecommendations,
    
    // Error state
    error
  };
}