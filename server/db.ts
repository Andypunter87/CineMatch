import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";
import migrateToEmailLogin from "./migrations/migrate-email-login";
import { addTMDBFields } from "./migrations/add-tmdb-fields";
import { addAdminField } from "./migrations/add-admin-field";
import { createAnalyticsTable } from "./migrations/create-analytics-table";
import { createFriendsTables } from "./migrations/create-friends-tables";
import { addFriendNameField } from "./migrations/add-friend-name";

// Create postgres connection with proper error handling
export const client = process.env.DATABASE_URL 
  ? postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } }) 
  : postgres({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'postgres',
      username: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres'
    });

// Create drizzle instance
export const db = drizzle(client, { schema });

// Initialize database
export async function initializeDatabase() {
  try {
    // Check if tables exist and create them if they don't
    const result = await client`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `;
    
    const tablesExist = result[0]?.exists || false;
    
    if (!tablesExist) {
      console.log("Creating database tables...");
      
      // Create users table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" SERIAL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "password" TEXT,
          "name" TEXT,
          "streaming_services" TEXT[],
          "country" TEXT,
          "auth_provider" TEXT DEFAULT 'local',
          "provider_id" TEXT
        );
      `);
      
      // Create watchlist table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "watchlist" (
          "id" SERIAL PRIMARY KEY,
          "user_id" INTEGER NOT NULL,
          "film_id" INTEGER NOT NULL,
          "film_title" TEXT NOT NULL,
          "film_year" INTEGER,
          "film_director" TEXT,
          "film_type" TEXT,
          "film_genres" TEXT[],
          "film_poster_url" TEXT,
          "recommendation_context" JSONB,
          "date_added" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "watched" BOOLEAN DEFAULT FALSE,
          "date_watched" TIMESTAMP,
          "user_rating" INTEGER,
          "user_notes" TEXT,
          FOREIGN KEY("user_id") REFERENCES "users"("id")
        );
      `);
      
      console.log("Database tables created successfully");
    } else {
      console.log("Database tables already exist");
    }
    
    // Run our email migration to ensure all users have valid emails
    await migrateToEmailLogin();
    
    // Run migration to add TMDB fields to watchlist table
    await addTMDBFields();
    
    // Run migration to add isAdmin field to users table
    await addAdminField();
    
    // Run migration to create the analytics table
    await createAnalyticsTable();
    
    // Run migration to create friends and friend_requests tables
    await createFriendsTables();
    
    // Run migration to add friendName field to friend_requests table
    await addFriendNameField();
    
    console.log("Database initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}