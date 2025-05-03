import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
import { ReactNode, createContext, useContext } from 'react';

// Create a context for Firebase Auth state
interface FirebaseAuthContextType {
  isFirebaseAuthenticated: boolean;
  isInitializing: boolean;
  error: Error | null;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | null>(null);

interface FirebaseAuthProviderProps {
  children: ReactNode;
}

/**
 * Provider component that makes Firebase authentication state accessible throughout the app
 */
export function FirebaseAuthProvider({ children }: FirebaseAuthProviderProps) {
  const { isFirebaseAuthenticated, isInitializing, error } = useFirebaseAuth();
  
  return (
    <FirebaseAuthContext.Provider
      value={{ isFirebaseAuthenticated, isInitializing, error }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
}

/**
 * Hook to use Firebase authentication status
 */
export function useFirebaseAuthStatus() {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuthStatus must be used within a FirebaseAuthProvider');
  }
  return context;
}