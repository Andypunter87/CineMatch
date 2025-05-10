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
  storageBucket: "cinematch-892cd.appspot.com", // Hardcoding the correct value
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('Raw Firebase environment variables:', {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? 'present' : 'missing',
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID ? 'present' : 'missing',
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'missing',
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'missing'
});

// Log the entire Firebase config (without sensitive parts) for debugging
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 6)}...` : 'missing',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket || 'missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? 'present' : 'missing',
  appId: firebaseConfig.appId ? `${firebaseConfig.appId.split(':')[0]}:...` : 'missing'
});

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
    
    // Complete Firebase configuration with all required fields 
    // to fix auth/configuration-not-found error
    const completeFirebaseConfig = {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId || '000000000000', // Provide a fallback
      appId: firebaseConfig.appId,
      // Include other fields that might be required
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
      databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
    };
    
    console.log("Using complete Firebase config object:", {
      ...completeFirebaseConfig,
      apiKey: '[REDACTED]',
      appId: '[REDACTED]'
    });
    
    // Check if firebase is already initialized
    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        console.log("Firebase already initialized, reusing existing app");
        app = existingApps[0];
      } else {
        console.log("No existing Firebase app found, creating new app");
        app = initializeApp(completeFirebaseConfig);
      }
    } catch (initError) {
      console.error("Error checking existing apps:", initError);
      console.log("Attempting to initialize Firebase with complete config");
      app = initializeApp(completeFirebaseConfig);
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
  
  // Special handling for configuration-not-found error
  if (error instanceof Error && error.message.includes('configuration-not-found')) {
    console.error("FIREBASE CONFIG ERROR: This error often indicates that:");
    console.error("1. The Firebase API key doesn't match the project");
    console.error("2. The App ID doesn't match the Firebase project");
    console.error("3. There might be a permission issue with the Firebase project");
    console.error("Please verify your Firebase console settings and ensure all values match");
  }
  
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
    console.log("Processing Firebase custom token from server");
    
    if (!token) {
      console.error("No token provided");
      throw new Error("No Firebase token provided");
    }
    
    // Log details about the token for debugging (without exposing the full token)
    console.log(`Token length: ${token.length}`);
    console.log(`Token preview: ${token.substring(0, 20)}...${token.substring(token.length - 20)}`);
    
    try {
      // Check if we're already signed in to Firebase
      if (auth.currentUser) {
        console.log(`Already authenticated with Firebase as: ${auth.currentUser.uid}`);
        // Since the token might be refreshed, we should sign in again with the new token
        await auth.signOut();
        console.log("Signed out from previous Firebase session");
      }
      
      // Sign in with the custom token using Firebase SDK
      console.log("Signing in with Firebase custom token...");
      const userCredential = await signInWithCustomToken(auth, token);
      
      // Store the user ID in localStorage for Firestore security rules
      const uid = userCredential.user.uid;
      localStorage.setItem('customAuthUserId', uid);
      
      console.log(`Successfully authenticated with Firebase as UID: ${uid}`);
      
      // Verify that the user is actually signed in
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log(`Confirmed Firebase auth - current user: ${currentUser.uid}`);
      } else {
        console.warn("Warning: auth.currentUser is null even after successful sign in");
      }
      
    } catch (firebaseError) {
      console.error("Firebase authentication error:", firebaseError);
      
      // Additional error diagnosis 
      if (firebaseError instanceof Error) {
        console.error("FIREBASE ERROR DIAGNOSIS:");
        
        // Common Firebase auth errors
        const errorCode = (firebaseError as any).code || 'unknown';
        const errorMessage = firebaseError.message || 'Unknown error';
        
        console.error("Error code:", JSON.stringify(errorCode));
        console.error("Error message:", JSON.stringify(errorMessage));
        
        // If we have a configuration-not-found error, try a direct API call
        if (errorCode === 'auth/configuration-not-found') {
          console.warn("Attempting direct Firebase Auth REST API call as fallback");
          
          try {
            // Extract the JWT payload to get user ID
            const extractUserId = (jwt: string): string | null => {
              try {
                const parts = jwt.split('.');
                if (parts.length !== 3) return null;
                const payload = JSON.parse(atob(parts[1]));
                return payload.uid || payload.sub || null;
              } catch (e) {
                return null;
              }
            };
            
            const uid = extractUserId(token);
            if (!uid) {
              throw new Error("Could not extract user ID from token");
            }
            
            // Store the UID for Firestore operations
            localStorage.setItem('customAuthUserId', uid);
            console.log(`Using extracted UID ${uid} for Firestore operations`);
            
            // Try a direct API call to exchange the custom token
            const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
            if (!apiKey) {
              throw new Error("Firebase API Key is missing");
            }
            
            console.log("Attempting direct API call to signInWithCustomToken endpoint");
            const response = await fetch(
              `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token,
                  returnSecureToken: true,
                }),
              }
            );
            
            if (!response.ok) {
              const errorData = await response.json();
              console.error("Direct API call failed:", errorData);
              throw new Error(`Direct API call failed: ${errorData.error?.message || 'Unknown error'}`);
            }
            
            const authData = await response.json();
            console.log("Direct API call succeeded:", {
              idToken: authData.idToken ? `${authData.idToken.substring(0, 10)}...` : 'missing',
              refreshToken: authData.refreshToken ? 'present' : 'missing',
              expiresIn: authData.expiresIn,
            });
            
            // Store the tokens locally
            localStorage.setItem('firebaseIdToken', authData.idToken);
            localStorage.setItem('firebaseRefreshToken', authData.refreshToken);
            
            console.log("Successfully authenticated via direct API call");
            return; // Exit early since we've handled authentication
          } catch (directApiError) {
            console.error("Direct API authentication failed:", directApiError);
          }
        }
        
        // If we get here, try anonymous auth as a last resort
        try {
          console.warn("Attempting fallback to anonymous authentication");
          await signInAnonymously(auth);
          
          // Extract user ID from a JWT token
          const extractUserId = (jwt: string): string | null => {
            try {
              // Get the payload part (second segment) of the JWT
              const parts = jwt.split('.');
              if (parts.length !== 3) return null;
              
              // Decode the payload
              const payload = JSON.parse(atob(parts[1]));
              return payload.uid || payload.sub || null;
            } catch (e) {
              return null;
            }
          };
          
          // Try to extract the UID from the token
          const uid = extractUserId(token) || 'unknown';
          localStorage.setItem('customAuthUserId', uid);
          console.log(`Fallback: using extracted UID ${uid} for Firestore operations`);
        } catch (fallbackError) {
          console.error("Fallback authentication also failed:", fallbackError);
          throw new Error(`Firebase authentication failed: ${errorMessage}`);
        }
      }
    }
  } catch (error) {
    console.error("Error processing token:", error);
    throw error;
  }
}

export { app, auth, db, googleProvider };