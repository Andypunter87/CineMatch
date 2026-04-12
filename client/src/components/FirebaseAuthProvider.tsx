import { ReactNode, createContext, useContext } from 'react';

interface FirebaseAuthContextType {
  isFirebaseAuthenticated: boolean;
  isInitializing: boolean;
  error: Error | null;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType>({
  isFirebaseAuthenticated: false,
  isInitializing: false,
  error: null,
});

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  return (
    <FirebaseAuthContext.Provider
      value={{ isFirebaseAuthenticated: false, isInitializing: false, error: null }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuthStatus() {
  return useContext(FirebaseAuthContext);
}
