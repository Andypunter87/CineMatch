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
    
    // Check if Firebase is properly configured first
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    
    if (!apiKey || !projectId) {
      console.error('Firebase not properly configured. Cannot authenticate anonymously.');
      return false;
    }
    
    // Log the attempt with our new logger
    logAuthOperation(LogLevel.INFO, 'Attempting anonymous authentication', {
      operationType: 'test',
      additionalInfo: {
        timestamp: new Date().toISOString(),
        reason: 'No authenticated user',
        currentAuthState: auth.currentUser ? 'already-authenticated' : 'not-authenticated',
        operationId: `auth-${Date.now()}`
      }
    });
    
    try {
      if (!auth.currentUser) {
        // Try to authenticate anonymously
        console.log('No current user, attempting anonymous sign-in...');
        const authResult = await signInAnonymously(auth);
        
        // Log success
        logSuccess(LogCategory.AUTH, 'Anonymous authentication successful', {
          operationType: 'test',
          additionalInfo: {
            timestamp: new Date().toISOString(),
            uid: authResult.user.uid,
            isAnonymous: authResult.user.isAnonymous,
            provider: 'anonymous',
            operationId: `auth-${Date.now()}`
          }
        });
        
        console.log('Anonymous auth successful:', authResult.user.uid);
        return true;
      } else {
        // Log already authenticated
        logAuthOperation(LogLevel.INFO, 'User already authenticated', {
          operationType: 'test',
          additionalInfo: {
            timestamp: new Date().toISOString(),
            uid: auth.currentUser.uid,
            isAnonymous: auth.currentUser.isAnonymous,
            provider: auth.currentUser.providerId || 'unknown',
            operationId: `auth-${Date.now()}`
          }
        });
        
        console.log('User already authenticated:', auth.currentUser.uid);
        return true;
      }
    } catch (authError: any) {
      // Special handling for common Firebase auth errors
      if (authError.code === 'auth/configuration-not-found') {
        console.error('Firebase authentication failed: Configuration not found. Check Firebase configuration.');
      } else if (authError.code === 'auth/internal-error') {
        console.error('Firebase authentication failed: Internal error. Firebase may not be properly initialized.');
      } else {
        console.error('Anonymous auth failed:', authError.code, authError.message);
      }
      
      // Log authentication failure
      logFirestoreError(LogCategory.AUTH, 'Anonymous authentication failed', authError as Error, {
        operationType: 'test',
        additionalInfo: {
          timestamp: new Date().toISOString(),
          operationId: `auth-${Date.now()}`,
          attempted: 'anonymous-auth',
          errorCode: authError.code || 'unknown'
        }
      });
      
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
      
      // Create a unique test ID for this operation
      const testId = `op-${Date.now()}`;
      
      // Log Firestore operation using enhanced logger
      logPreferenceOperation(LogLevel.INFO, 'Firestore Test: Writing Data', {
        documentPath: docRef.path,
        operationType: 'write',
        data: { keys: Object.keys(data) },
        additionalInfo: {
          testId,
          timestamp: new Date().toISOString(),
          authState: auth.currentUser ? {
            uid: auth.currentUser.uid,
            isAnonymous: auth.currentUser.isAnonymous
          } : 'not_authenticated'
        }
      });
      
      // Check auth if required
      if (mergedOptions.requireAuth && !auth.currentUser && mergedOptions.retryWithAnonymousAuth) {
        console.log('No authenticated user, attempting anonymous auth...');
        await attemptAnonymousAuth();
      }
      
      // Main write attempt
      await setDoc(docRef, enhancedData);
      console.log(`Successfully wrote to ${docRef.path}`);
      
      // Log success with the enhanced logger
      logSuccess(LogCategory.PREFERENCE, 'Firestore Test: Write Operation Successful', {
        documentPath: docRef.path,
        operationType: 'write',
        additionalInfo: {
          testId,
          timestamp: new Date().toISOString(),
          documentId: docRef.id
        }
      });
      
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
            
            // Log retry attempt using the enhanced logger
            logPreferenceOperation(LogLevel.INFO, 'Firestore Test: Retrying Write Operation', {
              documentPath: docRef.path,
              operationType: 'write',
              errorCode: firestoreError.code,
              additionalInfo: {
                testId: `retry-${Date.now()}`,
                timestamp: new Date().toISOString(),
                originalError: firestoreError.code,
                dataKeys: Object.keys(data),
                retryReason: 'authentication_fix'
              }
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
      
      // Create a unique test ID for this read operation
      const readTestId = `read-${Date.now()}`;
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      // Log read operation using enhanced logger
      logPreferenceOperation(LogLevel.INFO, 'Firestore Test: Reading Data', {
        documentPath: docRef.path,
        operationType: 'read',
        additionalInfo: {
          testId: readTestId,
          timestamp: new Date().toISOString(),
          authState: currentUser ? {
            uid: currentUser.uid,
            isAnonymous: currentUser.isAnonymous
          } : 'not_authenticated'
        }
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
        
        // Log successful read with enhanced logger
        logSuccess(LogCategory.PREFERENCE, 'Firestore Test: Read Operation Successful', {
          documentPath: docRef.path,
          operationType: 'read',
          additionalInfo: {
            testId: readTestId,
            timestamp: new Date().toISOString(),
            documentExists: true,
            dataSize: JSON.stringify(docSnap.data()).length
          }
        });
        
        return docSnap.data() as T;
      } else {
        console.log(`No document found at ${docRef.path}`);
        
        // Log document not found with enhanced logger
        logPreferenceOperation(LogLevel.INFO, 'Firestore Test: Document Not Found', {
          documentPath: docRef.path,
          operationType: 'read',
          additionalInfo: {
            testId: readTestId,
            timestamp: new Date().toISOString(),
            documentExists: false
          }
        });
        
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