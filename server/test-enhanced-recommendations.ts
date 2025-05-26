/**
 * Test script for Enhanced Recommendation Logic
 * 
 * This script tests the new recommendation functions to ensure they work correctly
 * with the Firestore data structure and weighted scoring system.
 */

import { getUserPreferenceProfile, getBlendedSessionProfile, getTopRecommendations } from '../lib/recommendation.js';

/**
 * Test function to verify the enhanced recommendation functionality
 */
async function testEnhancedRecommendations() {
  try {
    console.log('🎬 Testing Enhanced Recommendation Logic');
    console.log('=======================================');
    
    // Test user ID (using the current test user from the logs)
    const testUserId = '51';
    
    console.log(`\n1. Testing getUserPreferenceProfile for user ${testUserId}:`);
    const userProfile = await getUserPreferenceProfile(testUserId);
    console.log(`✓ Profile built with ${Object.keys(userProfile).length} movies`);
    
    if (Object.keys(userProfile).length > 0) {
      console.log('Sample profile data:', Object.entries(userProfile).slice(0, 3));
    }
    
    console.log(`\n2. Testing getTopRecommendations:`);
    const topMovies = getTopRecommendations(userProfile, 5);
    console.log(`✓ Top 5 recommendations: ${topMovies.join(', ')}`);
    
    console.log(`\n3. Testing getBlendedSessionProfile (simulated with same user):`);
    const blendedProfile = await getBlendedSessionProfile(testUserId, testUserId);
    console.log(`✓ Blended profile built with ${Object.keys(blendedProfile).length} movies`);
    
    console.log('\n🎉 All enhanced recommendation tests completed successfully!');
    
    return {
      success: true,
      userProfileCount: Object.keys(userProfile).length,
      topRecommendations: topMovies,
      blendedProfileCount: Object.keys(blendedProfile).length
    };
    
  } catch (error) {
    console.error('❌ Error testing enhanced recommendations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in other files
export { testEnhancedRecommendations };

// Run the test if this file is executed directly
if (require.main === module) {
  testEnhancedRecommendations()
    .then(result => {
      console.log('\nTest Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}