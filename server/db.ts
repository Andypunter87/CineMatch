import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";
import { users } from "@shared/schema";

// Create postgres connection with proper error handling
export const client = process.env.DATABASE_URL 
  ? postgres(process.env.DATABASE_URL) 
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
    // Create tables if they don't exist
    const result = await client`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        streaming_services TEXT[] DEFAULT '{}'
      );
    `;
    
    console.log("Database initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}