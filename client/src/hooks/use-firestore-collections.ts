import { useCallback, useState } from 'react';
import { 
  doc, 
  collection,
  setDoc, 
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  DocumentReference,
  CollectionReference,
  FirestoreError,
  DocumentData,
  WhereFilterOp,
  QuerySnapshot,
  DocumentSnapshot,
  FieldPath
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { 
  logFirestoreError, 
  logPreferenceOperation, 
  LogLevel, 
  LogCategory, 
  logSuccess, 
  logAuthOperation,
  logRatingOperation,
  logFriendsOperation,
  logWatchlistOperation,
  logRecommendationOperation
} from '@/lib/firestore-test-logger';

interface FirestoreOperationOptions {
  requireAuth?: boolean;
  retryWithAnonymousAuth?: boolean;
  suppressErrors?: boolean;
  userFacingErrorMessage?: string;
  logCategory?: LogCategory;
}

const defaultOptions: FirestoreOperationOptions = {
  requireAuth: true,
  retryWithAnonymousAuth: true,
  suppressErrors: false,
  userFacingErrorMessage: 'Error accessing database',
  logCategory: LogCategory.OTHER
};

// Type for query conditions
type QueryCondition = [string | FieldPath, WhereFilterOp, any];

// Type for order conditions
type OrderCondition = [string | FieldPath, 'asc' | 'desc'];

/**
 * Hook for managing Firestore collections and subcollections with improved error handling
 * This supports the new unified schema with proper subcollections
 */
export function useFirestoreCollections() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { toast } = useToast();
  
  /**
   * Create a path to a user document
   */
  const getUserDocPath = useCallback((userId?: string | number): string | null => {
    if (!userId) {
      const auth = getAuth();
      if (!auth.currentUser) return null;
      userId = auth.currentUser.uid;
    }
    
    return `users/${userId}`;
  }, []);
  
  /**
   * Diagnose a Firestore error and log detailed information
   */
  const diagnoseFirestoreError = useCallback((
    error: FirestoreError, 
    path: string,
    category: LogCategory
  ) => {
    const auth = getAuth();
    const isAuthenticated = !!auth.currentUser;
    
    // Create standard console output for backward compatibility
    console.error('FIREBASE ERROR DIAGNOSIS:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Path:', path);
    console.error('Auth state:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
    
    if (auth.currentUser) {
      console.error('Auth user ID:', auth.currentUser.uid);
      console.error('Auth provider:', auth.currentUser.providerId);
      console.error('Is anonymous:', auth.currentUser.isAnonymous);
    }
    
    // Determine root cause
    let rootCause = 'Unknown error';
    if (error.code === 'permission-denied') {
      rootCause = 'FIREBASE SECURITY RULES ERROR - User lacks permission';
      console.error('ROOT CAUSE: ' + rootCause);
      console.error('Recommended action: Check Firestore security rules');
    } else if (error.code === 'unauthenticated') {
      rootCause = 'FIREBASE AUTHENTICATION ISSUE - User not authenticated';
      console.error('ROOT CAUSE: ' + rootCause);
    } else if (error.code === 'unavailable') {
      rootCause = 'FIREBASE CONNECTIVITY ISSUE - Service may be unavailable';
      console.error('ROOT CAUSE: ' + rootCause);
    } else if (error.code === 'cancelled') {
      rootCause = 'FIREBASE OPERATION CANCELLED';
      console.error('ROOT CAUSE: ' + rootCause);
    } else if (error.code === 'invalid-argument') {
      rootCause = 'FIREBASE INVALID ARGUMENT - Check data structure';
      console.error('ROOT CAUSE: ' + rootCause);
    }
    
    // Use enhanced logger for detailed logging
    logFirestoreError(category, 'Firestore Error Diagnosis', error, {
      documentPath: path,
      operationType: 'access',
      additionalInfo: {
        authState: isAuthenticated ? 'authenticated' : 'not_authenticated',
        authDetails: auth.currentUser ? {
          uid: auth.currentUser.uid,
          provider: auth.currentUser.providerId,
          isAnonymous: auth.currentUser.isAnonymous
        } : null,
        rootCause,
        timestamp: new Date().toISOString(),
        diagnosisId: `diag-${Date.now()}`
      }
    });
    
    setError(error);
  }, []);
  
  /**
   * Get a document from a specified path
   */
  const getDocument = useCallback(async <T = DocumentData>(
    path: string,
    options: FirestoreOperationOptions = {}
  ): Promise<T | null> => {
    const mergedOptions = { ...defaultOptions, ...options };
    const logCat = mergedOptions.logCategory || LogCategory.OTHER;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Getting document at path: ${path}`);
      
      // Create a unique operation ID
      const opId = `get-${Date.now()}`;
      
      // Log operation attempt
      logPreferenceOperation(LogLevel.INFO, 'Getting Firestore Document', {
        documentPath: path,
        operationType: 'read',
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Get the document
      const docRef = doc(db, path);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log(`No document found at path: ${path}`);
        return null;
      }
      
      // Log success
      logSuccess(logCat, 'Retrieved Document Successfully', {
        documentPath: path,
        operationType: 'read',
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString(),
          docId: docSnap.id
        }
      });
      
      const data = docSnap.data() as T;
      return data;
    } catch (error) {
      const firestoreError = error as FirestoreError;
      diagnoseFirestoreError(firestoreError, path, logCat);
      
      if (!mergedOptions.suppressErrors) {
        toast({
          title: "Error",
          description: mergedOptions.userFacingErrorMessage || firestoreError.message,
          variant: "destructive",
        });
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [diagnoseFirestoreError, toast]);
  
  /**
   * Set a document at the specified path (overwrites existing data)
   */
  const setDocument = useCallback(async <T extends DocumentData>(
    path: string,
    data: T,
    options: FirestoreOperationOptions = {}
  ): Promise<boolean> => {
    const mergedOptions = { ...defaultOptions, ...options };
    const logCat = mergedOptions.logCategory || LogCategory.OTHER;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Setting document at path: ${path}`);
      
      // Create a unique operation ID
      const opId = `set-${Date.now()}`;
      
      // Log operation attempt
      logPreferenceOperation(LogLevel.INFO, 'Setting Firestore Document', {
        documentPath: path,
        operationType: 'write',
        data: { keys: Object.keys(data) },
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Add metadata
      const enhancedData = {
        ...data,
        updatedAt: serverTimestamp(),
        _metadata: {
          operationId: opId,
          timestamp: new Date().toISOString()
        }
      };
      
      // Set the document
      const docRef = doc(db, path);
      await setDoc(docRef, enhancedData);
      
      // Log success
      logSuccess(logCat, 'Document Set Successfully', {
        documentPath: path,
        operationType: 'write',
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString(),
          docId: docRef.id
        }
      });
      
      return true;
    } catch (error) {
      const firestoreError = error as FirestoreError;
      diagnoseFirestoreError(firestoreError, path, logCat);
      
      if (!mergedOptions.suppressErrors) {
        toast({
          title: "Error",
          description: mergedOptions.userFacingErrorMessage || firestoreError.message,
          variant: "destructive",
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [diagnoseFirestoreError, toast]);
  
  /**
   * Update a document at the specified path (merges with existing data)
   */
  const updateDocument = useCallback(async <T extends DocumentData>(
    path: string,
    data: Partial<T>,
    options: FirestoreOperationOptions = {}
  ): Promise<boolean> => {
    const mergedOptions = { ...defaultOptions, ...options };
    const logCat = mergedOptions.logCategory || LogCategory.OTHER;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Updating document at path: ${path}`);
      
      // Create a unique operation ID
      const opId = `update-${Date.now()}`;
      
      // Log operation attempt
      logPreferenceOperation(LogLevel.INFO, 'Updating Firestore Document', {
        documentPath: path,
        operationType: 'update',
        data: { keys: Object.keys(data) },
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Add metadata
      const enhancedData = {
        ...data,
        updatedAt: serverTimestamp(),
        '_metadata.operationId': opId,
        '_metadata.timestamp': new Date().toISOString()
      };
      
      // Update the document
      const docRef = doc(db, path);
      await updateDoc(docRef, enhancedData);
      
      // Log success
      logSuccess(logCat, 'Document Updated Successfully', {
        documentPath: path,
        operationType: 'update',
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString(),
          docId: docRef.id
        }
      });
      
      return true;
    } catch (error) {
      const firestoreError = error as FirestoreError;
      diagnoseFirestoreError(firestoreError, path, logCat);
      
      if (!mergedOptions.suppressErrors) {
        toast({
          title: "Error",
          description: mergedOptions.userFacingErrorMessage || firestoreError.message,
          variant: "destructive",
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [diagnoseFirestoreError, toast]);
  
  /**
   * Delete a document at the specified path
   */
  const deleteDocument = useCallback(async (
    path: string,
    options: FirestoreOperationOptions = {}
  ): Promise<boolean> => {
    const mergedOptions = { ...defaultOptions, ...options };
    const logCat = mergedOptions.logCategory || LogCategory.OTHER;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Deleting document at path: ${path}`);
      
      // Create a unique operation ID
      const opId = `delete-${Date.now()}`;
      
      // Log operation attempt
      logPreferenceOperation(LogLevel.INFO, 'Deleting Firestore Document', {
        documentPath: path,
        operationType: 'delete',
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Delete the document
      const docRef = doc(db, path);
      await deleteDoc(docRef);
      
      // Log success
      logSuccess(logCat, 'Document Deleted Successfully', {
        documentPath: path,
        operationType: 'delete',
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString(),
          docId: docRef.id
        }
      });
      
      return true;
    } catch (error) {
      const firestoreError = error as FirestoreError;
      diagnoseFirestoreError(firestoreError, path, logCat);
      
      if (!mergedOptions.suppressErrors) {
        toast({
          title: "Error",
          description: mergedOptions.userFacingErrorMessage || firestoreError.message,
          variant: "destructive",
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [diagnoseFirestoreError, toast]);
  
  /**
   * Add a document to a collection (auto-generates ID)
   */
  const addToCollection = useCallback(async <T extends DocumentData>(
    collectionPath: string,
    data: T,
    options: FirestoreOperationOptions = {}
  ): Promise<string | null> => {
    const mergedOptions = { ...defaultOptions, ...options };
    const logCat = mergedOptions.logCategory || LogCategory.OTHER;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Adding document to collection: ${collectionPath}`);
      
      // Create a unique operation ID
      const opId = `add-${Date.now()}`;
      
      // Log operation attempt
      logPreferenceOperation(LogLevel.INFO, 'Adding Document to Collection', {
        collectionPath: collectionPath,
        operationType: 'add',
        data: { keys: Object.keys(data) },
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Add metadata
      const enhancedData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        _metadata: {
          operationId: opId,
          timestamp: new Date().toISOString()
        }
      };
      
      // Add the document
      const collectionRef = collection(db, collectionPath);
      const docRef = await addDoc(collectionRef, enhancedData);
      
      // Log success
      logSuccess(logCat, 'Document Added Successfully', {
        collectionPath: collectionPath,
        documentPath: `${collectionPath}/${docRef.id}`,
        operationType: 'add',
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString(),
          docId: docRef.id
        }
      });
      
      return docRef.id;
    } catch (error) {
      const firestoreError = error as FirestoreError;
      diagnoseFirestoreError(firestoreError, collectionPath, logCat);
      
      if (!mergedOptions.suppressErrors) {
        toast({
          title: "Error",
          description: mergedOptions.userFacingErrorMessage || firestoreError.message,
          variant: "destructive",
        });
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [diagnoseFirestoreError, toast]);
  
  /**
   * Query documents from a collection
   */
  const queryCollection = useCallback(async <T = DocumentData>(
    collectionPath: string,
    conditions: QueryCondition[] = [],
    orderConditions: OrderCondition[] = [],
    resultsLimit: number = 0,
    options: FirestoreOperationOptions = {}
  ): Promise<T[]> => {
    const mergedOptions = { ...defaultOptions, ...options };
    const logCat = mergedOptions.logCategory || LogCategory.OTHER;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Querying collection: ${collectionPath}`);
      
      // Create a unique operation ID
      const opId = `query-${Date.now()}`;
      
      // Build the query
      const collectionRef = collection(db, collectionPath);
      let queryConstraints = [];
      
      // Add where conditions
      for (const [field, operator, value] of conditions) {
        queryConstraints.push(where(field, operator, value));
      }
      
      // Add order conditions
      for (const [field, direction] of orderConditions) {
        queryConstraints.push(orderBy(field, direction));
      }
      
      // Add limit if specified
      if (resultsLimit > 0) {
        queryConstraints.push(limit(resultsLimit));
      }
      
      // Log operation attempt
      logPreferenceOperation(LogLevel.INFO, 'Querying Collection', {
        collectionPath: collectionPath,
        operationType: 'query',
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString(),
          conditions: conditions.map(c => `${c[0]} ${c[1]} ${c[2]}`),
          orderBy: orderConditions.map(o => `${o[0]} ${o[1]}`),
          limit: resultsLimit || 'none'
        }
      });
      
      // Execute the query
      const q = query(collectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      // Convert to array of data
      const results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      
      // Log success
      logSuccess(logCat, 'Query Executed Successfully', {
        collectionPath: collectionPath,
        operationType: 'query',
        additionalInfo: {
          operationId: opId,
          timestamp: new Date().toISOString(),
          resultCount: results.length
        }
      });
      
      return results;
    } catch (error) {
      const firestoreError = error as FirestoreError;
      diagnoseFirestoreError(firestoreError, collectionPath, logCat);
      
      if (!mergedOptions.suppressErrors) {
        toast({
          title: "Error",
          description: mergedOptions.userFacingErrorMessage || firestoreError.message,
          variant: "destructive",
        });
      }
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [diagnoseFirestoreError, toast]);
  
  /**
   * ONBOARDING RATINGS
   * Save/update a film rating during onboarding
   */
  const saveOnboardingRating = useCallback(async (
    userId: string | number,
    filmId: number,
    rating: number,
    filmTitle: string
  ): Promise<boolean> => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return false;
    
    const ratingPath = `${userDocPath}/onboardingRatings/${filmId}`;
    
    return setDocument(
      ratingPath,
      {
        filmId,
        title: filmTitle, 
        rating,
        status: 'completed',
        timestamp: new Date().toISOString()
      },
      { 
        logCategory: LogCategory.RATING,
        userFacingErrorMessage: 'Failed to save film rating'
      }
    );
  }, [setDocument, getUserDocPath]);
  
  /**
   * Get all onboarding ratings for a user
   */
  const getOnboardingRatings = useCallback(async (userId: string | number) => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return [];
    
    const ratingsCollectionPath = `${userDocPath}/onboardingRatings`;
    
    return queryCollection(
      ratingsCollectionPath,
      [],
      [['timestamp', 'desc']],
      0,
      { 
        logCategory: LogCategory.RATING,
        userFacingErrorMessage: 'Failed to load film ratings'
      }
    );
  }, [queryCollection, getUserDocPath]);
  
  /**
   * RECOMMENDATION RATINGS
   * Save a recommendation rating (good/bad)
   */
  const saveRecommendationRating = useCallback(async (
    userId: string | number,
    filmId: number,
    rating: 'good' | 'bad',
    filmTitle: string
  ): Promise<boolean> => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return false;
    
    const ratingPath = `${userDocPath}/recommendationRatings/${filmId}`;
    
    return setDocument(
      ratingPath,
      {
        filmId,
        title: filmTitle,
        rating,
        timestamp: new Date().toISOString()
      },
      { 
        logCategory: LogCategory.RATING,
        userFacingErrorMessage: 'Failed to save recommendation feedback'
      }
    );
  }, [setDocument, getUserDocPath]);
  
  /**
   * WATCHLIST
   * Add a film to the user's watchlist
   */
  const addToWatchlist = useCallback(async (
    userId: string | number,
    filmId: number,
    filmData: {
      title: string,
      posterUrl?: string,
      year?: number,
      genres?: string[]
    }
  ): Promise<boolean> => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return false;
    
    const watchlistPath = `${userDocPath}/watchlist/${filmId}`;
    
    return setDocument(
      watchlistPath,
      {
        filmId,
        title: filmData.title,
        posterUrl: filmData.posterUrl || '',
        year: filmData.year,
        genres: filmData.genres || [],
        addedAt: new Date().toISOString(),
        status: 'added',
        watched: false
      },
      { 
        logCategory: LogCategory.WATCHLIST,
        userFacingErrorMessage: 'Failed to add film to watchlist'
      }
    );
  }, [setDocument, getUserDocPath]);
  
  /**
   * Remove a film from the user's watchlist
   */
  const removeFromWatchlist = useCallback(async (
    userId: string | number,
    filmId: number
  ): Promise<boolean> => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return false;
    
    const watchlistPath = `${userDocPath}/watchlist/${filmId}`;
    
    return deleteDocument(
      watchlistPath,
      { 
        logCategory: LogCategory.WATCHLIST,
        userFacingErrorMessage: 'Failed to remove film from watchlist'
      }
    );
  }, [deleteDocument, getUserDocPath]);
  
  /**
   * Get all films in the user's watchlist
   */
  const getWatchlist = useCallback(async (userId: string | number) => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return [];
    
    const watchlistCollectionPath = `${userDocPath}/watchlist`;
    
    return queryCollection(
      watchlistCollectionPath,
      [],
      [['addedAt', 'desc']],
      0,
      { 
        logCategory: LogCategory.WATCHLIST,
        userFacingErrorMessage: 'Failed to load watchlist'
      }
    );
  }, [queryCollection, getUserDocPath]);
  
  /**
   * FRIENDS
   * Add a friend connection
   */
  const addFriend = useCallback(async (
    userId: string | number,
    friendId: string | number,
    status: 'accepted' | 'pending' | 'blocked' = 'pending'
  ): Promise<boolean> => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return false;
    
    const friendPath = `${userDocPath}/friends/${friendId}`;
    
    return setDocument(
      friendPath,
      {
        friendId,
        status,
        friendSince: new Date().toISOString()
      },
      { 
        logCategory: LogCategory.FRIENDS,
        userFacingErrorMessage: 'Failed to add friend'
      }
    );
  }, [setDocument, getUserDocPath]);
  
  /**
   * Update a friend connection status
   */
  const updateFriendStatus = useCallback(async (
    userId: string | number,
    friendId: string | number,
    status: 'accepted' | 'pending' | 'blocked'
  ): Promise<boolean> => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return false;
    
    const friendPath = `${userDocPath}/friends/${friendId}`;
    
    return updateDocument(
      friendPath,
      {
        status,
        updatedAt: new Date().toISOString()
      },
      { 
        logCategory: LogCategory.FRIENDS,
        userFacingErrorMessage: 'Failed to update friend status'
      }
    );
  }, [updateDocument, getUserDocPath]);
  
  /**
   * Remove a friend connection
   */
  const removeFriend = useCallback(async (
    userId: string | number,
    friendId: string | number
  ): Promise<boolean> => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return false;
    
    const friendPath = `${userDocPath}/friends/${friendId}`;
    
    return deleteDocument(
      friendPath,
      { 
        logCategory: LogCategory.FRIENDS,
        userFacingErrorMessage: 'Failed to remove friend'
      }
    );
  }, [deleteDocument, getUserDocPath]);
  
  /**
   * Get all friends for a user
   */
  const getFriends = useCallback(async (
    userId: string | number,
    status?: 'accepted' | 'pending' | 'blocked'
  ) => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return [];
    
    const friendsCollectionPath = `${userDocPath}/friends`;
    const conditions: QueryCondition[] = status ? [['status', '==', status]] : [];
    
    return queryCollection(
      friendsCollectionPath,
      conditions,
      [['friendSince', 'desc']],
      0,
      { 
        logCategory: LogCategory.FRIENDS,
        userFacingErrorMessage: 'Failed to load friends'
      }
    );
  }, [queryCollection, getUserDocPath]);
  
  /**
   * SHARED RECOMMENDATIONS
   * Save a shared recommendation session
   */
  const saveSharedRecommendation = useCallback(async (
    userId: string | number,
    sessionData: {
      friendIds: (string | number)[],
      filmIds: number[],
      context?: Record<string, any>
    },
    sessionId?: string
  ): Promise<string | null> => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return null;
    
    const sessionPath = sessionId 
      ? `${userDocPath}/sharedRecommendations/${sessionId}`
      : null;
    
    const sessionDocument = {
      friends: sessionData.friendIds,
      recommendedFilms: sessionData.filmIds,
      createdAt: new Date().toISOString(),
      context: sessionData.context || {}
    };
    
    if (sessionPath) {
      // Update existing session
      const success = await updateDocument(
        sessionPath,
        sessionDocument,
        { 
          logCategory: LogCategory.RECOMMENDATION,
          userFacingErrorMessage: 'Failed to update shared recommendations'
        }
      );
      return success ? sessionId : null;
    } else {
      // Create new session
      const sharedRecommendationsCollection = `${userDocPath}/sharedRecommendations`;
      return addToCollection(
        sharedRecommendationsCollection,
        sessionDocument,
        { 
          logCategory: LogCategory.RECOMMENDATION,
          userFacingErrorMessage: 'Failed to save shared recommendations'
        }
      );
    }
  }, [updateDocument, addToCollection, getUserDocPath]);
  
  /**
   * Get all shared recommendation sessions for a user
   */
  const getSharedRecommendations = useCallback(async (userId: string | number) => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return [];
    
    const sharedRecommendationsCollection = `${userDocPath}/sharedRecommendations`;
    
    return queryCollection(
      sharedRecommendationsCollection,
      [],
      [['createdAt', 'desc']],
      0,
      { 
        logCategory: LogCategory.RECOMMENDATION,
        userFacingErrorMessage: 'Failed to load shared recommendations'
      }
    );
  }, [queryCollection, getUserDocPath]);
  
  /**
   * USER PROFILE / PREFERENCES
   * Update user preferences (country and streaming services)
   */
  const updateUserPreferences = useCallback(async (
    userId: string | number,
    preferences: {
      country?: string,
      streamingServices?: string[]
    }
  ): Promise<boolean> => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return false;
    
    return setDocument(
      userDocPath,
      {
        preferences: {
          ...preferences,
          updatedAt: new Date().toISOString()
        }
      },
      { 
        logCategory: LogCategory.PREFERENCE,
        userFacingErrorMessage: 'Failed to update preferences'
      }
    );
  }, [setDocument, getUserDocPath]);
  
  /**
   * Update user onboarding status
   */
  const updateOnboardingStatus = useCallback(async (
    userId: string | number,
    status: {
      step?: string | number,
      progress?: number,
      completed?: boolean
    }
  ): Promise<boolean> => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return false;
    
    return updateDocument(
      userDocPath,
      {
        onboardingStatus: {
          ...status,
          updatedAt: new Date().toISOString()
        }
      },
      { 
        logCategory: LogCategory.OTHER,
        userFacingErrorMessage: 'Failed to update onboarding status'
      }
    );
  }, [updateDocument, getUserDocPath]);
  
  /**
   * Get user data (preferences, onboarding status)
   */
  const getUserData = useCallback(async (userId: string | number) => {
    const userDocPath = getUserDocPath(userId);
    if (!userDocPath) return null;
    
    return getDocument(
      userDocPath,
      { 
        logCategory: LogCategory.OTHER,
        userFacingErrorMessage: 'Failed to load user data'
      }
    );
  }, [getDocument, getUserDocPath]);
  
  return {
    // Status
    isLoading,
    error,
    
    // Core operations
    getDocument,
    setDocument,
    updateDocument,
    deleteDocument,
    addToCollection,
    queryCollection,
    
    // User management
    getUserDocPath,
    getUserData,
    updateUserPreferences,
    updateOnboardingStatus,
    
    // Onboarding ratings
    saveOnboardingRating,
    getOnboardingRatings,
    
    // Recommendation ratings
    saveRecommendationRating,
    
    // Watchlist
    addToWatchlist,
    removeFromWatchlist,
    getWatchlist,
    
    // Friends
    addFriend,
    updateFriendStatus,
    removeFriend,
    getFriends,
    
    // Shared recommendations
    saveSharedRecommendation,
    getSharedRecommendations
  };
}