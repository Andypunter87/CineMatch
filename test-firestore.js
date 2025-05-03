// Script to test Firestore operations during onboarding
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, query, where, getDocs } = require('firebase/firestore');

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Test function to validate Firestore configuration
async function testFirestoreConfig() {
  console.log('=======================================');
  console.log('FIRESTORE CONFIGURATION TEST');
  console.log('=======================================');
  
  // Log Firebase configuration (without exposing full API key)
  console.log('Firebase Project ID:', process.env.VITE_FIREBASE_PROJECT_ID);
  console.log('Firebase App ID:', process.env.VITE_FIREBASE_APP_ID);
  
  // Only show first few characters of API key for security
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  console.log('Firebase API Key:', apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 3)}` : 'Not set');
  
  // Validate configuration
  if (!process.env.VITE_FIREBASE_API_KEY || !process.env.VITE_FIREBASE_PROJECT_ID || !process.env.VITE_FIREBASE_APP_ID) {
    console.error('ERROR: Missing Firebase configuration. Please check environment variables.');
    return false;
  }
  
  console.log('Firebase configuration appears valid.');
  return true;
}

// Initialize Firebase and test document access
async function testFirestoreConnection() {
  console.log('=======================================');
  console.log('FIRESTORE CONNECTION TEST');
  console.log('=======================================');
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully.');
    
    // Initialize Firestore
    const db = getFirestore(app);
    console.log('Firestore initialized successfully.');
    
    // Try to access a test document to verify connection
    const testDocRef = doc(db, 'test_collection', 'test_doc');
    try {
      const docSnap = await getDoc(testDocRef);
      console.log('Successfully connected to Firestore.');
      console.log('Test document exists:', docSnap.exists());
      return { success: true, db };
    } catch (error) {
      console.error('Error accessing Firestore:', error.code, error.message);
      return { success: false, error };
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return { success: false, error };
  }
}

// Test querying user preferences in Firestore
async function testQueryUserPreferences(db, userId) {
  console.log('=======================================');
  console.log(`QUERY USER PREFERENCES TEST (User ID: ${userId})`);
  console.log('=======================================');
  
  try {
    // First, try direct document access with user ID
    const directDocRef = doc(db, 'user_preferences', `user-${userId}`);
    const directDocSnap = await getDoc(directDocRef);
    
    console.log(`Collection path: user_preferences/${`user-${userId}`}`);
    console.log('Document exists via direct ID:', directDocSnap.exists());
    
    if (directDocSnap.exists()) {
      console.log('Document data:', JSON.stringify(directDocSnap.data(), null, 2));
      return { success: true, data: directDocSnap.data() };
    }
    
    // If direct access fails, try querying by userId field
    console.log('Direct access failed, attempting query by userId field...');
    const prefsCollection = collection(db, 'user_preferences');
    const q = query(prefsCollection, where('userId', '==', userId));
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.log('No user preferences found for this user ID.');
      return { success: false, error: 'No documents found' };
    }
    
    console.log(`Found ${querySnapshot.size} document(s) matching userId:${userId}`);
    
    querySnapshot.forEach((doc) => {
      console.log(`Document ID: ${doc.id}`);
      console.log('Document data:', JSON.stringify(doc.data(), null, 2));
    });
    
    return { 
      success: true, 
      count: querySnapshot.size,
      data: querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) 
    };
  } catch (error) {
    console.error('Error querying user preferences:', error.code, error.message);
    return { success: false, error };
  }
}

// Test querying onboarding ratings in Firestore
async function testQueryOnboardingRatings(db, userId) {
  console.log('=======================================');
  console.log(`QUERY ONBOARDING RATINGS TEST (User ID: ${userId})`);
  console.log('=======================================');
  
  try {
    // Query onboarding ratings by userId
    const ratingsCollection = collection(db, 'onboarding_ratings');
    const q = query(ratingsCollection, where('userId', '==', userId));
    
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} onboarding rating(s) for user ID:${userId}`);
    
    if (querySnapshot.empty) {
      console.log('No onboarding ratings found for this user ID.');
      return { success: false, error: 'No documents found' };
    }
    
    const ratings = [];
    querySnapshot.forEach((doc) => {
      console.log(`Document ID: ${doc.id}`);
      console.log('Document data:', JSON.stringify(doc.data(), null, 2));
      ratings.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, count: querySnapshot.size, data: ratings };
  } catch (error) {
    console.error('Error querying onboarding ratings:', error.code, error.message);
    return { success: false, error };
  }
}

// Main test function
async function runFirestoreTests() {
  console.log('=======================================');
  console.log('FIRESTORE ONBOARDING INTEGRATION TEST');
  console.log('=======================================');
  console.log('Starting test:', new Date().toISOString());
  
  // Test configuration
  const configValid = await testFirestoreConfig();
  if (!configValid) {
    console.error('Test aborted due to invalid configuration.');
    return;
  }
  
  // Test connection
  const { success, db, error } = await testFirestoreConnection();
  if (!success) {
    console.error('Test aborted due to connection failure:', error);
    return;
  }
  
  // Test with a specific user ID (this would be the ID of the test user)
  // You can replace this with the actual user ID from your test
  const testUserId = 40; // Replace with actual test user ID
  
  // Test querying user preferences
  await testQueryUserPreferences(db, testUserId);
  
  // Test querying onboarding ratings
  await testQueryOnboardingRatings(db, testUserId);
  
  console.log('=======================================');
  console.log('TEST COMPLETE');
  console.log('=======================================');
}

// Run the tests
runFirestoreTests().catch(console.error);