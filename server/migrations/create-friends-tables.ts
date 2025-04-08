/**
 * Migration to create friends and friend_requests tables
 */
import { db } from "../db";
import { sql } from "drizzle-orm";

export async function createFriendsTables() {
  console.log("Starting migration to create friend tables...");

  try {
    // Check if the friend_requests table exists
    const friendRequestsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'friend_requests'
      );
    `);

    if (!friendRequestsTableExists[0].exists) {
      console.log("Creating friend_requests table...");
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS friend_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          invite_code VARCHAR(100) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log("friend_requests table created.");
    } else {
      console.log("friend_requests table already exists.");
    }

    // Check if the friends table exists
    const friendsTableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'friends'
      );
    `);

    if (!friendsTableExists[0].exists) {
      console.log("Creating friends table...");
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS friends (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, friend_id)
        )
      `);
      
      console.log("friends table created.");
    } else {
      console.log("friends table already exists.");
    }

    console.log("Friend tables migration completed successfully.");
    return true;
  } catch (error) {
    console.error("Error creating friend tables:", error);
    return false;
  }
}