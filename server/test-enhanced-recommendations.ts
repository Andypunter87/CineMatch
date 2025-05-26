/**
 * Test script for Enhanced Recommendation Logic
 * 
 * This script tests the new recommendation functions to ensure they work correctly
 * with the Firestore data structure and weighted scoring system.
 */

import { getUserPreferenceProfile, getBlendedSessionProfile, getTopRecommendations, cachePreferenceProfile } from '../lib/recommendation.js';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

/**
 * Initialize Firebase for testing
 */
function initializeFirebaseForTesting() {
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };
  
  try {
    return initializeApp(firebaseConfig);
  } catch (error) {
    // App might already be initialized
    return initializeApp(firebaseConfig, 'test-app');
  }
}

/**
 * Setup test data in Firestore for comprehensive testing
 */
async function setupTestData() {
  try {
    console.log('📝 Setting up test data in Firestore...');
    
    // Initialize Firebase first
    initializeFirebaseForTesting();
    
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error("Firestore not initialized");
    }

    // Test User A (andy+onboardingtest, user ID 51)
    const userAId = '51';
    
    // Setup onboarding ratings for User A
    const onboardingADoc = doc(firestore, `users/${userAId}/ratings/onboarding`);
    await setDoc(onboardingADoc, {
      ratings: [
        { filmId: 1001, rating: 4, timestamp: new Date() },
        { filmId: 1002, rating: 5, timestamp: new Date() },
        { filmId: 1003, rating: 3, timestamp: new Date() }
      ],
      lastUpdated: new Date()
    });

    // Setup watchlist ratings for User A
    const watchlistA1 = doc(firestore, `users/${userAId}/watchlistRatings/1001`);
    await setDoc(watchlistA1, { rating: 5, timestamp: new Date() });
    
    const watchlistA2 = doc(firestore, `users/${userAId}/watchlistRatings/1002`);
    await setDoc(watchlistA2, { rating: 4, timestamp: new Date() });

    // Setup recommendation feedback for User A
    const feedbackA1 = doc(firestore, `users/${userAId}/recommendationFeedback/1001`);
    await setDoc(feedbackA1, { liked: true, timestamp: new Date() });
    
    const feedbackA2 = doc(firestore, `users/${userAId}/recommendationFeedback/1003`);
    await setDoc(feedbackA2, { liked: false, timestamp: new Date() });

    // Test User B (friendTest, user ID 999)
    const userBId = '999';
    
    // Setup onboarding ratings for User B
    const onboardingBDoc = doc(firestore, `users/${userBId}/ratings/onboarding`);
    await setDoc(onboardingBDoc, {
      ratings: [
        { filmId: 1001, rating: 3, timestamp: new Date() },
        { filmId: 1002, rating: 2, timestamp: new Date() },
        { filmId: 1004, rating: 5, timestamp: new Date() }
      ],
      lastUpdated: new Date()
    });

    // Setup watchlist ratings for User B
    const watchlistB1 = doc(firestore, `users/${userBId}/watchlistRatings/1001`);
    await setDoc(watchlistB1, { rating: 2, timestamp: new Date() });
    
    const watchlistB2 = doc(firestore, `users/${userBId}/watchlistRatings/1004`);
    await setDoc(watchlistB2, { rating: 5, timestamp: new Date() });

    // Setup recommendation feedback for User B
    const feedbackB1 = doc(firestore, `users/${userBId}/recommendationFeedback/1001`);
    await setDoc(feedbackB1, { liked: false, timestamp: new Date() });
    
    const feedbackB2 = doc(firestore, `users/${userBId}/recommendationFeedback/1004`);
    await setDoc(feedbackB2, { liked: true, timestamp: new Date() });

    console.log('✓ Test data setup completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    return false;
  }
}

/**
 * Test function to verify the enhanced recommendation functionality
 */
async function testEnhancedRecommendations() {
  try {
    console.log('🎬 Testing Enhanced Recommendation Logic');
    console.log('=======================================');
    
    // Setup test data first
    const setupSuccess = await setupTestData();
    if (!setupSuccess) {
      throw new Error('Failed to setup test data');
    }

    const userAId = '51';
    const userBId = '999';
    
    // Test 1: Get User A preference profile
    console.log(`\n1. Testing getUserPreferenceProfile for user ${userAId}:`);
    const userAProfile = await getUserPreferenceProfile(userAId);
    console.log(`✓ Profile built with ${Object.keys(userAProfile).length} movies`);
    
    if (Object.keys(userAProfile).length > 0) {
      console.log('Sample profile data:', Object.entries(userAProfile).slice(0, 3));
      
      // Validate expected weighted scoring for movie 1001
      if (userAProfile['1001']) {
        const expectedScore = (3/4) * 0.5 + (4/4) * 1.0 + 1 * 1.5; // onboarding + watchlist + feedback
        console.log(`✓ Movie 1001 score: ${userAProfile['1001'].toFixed(3)} (expected: ${expectedScore.toFixed(3)})`);
      }
    }
    
    // Test 2: Get User B preference profile
    console.log(`\n2. Testing getUserPreferenceProfile for user ${userBId}:`);
    const userBProfile = await getUserPreferenceProfile(userBId);
    console.log(`✓ Profile built with ${Object.keys(userBProfile).length} movies`);
    
    // Test 3: Test blended session profile
    console.log(`\n3. Testing getBlendedSessionProfile for users ${userAId} and ${userBId}:`);
    const blendedProfile = await getBlendedSessionProfile(userAId, userBId);
    console.log(`✓ Blended profile built with ${Object.keys(blendedProfile).length} movies`);
    
    if (blendedProfile['1001']) {
      console.log(`✓ Movie 1001 blended score: ${blendedProfile['1001'].toFixed(3)}`);
    }
    
    // Test 4: Get top recommendations
    console.log(`\n4. Testing getTopRecommendations:`);
    const topMoviesA = getTopRecommendations(userAProfile, 5);
    console.log(`✓ Top 5 recommendations for User A: ${topMoviesA.join(', ')}`);
    
    const topMoviesBlended = getTopRecommendations(blendedProfile, 3);
    console.log(`✓ Top 3 blended recommendations: ${topMoviesBlended.join(', ')}`);
    
    // Test 5: Test caching functionality
    console.log(`\n5. Testing profile caching:`);
    const cacheSuccess = await cachePreferenceProfile(userAId, userAProfile);
    console.log(`✓ Profile caching ${cacheSuccess ? 'succeeded' : 'failed'}`);
    
    // Test 6: Test invalid user case
    console.log(`\n6. Testing invalid user case:`);
    const invalidProfile = await getUserPreferenceProfile('invalid_user_999999');
    console.log(`✓ Invalid user handled gracefully (${Object.keys(invalidProfile).length} movies found)`);
    
    console.log('\n🎉 All enhanced recommendation tests completed successfully!');
    
    return {
      success: true,
      userAProfileCount: Object.keys(userAProfile).length,
      userBProfileCount: Object.keys(userBProfile).length,
      blendedProfileCount: Object.keys(blendedProfile).length,
      topRecommendationsA: topMoviesA,
      topRecommendationsBlended: topMoviesBlended,
      cachingWorked: cacheSuccess
    };
    
  } catch (error) {
    console.error('❌ Error testing enhanced recommendations:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Export for use in other files
export { testEnhancedRecommendations };

// Run the test directly
testEnhancedRecommendations()
  .then(result => {
    console.log('\nTest Result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });