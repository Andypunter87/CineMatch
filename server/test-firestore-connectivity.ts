import { getFirestoreDb } from './firebase-admin';

/**
 * Test Firestore read/write operations to ensure connectivity and permissions
 */
async function testFirestoreConnectivity() {
  console.log('🔥 Testing Firestore connectivity...');
  
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.log('❌ Firestore not initialized');
      return;
    }

    // Test 1: Write test data
    const testUserId = 'test-user-123';
    const testData = {
      preferences: {
        favoriteGenres: ['Action', 'Comedy'],
        streamingServices: ['Netflix', 'Disney+'],
        country: 'GB',
        timestamp: new Date()
      }
    };

    console.log('📝 Writing test data...');
    await db.collection('users').doc(testUserId).collection('preferences').doc('test').set(testData.preferences);
    console.log('✅ Write successful');

    // Test 2: Read test data back
    console.log('📖 Reading test data...');
    const doc = await db.collection('users').doc(testUserId).collection('preferences').doc('test').get();
    
    if (doc.exists) {
      console.log('✅ Read successful');
      console.log('📄 Data retrieved:', doc.data());
    } else {
      console.log('❌ No data found after write');
    }

    // Test 3: Write onboarding ratings
    console.log('📝 Writing onboarding ratings test...');
    const ratingsData = {
      movieId: 'test-movie-123',
      rating: 4.5,
      timestamp: new Date(),
      userId: testUserId
    };

    await db.collection('users').doc(testUserId).collection('onboardingRatings').doc('test-rating').set(ratingsData);
    console.log('✅ Onboarding ratings write successful');

    // Test 4: Read onboarding ratings
    console.log('📖 Reading onboarding ratings...');
    const ratingsDoc = await db.collection('users').doc(testUserId).collection('onboardingRatings').doc('test-rating').get();
    
    if (ratingsDoc.exists) {
      console.log('✅ Onboarding ratings read successful');
      console.log('📄 Ratings data:', ratingsDoc.data());
    } else {
      console.log('❌ No ratings data found');
    }

    // Test 5: Test recommendation system data path
    console.log('📝 Writing recommendation feedback test...');
    const feedbackData = {
      movieId: 'test-movie-456',
      liked: true,
      timestamp: new Date(),
      userId: testUserId
    };

    await db.collection('users').doc(testUserId).collection('recommendationFeedback').doc('test-feedback').set(feedbackData);
    console.log('✅ Recommendation feedback write successful');

    // Test 6: Clean up test data
    console.log('🧹 Cleaning up test data...');
    await db.collection('users').doc(testUserId).collection('preferences').doc('test').delete();
    await db.collection('users').doc(testUserId).collection('onboardingRatings').doc('test-rating').delete();
    await db.collection('users').doc(testUserId).collection('recommendationFeedback').doc('test-feedback').delete();
    console.log('✅ Cleanup successful');

    console.log('\n🎉 All Firestore tests passed! Database connectivity is working properly.');

  } catch (error) {
    console.error('❌ Firestore test failed:', error);
    
    if (error.code === 'permission-denied') {
      console.log('\n🔒 Permission denied - this indicates security rules are blocking access.');
      console.log('This is expected behavior if rules are restrictive.');
    } else if (error.code === 'unauthenticated') {
      console.log('\n🚫 Authentication failed - Firebase Admin SDK may not be configured correctly.');
    } else {
      console.log('\n⚠️ Unexpected error - check Firebase configuration and network connectivity.');
    }
  }
}

// Test legacy collection access
async function testLegacyCollections() {
  console.log('\n🔍 Testing legacy collection access...');
  
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.log('❌ Firestore not initialized');
      return;
    }

    const testUserId = 'test-user-456';
    
    // Test legacy onboarding_ratings collection
    const legacyRating = {
      userId: testUserId,
      movieId: 'legacy-movie-123',
      rating: 3.5,
      timestamp: new Date()
    };

    await db.collection('onboarding_ratings').doc('test-legacy').set(legacyRating);
    console.log('✅ Legacy onboarding_ratings write successful');

    const legacyDoc = await db.collection('onboarding_ratings').doc('test-legacy').get();
    if (legacyDoc.exists) {
      console.log('✅ Legacy onboarding_ratings read successful');
    }

    // Cleanup
    await db.collection('onboarding_ratings').doc('test-legacy').delete();
    console.log('✅ Legacy cleanup successful');

  } catch (error) {
    console.error('❌ Legacy collection test failed:', error);
  }
}

// Run the tests
async function runAllTests() {
  await testFirestoreConnectivity();
  await testLegacyCollections();
}

runAllTests();