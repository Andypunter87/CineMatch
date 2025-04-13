import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

// This script adds the needs_onboarding column to the users table

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable not set");
    process.exit(1);
  }

  console.log("Starting migration to add needs_onboarding field...");
  
  // Create a postgres connection to use with drizzle
  const client = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false }, max: 1 });
  
  // Create a drizzle instance
  const db = drizzle(client);
  
  try {
    // Check if the column already exists
    const columnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'needs_onboarding'
    `);
    
    if (columnResult.length === 0) {
      console.log("Adding needs_onboarding column to users table...");
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN needs_onboarding BOOLEAN DEFAULT TRUE
      `);
      console.log("Column added successfully!");
    } else {
      console.log("needs_onboarding column already exists.");
    }
    
    // Set all existing users' needs_onboarding to false, 
    // as we don't want to force existing users to go through onboarding
    await db.execute(sql`
      UPDATE users 
      SET needs_onboarding = FALSE 
      WHERE needs_onboarding IS NULL
    `);
    console.log("Updated existing users to skip onboarding.");
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    // Close the client connection
    await client.end();
  }
}

main();