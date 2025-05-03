import { useCallback, useState } from 'react';
import { 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  serverTimestamp,
  DocumentReference,
  FirestoreError
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { 
  logFirestoreError, 
  logPreferenceOperation, 
  LogLevel, 
  LogCategory, 
  logSuccess, 
  logAuthOperation
} from '@/lib/firestore-test-logger';

interface FirestoreOperationOptions {
  requireAuth?: boolean;
  retryWithAnonymousAuth?: boolean;
  suppressErrors?: boolean;
  userFacingErrorMessage?: string;
}

const defaultOptions: FirestoreOperationOptions = {
  requireAuth: true,
  retryWithAnonymousAuth: true,
  suppressErrors: false,
  userFacingErrorMessage: 'Error saving data'
};

export function useSafeFirestore() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { toast } = useToast();
  
  /**
   * Attempt to sign in anonymously if no user is authenticated
   */
  const attemptAnonymousAuth = useCallback(async (): Promise<boolean> => {
    console.log('Attempting anonymous authentication with Firebase...');
    const auth = getAuth();
    
    try {
      if (!auth.currentUser) {
        const authResult = await signInAnonymously(auth);
        console.log('Anonymous auth successful:', authResult.user.uid);
        return true;
      } else {
        console.log('User already authenticated:', auth.currentUser.uid);
        return true;
      }
    } catch (authError) {
      console.error('Anonymous auth failed:', authError);
      return false;
    }
  }, []);
  
  /**
   * Diagnose a Firestore error and log detailed information
   */
  const diagnoseFirestoreError = useCallback((
    error: FirestoreError, 
    docPath: string
  ) => {
    const auth = getAuth();
    const isAuthenticated = !!auth.currentUser;
    
    // Create standard console output for backward compatibility
    console.error('FIREBASE ERROR DIAGNOSIS:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Document path:', docPath);
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
    logFirestoreError(LogCategory.CONFIG, 'Firestore Error Diagnosis', error, {
      documentPath: docPath,
      operationType: 'test',
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
   * Safely write data to Firestore with automatic error handling and retry mechanisms
   */
  const safeSetDoc = useCallback(async <T extends Record<string, any>>(
    docRef: DocumentReference,
    data: T,
    options: FirestoreOperationOptions = {}
  ): Promise<boolean> => {
    const mergedOptions = { ...defaultOptions, ...options };
    const auth = getAuth();
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting to write to Firestore: ${docRef.path}`);
      
      // Add server timestamp and tracking data to the document
      const enhancedData = {
        ...data,
        updatedAt: serverTimestamp(),
        _metadata: {
          operationTimestamp: new Date().toISOString(),
          source: 'cinematch-onboarding',
          operationType: 'write'
        }
      } as T & { updatedAt: any; _metadata: Record<string, any> };
      
      // Log Firestore operation for debugging
      console.log(`[Firestore Test] Writing to: ${docRef.path}`, {
        dataKeys: Object.keys(data),
        timestamp: new Date().toISOString()
      });
      
      // Check auth if required
      if (mergedOptions.requireAuth && !auth.currentUser && mergedOptions.retryWithAnonymousAuth) {
        console.log('No authenticated user, attempting anonymous auth...');
        await attemptAnonymousAuth();
      }
      
      // Main write attempt
      await setDoc(docRef, enhancedData);
      console.log(`Successfully wrote to ${docRef.path}`);
      return true;
    } catch (e) {
      const firestoreError = e as FirestoreError;
      diagnoseFirestoreError(firestoreError, docRef.path);
      
      // If the error is authentication related and retries are enabled, try anonymous auth
      if ((firestoreError.code === 'permission-denied' || firestoreError.code === 'unauthenticated') 
          && mergedOptions.retryWithAnonymousAuth) {
        try {
          console.log('Attempting to fix authentication issue...');
          const authFixed = await attemptAnonymousAuth();
          
          if (authFixed) {
            // Retry the write operation
            console.log('Retrying Firestore write after authentication...');
            // Re-create the enhanced data for the retry attempt
            const retryData = {
              ...data,
              updatedAt: serverTimestamp(),
              _metadata: {
                operationTimestamp: new Date().toISOString(),
                source: 'cinematch-onboarding',
                operationType: 'write-retry',
                retryReason: firestoreError.code
              }
            } as T & { updatedAt: any; _metadata: Record<string, any> };
            
            // Log retry attempt for debugging
            console.log(`[Firestore Test] Retry writing to: ${docRef.path}`, {
              dataKeys: Object.keys(data),
              timestamp: new Date().toISOString(),
              errorCode: firestoreError.code
            });
            
            await setDoc(docRef, retryData);
            console.log(`Successfully wrote to ${docRef.path} after authentication fix`);
            return true;
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }
      
      // Show user-facing error if not suppressed
      if (!mergedOptions.suppressErrors) {
        toast({
          title: 'Error',
          description: mergedOptions.userFacingErrorMessage || firestoreError.message,
          variant: 'destructive',
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [attemptAnonymousAuth, diagnoseFirestoreError, toast]);
  
  /**
   * Safely read data from Firestore with automatic error handling
   */
  const safeGetDoc = useCallback(async <T>(
    docRef: DocumentReference,
    options: FirestoreOperationOptions = {}
  ): Promise<T | null> => {
    const mergedOptions = { ...defaultOptions, ...options };
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting to read from Firestore: ${docRef.path}`);
      
      // Log read operation for debugging
      console.log(`[Firestore Test] Reading from: ${docRef.path}`, {
        timestamp: new Date().toISOString(),
        operation: 'read'
      });
      
      // Check auth if required
      if (mergedOptions.requireAuth && !getAuth().currentUser && mergedOptions.retryWithAnonymousAuth) {
        console.log('No authenticated user, attempting anonymous auth...');
        await attemptAnonymousAuth();
      }
      
      // Main read attempt
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log(`Successfully read from ${docRef.path}`);
        return docSnap.data() as T;
      } else {
        console.log(`No document found at ${docRef.path}`);
        return null;
      }
    } catch (e) {
      const firestoreError = e as FirestoreError;
      diagnoseFirestoreError(firestoreError, docRef.path);
      
      // If the error is authentication related and retries are enabled, try anonymous auth
      if ((firestoreError.code === 'permission-denied' || firestoreError.code === 'unauthenticated') 
          && mergedOptions.retryWithAnonymousAuth) {
        try {
          console.log('Attempting to fix authentication issue...');
          const authFixed = await attemptAnonymousAuth();
          
          if (authFixed) {
            // Retry the read operation
            console.log('Retrying Firestore read after authentication...');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              console.log(`Successfully read from ${docRef.path} after authentication fix`);
              return docSnap.data() as T;
            } else {
              return null;
            }
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }
      
      // Show user-facing error if not suppressed
      if (!mergedOptions.suppressErrors) {
        toast({
          title: 'Error',
          description: mergedOptions.userFacingErrorMessage || firestoreError.message,
          variant: 'destructive',
        });
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [attemptAnonymousAuth, diagnoseFirestoreError, toast]);
  
  /**
   * Create a document reference with the correct path format
   */
  const createDocRef = useCallback((collection: string, id: string | number) => {
    return doc(db, collection, typeof id === 'number' ? `user-${id}` : id);
  }, []);
  
  return {
    isLoading,
    error,
    safeSetDoc,
    safeGetDoc,
    createDocRef,
    // Expose raw functions for advanced usage
    attemptAnonymousAuth,
    diagnoseFirestoreError
  };
}