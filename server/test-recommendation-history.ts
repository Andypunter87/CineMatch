import { storage } from "./storage";

/**
 * Test function to verify the recommendation history functionality
 */
async function testRecommendationHistory() {
  try {
    // Test user ID (this should be an existing user in your system)
    const userId = 1;
    
    // Get the current recommendation history
    const currentHistory = await storage.getUserLastRecommendations(userId);
    
    if (currentHistory) {
      console.log("Found existing recommendation history:");
      console.log("User ID:", currentHistory.userId);
      console.log("Created at:", currentHistory.createdAt);
      console.log("Updated at:", currentHistory.updatedAt);
      console.log("Preferences:", JSON.stringify(currentHistory.preferences, null, 2));
      console.log("Number of recommendations:", currentHistory.recommendations.length);
      console.log("First recommendation:", currentHistory.recommendations[0].title);
    } else {
      console.log("No recommendation history found for user ID:", userId);
    }
    
    console.log("\nRecommendation history test completed successfully");
  } catch (error) {
    console.error("Error testing recommendation history:", error);
  }
}

// Run the test
testRecommendationHistory()
  .then(() => {
    console.log("Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });