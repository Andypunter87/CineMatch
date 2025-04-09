/**
 * Migration to create notifications table if it doesn't exist
 */
import { db } from "../db";
import { sql } from "drizzle-orm";

export async function createNotificationsTable() {
  try {
    // Check if the notifications table already exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
      );
    `);
    
    if (!tableExists[0].exists) {
      console.log('Creating notifications table...');
      
      // Create the notifications table
      await db.execute(sql`
        CREATE TABLE notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          type TEXT NOT NULL,
          message TEXT NOT NULL,
          related_user_id INTEGER REFERENCES users(id),
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('Notifications table created successfully');
    } else {
      console.log('Notifications table already exists, skipping creation');
    }
    
    return true;
  } catch (error) {
    console.error('Error creating notifications table:', error);
    return false;
  }
}