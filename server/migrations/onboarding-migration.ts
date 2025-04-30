import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration to add onboarding_state to users table and create onboarding_ratings table
 */
export async function setupOnboardingTables() {
  console.log("Starting migration for onboarding tables...");
  
  // First, check if onboarding_state column exists in users table
  try {
    const columnExistsQuery = sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'onboarding_state'
      );
    `;
    const [result] = await db.execute(columnExistsQuery);
    
    if (!result || !result.exists) {
      console.log("Adding onboarding_state column to users table...");
      
      // Add onboarding_state column to users table
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS onboarding_state JSONB DEFAULT '{"completed": false, "currentStep": "intro", "progress": 0, "lastUpdated": "2023-01-01T00:00:00.000Z"}'::jsonb;
      `);
      
      // Copy data from needs_onboarding to onboarding_state if it exists
      const needsOnboardingExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'needs_onboarding'
        );
      `);
      
      if (needsOnboardingExists[0] && needsOnboardingExists[0].exists) {
        console.log("Migrating data from needs_onboarding to onboarding_state...");
        
        // Update onboarding_state based on needs_onboarding value
        await db.execute(sql`
          UPDATE users 
          SET onboarding_state = jsonb_set(onboarding_state, '{completed}', 
            CASE WHEN needs_onboarding = false THEN 'true' ELSE 'false' END::jsonb)
          WHERE needs_onboarding IS NOT NULL;
        `);
      }
    } else {
      console.log("onboarding_state column already exists in users table");
    }
    
    // Check if onboarding_ratings table exists
    const tableExistsQuery = sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'onboarding_ratings'
      );
    `;
    const [tableResult] = await db.execute(tableExistsQuery);
    
    if (!tableResult || !tableResult.exists) {
      console.log("Creating onboarding_ratings table...");
      
      // Create onboarding_ratings table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS onboarding_ratings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          film_id INTEGER NOT NULL,
          film_title TEXT NOT NULL,
          film_poster_url TEXT,
          rating INTEGER,
          status TEXT NOT NULL DEFAULT 'not_seen',
          batch_number INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create index on user_id for faster lookups
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_onboarding_ratings_user_id ON onboarding_ratings(user_id);
      `);
      
      console.log("Onboarding ratings table created successfully");
    } else {
      console.log("onboarding_ratings table already exists");
    }
    
    console.log("Onboarding migration completed successfully");
    
  } catch (error) {
    console.error("Error in onboarding migration:", error);
    throw error;
  }
}