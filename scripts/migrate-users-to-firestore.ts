/**
 * Migrate Users to Firestore
 * 
 * This script migrates all users from the PostgreSQL database to Firestore.
 * It preserves the user ID from SQL and creates a corresponding document in Firestore.
 */

import { db } from '../server/db';
import { getFirestoreDb } from '../server/firebase-admin';
import { users } from '../shared/schema';
import { FieldValue } from 'firebase-admin/firestore';

async function migrateUsersToFirestore() {
  const firestore = getFirestoreDb();
  
  if (!firestore) {
    console.error('❌ Firestore not initialized. Check Firebase Admin credentials.');
    process.exit(1);
  }
  
  try {
    console.log('📊 Starting migration of users from PostgreSQL to Firestore...');
    
    // Fetch all users from the database
    const allUsers = await db.select().from(users);
    console.log(`📋 Found ${allUsers.length} users to migrate.`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each user
    for (const user of allUsers) {
      try {
        const userId = user.id.toString();
        
        // Create preferences object with required fields
        const preferences = {
          email: user.email,
          name: user.name || null,
          country: user.country || null,
          streamingServices: user.streamingServices || [],
          lastUpdated: FieldValue.serverTimestamp()
        };
        
        // Create the document path: users/{userId}/preferences/settings
        const userDoc = firestore
          .collection('users')
          .doc(userId)
          .collection('preferences')
          .doc('settings');
        
        // Save to Firestore with merge option to preserve any existing data
        await userDoc.set(preferences, { merge: true });
        
        console.log(`✅ Migrated user ${userId}: ${user.email}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error migrating user ${user.id}: ${error instanceof Error ? error.message : String(error)}`);
        errorCount++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} users`);
    console.log(`❌ Failed to migrate: ${errorCount} users`);
    console.log(`📊 Total processed: ${allUsers.length} users`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️ Migration completed with errors. Check logs above for details.');
    }
  } catch (error) {
    console.error(`❌ Migration failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run the migration
migrateUsersToFirestore()
  .then(() => {
    console.log('Migration script execution completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });