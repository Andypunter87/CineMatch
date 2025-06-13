/**
 * Test script for Monthly Mood Card system
 * Tests OpenAI mood generation, Placid image creation, and database operations
 */

import { db } from "./db";
import { users, watchlist } from "@shared/schema";
import { generateMoodFromFilms } from "./services/mood-generation";
import { generatePlacidImage } from "./services/placid";
import { generateMoodCard, collectMonthlyFilmData, generateMonthlyMoodCards } from "./services/monthly-mood-cards";

async function testMoodGeneration() {
  console.log("🧠 Testing OpenAI mood generation...");
  
  const testFilms = [
    "The Royal Tenenbaums",
    "Frances Ha", 
    "Lady Bird",
    "Aftersun",
    "Eighth Grade"
  ];

  try {
    const moodData = await generateMoodFromFilms(testFilms);
    console.log("✅ Mood generation successful:", moodData);
    return moodData;
  } catch (error) {
    console.error("❌ Mood generation failed:", error);
    return null;
  }
}

async function testPlacidIntegration() {
  console.log("🎨 Testing Placid image generation...");
  
  const testData = {
    mood_name: "Bittersweet & Beautiful",
    subtitle: "Coming-of-age chaos with soft light and big feelings",
    bg_colour: "#f7c6c7",
    film_1: "The Royal Tenenbaums",
    film_2: "Frances Ha",
    film_3: "Lady Bird",
    film_4: "Aftersun",
    film_5: "Eighth Grade"
  };

  try {
    const imageUrl = await generatePlacidImage(testData);
    console.log("✅ Placid image generation successful:", imageUrl);
    return imageUrl;
  } catch (error) {
    console.error("❌ Placid image generation failed:", error);
    return null;
  }
}

async function testDatabaseOperations() {
  console.log("🗄️ Testing database operations...");
  
  try {
    // Get a test user
    const testUser = await db.select().from(users).limit(1);
    
    if (testUser.length === 0) {
      console.log("⚠️ No users found in database. Creating test user...");
      
      const [newUser] = await db.insert(users).values({
        email: "test@cinematch.co.uk",
        name: "Test User",
        password: "hashedpassword123"
      }).returning();
      
      console.log("✅ Test user created:", newUser.id);
      
      // Add some test watchlist items
      const testDate = new Date();
      testDate.setMonth(testDate.getMonth() - 1); // Last month
      
      await db.insert(watchlist).values([
        {
          userId: newUser.id,
          filmId: 1,
          filmTitle: "The Royal Tenenbaums",
          filmYear: 2001,
          filmDirector: "Wes Anderson",
          userRating: 5,
          dateAdded: testDate
        },
        {
          userId: newUser.id,
          filmId: 2,
          filmTitle: "Frances Ha",
          filmYear: 2012,
          filmDirector: "Noah Baumbach",
          userRating: 4,
          dateAdded: testDate
        },
        {
          userId: newUser.id,
          filmId: 3,
          filmTitle: "Lady Bird",
          filmYear: 2017,
          filmDirector: "Greta Gerwig",
          userRating: 5,
          dateAdded: testDate
        }
      ]);
      
      console.log("✅ Test watchlist items added");
      return newUser.id;
    } else {
      console.log("✅ Using existing user:", testUser[0].id);
      return testUser[0].id;
    }
  } catch (error) {
    console.error("❌ Database operations failed:", error);
    return null;
  }
}

async function testMoodCardGeneration() {
  console.log("🎬 Testing complete mood card generation...");
  
  const userId = await testDatabaseOperations();
  if (!userId) {
    console.error("❌ Cannot test mood card generation without valid user");
    return;
  }

  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // Previous month (0-based)

  try {
    console.log(`Generating mood card for user ${userId}, ${year}-${month + 1}`);
    
    // Get top films for last month
    const topFilms = ["The Royal Tenenbaums", "Frances Ha", "Lady Bird"];
    
    const moodCard = await generateMoodCard(userId, year, month + 1, topFilms);
    console.log("✅ Mood card generated successfully:", {
      id: moodCard.id,
      moodName: moodCard.moodName,
      subtitle: moodCard.subtitle,
      topFilms: moodCard.topFilms,
      placidImageUrl: moodCard.placidImageUrl
    });
    
    return moodCard;
  } catch (error) {
    console.error("❌ Mood card generation failed:", error);
    return null;
  }
}

async function testMonthlyGeneration() {
  console.log("📅 Testing monthly mood card generation for all users...");
  
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // Current month

  try {
    const results = await generateMonthlyMoodCards(year, month);
    console.log("✅ Monthly generation completed:", results);
    return results;
  } catch (error) {
    console.error("❌ Monthly generation failed:", error);
    return null;
  }
}

async function runAllTests() {
  console.log("🚀 Starting Monthly Mood Card System Tests");
  console.log("=" .repeat(50));
  
  // Test 1: OpenAI mood generation
  await testMoodGeneration();
  console.log();
  
  // Test 2: Placid image generation
  await testPlacidIntegration();
  console.log();
  
  // Test 3: Database operations
  await testDatabaseOperations();
  console.log();
  
  // Test 4: Complete mood card generation
  await testMoodCardGeneration();
  console.log();
  
  // Test 5: Monthly generation (optional - can be intensive)
  console.log("⚠️ Skipping monthly generation test to avoid intensive processing");
  console.log("Use 'testMonthlyGeneration()' manually if needed");
  console.log();
  
  console.log("🎉 Monthly Mood Card System testing completed!");
  console.log("Check the logs above for any failures or issues.");
}

// Export functions for individual testing
export {
  testMoodGeneration,
  testPlacidIntegration,
  testDatabaseOperations,
  testMoodCardGeneration,
  testMonthlyGeneration,
  runAllTests
};

// Run tests if this file is executed directly
runAllTests().catch(console.error);