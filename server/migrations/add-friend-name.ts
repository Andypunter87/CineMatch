/**
 * Migration to add friendName field to friend_requests table
 */
import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addFriendNameField() {
  console.log("Starting migration to add friendName field to friend_requests table...");

  try {
    // Check if the friend_name column already exists
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'friend_requests' AND column_name = 'friend_name'
      );
    `);

    if (!columnExists[0].exists) {
      console.log("Adding friend_name column...");
      
      await db.execute(sql`
        ALTER TABLE friend_requests 
        ADD COLUMN friend_name TEXT
      `);
      
      console.log("friend_name column added successfully!");
    } else {
      console.log("friend_name column already exists.");
    }

    return true;
  } catch (error) {
    console.error("Error adding friend_name column:", error);
    return false;
  }
}