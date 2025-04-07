import { sql } from 'drizzle-orm';
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema";

// Create direct postgres connection for this migration
// to avoid circular dependency with db.ts
const migrationClient = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } })
  : postgres({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'postgres',
      username: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres'
    });

// Create a migration-specific db instance
const db = drizzle(migrationClient, { schema });

/**
 * Migration to add TMDB fields to the watchlist table
 */
export async function addTMDBFields() {
  console.log('Starting migration to add TMDB fields...');

  try {
    // Check if the tmdb_id column already exists
    const checkColumnResult = await db.execute(
      sql`SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'watchlist' AND column_name = 'tmdb_id'`
    );

    // In newer versions of drizzle, the rows property is not directly accessible
    // We need to cast the result to an array or check length directly
    const resultArray = checkColumnResult as unknown as any[];
    
    if (resultArray.length === 0) {
      // Add TMDB fields to watchlist table
      console.log('Adding TMDB fields to watchlist table...');
      
      await db.execute(sql`
        ALTER TABLE "watchlist" 
        ADD COLUMN IF NOT EXISTS "tmdb_id" INTEGER,
        ADD COLUMN IF NOT EXISTS "vote_average" INTEGER,
        ADD COLUMN IF NOT EXISTS "runtime" INTEGER,
        ADD COLUMN IF NOT EXISTS "original_language" TEXT,
        ADD COLUMN IF NOT EXISTS "release_date" TEXT
      `);
      
      console.log('TMDB fields added successfully');
    } else {
      console.log('TMDB fields already exist in watchlist table');
    }

    return true;
  } catch (error) {
    console.error('Error adding TMDB fields:', error);
    return false;
  }
}

// No need for the script running detection in ES modules
// Just export the function directly