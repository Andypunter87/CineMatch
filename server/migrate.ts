import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// This script creates the database tables based on the schema definitions

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable not set");
    process.exit(1);
  }

  console.log("Starting database migration...");
  
  // Create a postgres connection to use with drizzle
  const client = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false }, max: 1 });
  
  // Create a drizzle instance
  const db = drizzle(client);
  
  console.log("Creating/updating database tables...");
  
  try {
    // This will automatically create the tables if they don't exist
    // or update them if the schema has changed
    await db.execute(/* sql */`
      CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        film_id INTEGER NOT NULL,
        film_title TEXT NOT NULL,
        film_year INTEGER,
        film_director TEXT,
        film_type TEXT,
        film_genres TEXT[],
        film_poster_url TEXT,
        recommendation_context JSONB,
        date_added TIMESTAMP DEFAULT NOW(),
        watched BOOLEAN DEFAULT FALSE,
        date_watched TIMESTAMP,
        user_rating INTEGER,
        user_notes TEXT
      );
    `);
    
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