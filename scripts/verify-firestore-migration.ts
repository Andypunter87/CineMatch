/**
 * Verify Firestore Migration
 * 
 * This script checks if the migration from PostgreSQL to Firestore was successful
 * by retrieving several user documents from Firestore.
 */

import { getFirestoreDb } from '../server/firebase-admin';

// An array of user IDs to check
const userIdsToCheck = [
  '2',  // andrewpunter87@gmail.com
  '8',  // katiefletcher89@hotmail.com
  '17', // robgreen.work@gmail.com
  '25', // nadine13am@gmail.com
  '51'  // andy+onboardingtest@more-human.co.uk
];

async function verifyFirestoreMigration() {
  const firestore = getFirestoreDb();
  
  if (!firestore) {
    console.error('❌ Firestore not initialized. Check Firebase Admin credentials.');
    process.exit(1);
  }
  
  console.log('🔍 Verifying Firestore migration for selected users...\n');
  
  for (const userId of userIdsToCheck) {
    try {
      // Get user data from Firestore at the specified path
      const userDocRef = firestore
        .collection('users')
        .doc(userId)
        .collection('preferences')
        .doc('settings');
      
      const doc = await userDocRef.get();
      
      if (doc.exists) {
        const data = doc.data();
        console.log(`✅ User ${userId} found in Firestore`);
        console.log(`   Path: users/${userId}/preferences/settings`);
        console.log('   Data:');
        console.log(`   - email: ${data?.email || 'missing'}`);
        console.log(`   - name: ${data?.name || 'null'}`);
        console.log(`   - country: ${data?.country || 'null'}`);
        console.log(`   - streamingServices: ${data?.streamingServices ? JSON.stringify(data.streamingServices) : 'null'}`);
        console.log(`   - lastUpdated: ${data?.lastUpdated ? data.lastUpdated.toDate().toISOString() : 'missing'}`);
        console.log('');
      } else {
        console.log(`❌ User ${userId} NOT found in Firestore at path: users/${userId}/preferences/settings`);
      }
    } catch (error) {
      console.error(`❌ Error checking user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Run the verification
verifyFirestoreMigration()
  .then(() => {
    console.log('Verification script execution completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });