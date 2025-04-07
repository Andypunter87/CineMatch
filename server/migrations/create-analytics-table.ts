import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration to create analytics table if it doesn't exist
 */
export async function createAnalyticsTable() {
  try {
    // Check if the table already exists
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'analytics'
    `;
    
    const result = await db.execute(sql.raw(checkQuery));
    
    if (result.length === 0) {
      console.log('Creating analytics table...');
      
      // Create the analytics table
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS analytics (
          id SERIAL PRIMARY KEY,
          event_type TEXT NOT NULL,
          user_id INTEGER,
          data JSONB,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip TEXT,
          user_agent TEXT
        )
      `));
      
      console.log('Analytics table created successfully');
    } else {
      console.log('Analytics table already exists');
    }
    
    return true;
  } catch (error) {
    console.error('Error creating analytics table:', error);
    return false;
  }
}