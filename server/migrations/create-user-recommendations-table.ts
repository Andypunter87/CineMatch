import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration to create user recommendations table if it doesn't exist
 */
export async function createUserRecommendationsTable() {
  try {
    // Check if the table already exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'user_recommendations'
      );
    `);
    
    if (!tableExists[0].exists) {
      console.log("Creating user_recommendations table...");
      
      // Create the table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_recommendations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          preferences JSONB NOT NULL,
          recommendations JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log("user_recommendations table created successfully");
    } else {
      console.log("user_recommendations table already exists");
    }
  } catch (error) {
    console.error("Error creating user_recommendations table:", error);
    throw error;
  }
}