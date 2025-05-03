import { useEffect, useState } from 'react';
import { useAuth } from './use-auth';
import { signInWithServerToken } from '@/lib/firebase';
import { queryClient } from '@/lib/queryClient';

// Extend the User type to include our custom fields
interface ExtendedUser {
  firebaseToken?: string; 
  [key: string]: any;
}

/**
 * Hook to handle Firebase authentication sync with Express session
 * This hook bridges the gap between Express authentication and Firebase authentication
 */
export function useFirebaseAuth() {
  const { user } = useAuth();
  const [isFirebaseAuthenticated, setIsFirebaseAuthenticated] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Process the user data when it's loaded
  useEffect(() => {
    if (!user) {
      // If user is logged out, we need to reset the Firebase auth state too
      // This could involve signOut from Firebase, but for our purposes
      // just updating the authenticated state is enough
      setIsFirebaseAuthenticated(false);
      setIsInitializing(false);
      return;
    }
    
    // Check if we have a Firebase token in the user object
    // This would come from the Express server
    const extendedUser = user as ExtendedUser;
    const firebaseToken = extendedUser.firebaseToken;
    
    if (!firebaseToken) {
      console.log('No Firebase token available in user data');
      setIsFirebaseAuthenticated(false);
      setIsInitializing(false);
      return;
    }

    // Process Firebase token
    async function authenticateWithFirebase() {
      try {
        await signInWithServerToken(firebaseToken);
        setIsFirebaseAuthenticated(true);
        setError(null);
      } catch (err) {
        console.error('Error authenticating with Firebase:', err);
        setIsFirebaseAuthenticated(false);
        setError(err instanceof Error ? err : new Error('Unknown error occurred during Firebase authentication'));
      } finally {
        setIsInitializing(false);
      }
    }

    authenticateWithFirebase();
  }, [user]);
  
  // Subscribe to auth state changes
  useEffect(() => {
    // Re-fetch user data when authentication status changes
    // This allows us to fetch the latest Firebase token if needed
    if (!isInitializing) {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    }
  }, [isFirebaseAuthenticated, isInitializing]);
  
  return {
    isFirebaseAuthenticated,
    isInitializing,
    error
  };
}