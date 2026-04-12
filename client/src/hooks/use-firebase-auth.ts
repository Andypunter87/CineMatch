// Firebase auth is no longer used — Google SSO is handled via Passport.js OAuth flow.
// This stub is kept to avoid breaking any remaining imports during transition.

export function useFirebaseAuth() {
  return {
    isFirebaseAuthenticated: false,
    isInitializing: false,
    error: null,
  };
}
