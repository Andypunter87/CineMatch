import { db } from "../db";
import { sql } from "drizzle-orm";
import { users } from "@shared/schema";

/**
 * Migration to add isAdmin field to users table
 */
export async function addAdminField() {
  try {
    // Check if the column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_admin'
    `;
    
    const result = await db.execute(sql.raw(checkQuery));
    
    if (result.length === 0) {
      console.log('Adding is_admin column to users table...');
      
      // Add the column if it doesn't exist
      await db.execute(sql.raw(`
        ALTER TABLE users 
        ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
      `));
      
      console.log('is_admin column added successfully');
      
      // Set admin privileges for Andy's account
      const adminEmail = 'andy@more-human.co.uk';
      await db.execute(sql.raw(`
        UPDATE users 
        SET is_admin = TRUE 
        WHERE email = '${adminEmail}'
      `));
      
      console.log(`Admin privileges granted to ${adminEmail}`);
    } else {
      console.log('is_admin column already exists in users table');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding is_admin column:', error);
    return false;
  }
}