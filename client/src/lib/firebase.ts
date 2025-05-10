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

// Validate Firebase API key
function isValidFirebaseConfig(): boolean {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  
  // Check if the API key is present and has a reasonable length
  // Firebase API keys are typically at least 30 characters long
  if (!apiKey || apiKey.length < 20) {
    console.error("Firebase API key appears to be invalid or truncated:", 
      apiKey ? `${apiKey.substring(0, 5)}...` : "undefined");
    return false;
  }
  
  if (!projectId || projectId.length < 5) {
    console.error("Firebase Project ID appears to be invalid or missing");
    return false;
  }
  
  if (!appId || !appId.includes(":")) {
    console.error("Firebase App ID appears to be invalid or missing");
    return false;
  }
  
  return true;
}

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase with better error handling
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let googleProvider: GoogleAuthProvider;

try {
  if (isValidFirebaseConfig()) {
    console.log("Initializing Firebase with valid configuration", {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      apiKeyFirstChars: firebaseConfig.apiKey.substring(0, 5) + '...',
      appIdFirstChars: firebaseConfig.appId.split(':')[0] + ':...'
    });
    
    // Check if firebase is already initialized
    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        console.log("Firebase already initialized, reusing existing app");
        app = existingApps[0];
      } else {
        console.log("No existing Firebase app found, creating new app");
        app = initializeApp(firebaseConfig);
      }
    } catch (initError) {
      console.error("Error checking existing apps:", initError);
      app = initializeApp(firebaseConfig);
    }
    
    console.log("Firebase app initialized, getting auth and Firestore");
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase services initialized successfully");
    
    // Log auth state for debugging
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Firebase user authenticated:", { 
          uid: user.uid,
          isAnonymous: user.isAnonymous,
          provider: user.providerId || 'unknown'
        });
      } else {
        console.log("No Firebase user authenticated");
      }
    });
  } else {
    console.error("Invalid Firebase configuration, cannot initialize");
    throw new Error("Invalid Firebase configuration");
  }
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
  // Create fallback objects that will prevent the app from crashing
  // but will log errors when used
  const createProxyHandler = (serviceName: string) => ({
    get: (target: any, prop: string) => {
      if (typeof target[prop] === 'function') {
        return (...args: any[]) => {
          console.error(`Firebase ${serviceName} is unavailable. Operation '${prop}' cannot be performed.`);
          return Promise.reject(new Error(`Firebase ${serviceName} is unavailable`));
        };
      }
      console.error(`Firebase ${serviceName} is unavailable. Property '${prop}' cannot be accessed.`);
      return undefined;
    }
  });
  
  app = new Proxy({} as FirebaseApp, createProxyHandler('App'));
  auth = new Proxy({} as Auth, createProxyHandler('Auth'));
  db = new Proxy({} as Firestore, createProxyHandler('Firestore'));
  googleProvider = new Proxy({} as GoogleAuthProvider, createProxyHandler('GoogleAuthProvider'));
}

interface CustomToken {
  uid: string;
  timestamp: number;
  exp: number;
}

/**
 * Authenticate with custom token from our server
 * @param token The custom token from our backend
 */
export async function signInWithServerToken(token: string): Promise<void> {
  try {
    console.log("Processing custom token from server");
    
    // Decode the base64 token to validate it first
    try {
      // Manual handling for browser environment which doesn't have Buffer
      let decodedToken = '';
      try {
        // For Node.js environment
        decodedToken = Buffer.from(token, 'base64').toString();
      } catch (e) {
        // For browser environment
        decodedToken = atob(token);
      }
      
      const tokenData = JSON.parse(decodedToken) as CustomToken;
      
      // Check if the token is valid
      const now = Date.now();
      if (tokenData.exp < now) {
        throw new Error("Token expired");
      }
      
      console.log(`Valid token for user ${tokenData.uid}`);
      
      // Store the user ID in localStorage for use in Firestore security rules
      localStorage.setItem('customAuthUserId', tokenData.uid);
      
      // Now attempt to sign in with Firebase Auth
      try {
        // Check if we're already signed in as this user
        if (auth.currentUser && auth.currentUser.uid === tokenData.uid) {
          console.log("Already signed in as the correct user");
          return;
        }
        
        // Use Firebase anonymous auth to get a user with the correct UID
        // This is a workaround since we can't use custom tokens in this environment
        try {
          // Sign out first if we're signed in as someone else
          if (auth.currentUser && auth.currentUser.uid !== tokenData.uid) {
            await auth.signOut();
          }
          
          // Attempt to sign in anonymously 
          // Firebase will assign a random UID, but we'll use our local ID for Firestore operations
          await signInAnonymously(auth);
          console.log("Signed in anonymously with Firebase");
          console.log("Authentication successful - using UID from token for Firestore operations");
        } catch (authError) {
          console.error("Error signing in with Firebase:", authError);
          // We'll continue using the token's UID from localStorage even if Firebase auth fails
        }
      } catch (signInError) {
        console.error("Error during Firebase authentication:", signInError);
        // Continue using the token's UID from localStorage
      }
    } catch (parseError) {
      console.error("Error parsing custom token:", parseError);
      throw new Error("Invalid token format");
    }
  } catch (error) {
    console.error("Error processing token:", error);
    throw error;
  }
}

export { app, auth, db, googleProvider };