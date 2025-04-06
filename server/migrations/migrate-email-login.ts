import { db } from "../db";
import { users } from "@shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

/**
 * Migration to support email-based login
 * This script ensures that all users have valid email addresses
 */
async function migrateToEmailLogin() {
  console.log("Starting migration to email-based login...");
  
  try {
    // Check if the users table has the username column
    try {
      // Try to query for the username column - this will fail if it doesn't exist
      // Using raw SQL query to check column existence
      const columnCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
      `);
      
      if (columnCheck.length > 0) {
        console.log("Found username column in users table");
        
        // First, update all users who have a username but no email
        await db.execute(sql`
          UPDATE users
          SET email = CONCAT(username, '@example.com')
          WHERE email IS NULL AND username IS NOT NULL
        `);
        
        console.log("Updated users with missing emails based on username");
      }
    } catch (e) {
      console.log("Username column might not exist, continuing with migration");
    }
    
    // Check if any users are still missing emails
    const usersWithoutEmail = await db.select().from(users).where(isNull(users.email));
    
    if (usersWithoutEmail.length > 0) {
      console.log(`Found ${usersWithoutEmail.length} users without email addresses`);
      
      // For users who still don't have emails, generate a placeholder
      for (const user of usersWithoutEmail) {
        const placeholderEmail = `user_${user.id}@example.com`;
        
        await db.update(users)
          .set({ email: placeholderEmail })
          .where(eq(users.id, user.id));
          
        console.log(`Updated user ID ${user.id} with placeholder email ${placeholderEmail}`);
      }
    } else {
      console.log("All users have email addresses");
    }
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

// No need for the script running detection in ES modules
// Just export the function

export default migrateToEmailLogin;