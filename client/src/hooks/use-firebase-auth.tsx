// Firebase-based Google auth is replaced with Passport.js OAuth flow.
// This stub is kept to avoid breaking imports during the transition.

export function useFirebaseAuth() {
  return {
    signInWithGoogle: async () => {
      window.location.href = "/api/auth/google";
    },
    signOut: async () => {},
  };
}
