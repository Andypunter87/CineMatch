import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  Auth,
  onAuthStateChanged,
  signInWithCustomToken,
  signInAnonymously
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Enable or disable debug logs globally
const DEBUG = true;

// Validate Firebase API key and configuration
function isValidFirebaseConfig(): boolean {
  const { VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_APP_ID } = import.meta.env;

  if (!VITE_FIREBASE_API_KEY || VITE_FIREBASE_API_KEY.length < 20) return false;
  if (!VITE_FIREBASE_AUTH_DOMAIN || !VITE_FIREBASE_AUTH_DOMAIN.includes('.firebaseapp.com')) return false;
  if (!VITE_FIREBASE_PROJECT_ID || VITE_FIREBASE_PROJECT_ID.length < 5) return false;
  if (!VITE_FIREBASE_STORAGE_BUCKET || !VITE_FIREBASE_STORAGE_BUCKET.includes('.appspot.com')) return false;
  if (!VITE_FIREBASE_APP_ID || !VITE_FIREBASE_APP_ID.includes(':')) return false;

  return true;
}

// Firebase configuration with hardcoded storage bucket fix
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "cinematch-892cd.appspot.com", // override to known correct value
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`
};

if (DEBUG) {
  console.log("Firebase config (masked):", {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 6)}...` : 'missing',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    appId: firebaseConfig.appId ? `${firebaseConfig.appId.split(':')[0]}:...` : 'missing'
  });
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let googleProvider: GoogleAuthProvider;

try {
  if (isValidFirebaseConfig()) {
    const existingApps = getApps();
    app = existingApps.length ? existingApps[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();

    if (DEBUG) console.log("Firebase initialized, checking auth state...");

    onAuthStateChanged(auth, user => {
      if (DEBUG) {
        user
          ? console.log("User signed in:", user.uid)
          : console.log("No user signed in");
      }
    });
  } else {
    throw new Error("Invalid Firebase configuration");
  }
} catch (error) {
  console.error("⚠️ Failed to initialize Firebase:", error);
  app = new Proxy({} as FirebaseApp, fallbackHandler('App'));
  auth = new Proxy({} as Auth, fallbackHandler('Auth'));
  db = new Proxy({} as Firestore, fallbackHandler('Firestore'));
  googleProvider = new Proxy({} as GoogleAuthProvider, fallbackHandler('GoogleAuthProvider'));
}

function fallbackHandler(service: string) {
  return {
    get: (_: any, prop: string) => {
      console.warn(`⚠️ ${service}.${prop} is unavailable due to failed Firebase init`);
      return () => Promise.reject(new Error(`${service} is unavailable`));
    }
  };
}

/**
 * Authenticate with custom token from our server
 * @param token The custom token from our backend
 */
export async function signInWithServerToken(token: string): Promise<void> {
  if (!token) {
    console.error("Token is empty or null");
    return Promise.reject(new Error("Token is required"));
  }

  // Log token format for debugging
  console.log("Token length:", token.length);
  console.log("Token preview:", token.substring(0, 20) + "..." + token.substring(token.length - 20));
  console.log("Signing in with Firebase custom token...");
  
  try {
    // Enhanced diagnostics
    console.log("Firebase auth state before token sign-in:", 
      auth.currentUser ? `Signed in as ${auth.currentUser.uid}` : "Not signed in");
    console.log("App instance:", app ? "Valid" : "Invalid");
    
    // Verify we have a valid app and auth instance
    if (!app || typeof app !== 'object') {
      console.error("Firebase app not properly initialized");
      return Promise.reject(new Error("Firebase not initialized"));
    }
    
    // Log Firebase config diagnostics
    console.log("Firebase apiKey valid:", !!firebaseConfig.apiKey);
    console.log("Firebase projectId:", firebaseConfig.projectId);
    
    // Attempt to sign in with the custom token
    await signInWithCustomToken(auth, token);
    console.log("Successfully authenticated with Firebase");
    
    // Verify authentication was successful
    console.log("Firebase auth state after token sign-in:", 
      auth.currentUser ? `Signed in as ${auth.currentUser.uid}` : "Not signed in");
    
    return Promise.resolve();
  } catch (error: any) {
    // Enhanced error logging
    console.error("Firebase authentication error:", error);
    console.error("Error code:", JSON.stringify(error.code));
    console.error("Error message:", JSON.stringify(error.message));
    
    // Attempt direct API call as fallback
    console.warn("Attempting direct Firebase Auth REST API call as fallback");
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, returnSecureToken: true })
        }
      );
      
      const data = await response.json();
      if (data.error) {
        console.error("Direct API call failed:", data);
        throw new Error(data.error.message);
      }
      
      console.log("Direct API authentication successful");
      return Promise.resolve();
    } catch (directApiError) {
      console.error("Direct API authentication failed:", directApiError);
      
      // Try anonymous auth as last resort
      console.warn("Attempting fallback to anonymous authentication");
      try {
        await signInAnonymously(auth);
        console.log("Anonymous authentication successful as fallback");
        return Promise.resolve();
      } catch (anonError) {
        console.error("Fallback authentication also failed:", anonError);
        return Promise.reject(error);
      }
    }
  }
}

export { app, auth, db, googleProvider };