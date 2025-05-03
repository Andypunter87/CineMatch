import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth, onAuthStateChanged } from "firebase/auth";
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

export { app, auth, db, googleProvider };