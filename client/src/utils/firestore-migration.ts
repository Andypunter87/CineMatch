import { getAuth } from "firebase/auth";
import { 
  collection, 
  getDocs, 
  query, 
  where,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  WriteBatch,
  writeBatch,
  Firestore,
  DocumentData
} from "firebase/firestore";
import { db } from '@/lib/firebase';
import { LogCategory, LogLevel, logPreferenceOperation, logSuccess } from '@/lib/firestore-test-logger';

/**
 * Utility functions to migrate data from the old Firestore structure
 * to the new schema with subcollections
 */

// Interface for migration results
export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errorCount: number;
  errors: any[];
  details: string[];
}

/**
 * Migrate all data for a single user
 * This will copy:
 * - User preferences from user_preferences/{userId} to users/{userId}.preferences
 * - Onboarding ratings from onboarding_ratings/{docId} to users/{userId}/onboardingRatings/{filmId}
 * - Film ratings from film_ratings/{docId} to users/{userId}/recommendationRatings/{filmId}
 * - Watchlist from watchlist/{docId} to users/{userId}/watchlist/{filmId}
 */
export async function migrateUserData(userId: string | number): Promise<MigrationResult> {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  // Create a unique operation ID for tracking
  const operationId = `migrate-${Date.now()}`;
  
  // Initialize result object
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    errorCount: 0,
    errors: [],
    details: []
  };
  
  // Log start of migration
  console.log(`Starting migration for user ${userId} with operation ID: ${operationId}`);
  logPreferenceOperation(LogLevel.INFO, `Starting full user data migration`, {
    operationType: 'update',
    additionalInfo: {
      userId,
      currentAuth: currentUser?.uid || 'not_authenticated',
      operationId
    }
  });
  
  try {
    // Create a batch for better performance and atomicity
    const batch = writeBatch(db);
    
    // Step 1: Migrate user preferences
    const preferencesResult = await migrateUserPreferences(userId, batch);
    result.migratedCount += preferencesResult.migratedCount;
    result.errorCount += preferencesResult.errorCount;
    result.errors = [...result.errors, ...preferencesResult.errors];
    result.details = [...result.details, ...preferencesResult.details];
    
    // Step 2: Migrate onboarding ratings
    const onboardingResult = await migrateOnboardingRatings(userId, batch);
    result.migratedCount += onboardingResult.migratedCount;
    result.errorCount += onboardingResult.errorCount;
    result.errors = [...result.errors, ...onboardingResult.errors];
    result.details = [...result.details, ...onboardingResult.details];
    
    // Step 3: Migrate film ratings
    const ratingsResult = await migrateFilmRatings(userId, batch);
    result.migratedCount += ratingsResult.migratedCount;
    result.errorCount += ratingsResult.errorCount;
    result.errors = [...result.errors, ...ratingsResult.errors];
    result.details = [...result.details, ...ratingsResult.details];
    
    // Step 4: Migrate watchlist
    const watchlistResult = await migrateWatchlist(userId, batch);
    result.migratedCount += watchlistResult.migratedCount;
    result.errorCount += watchlistResult.errorCount;
    result.errors = [...result.errors, ...watchlistResult.errors];
    result.details = [...result.details, ...watchlistResult.details];
    
    // Commit all the changes in a single batch
    if (result.migratedCount > 0) {
      await batch.commit();
      
      // Log successful migration
      logSuccess(LogCategory.OTHER, `Migration completed successfully`, {
        operationType: 'update',
        additionalInfo: {
          userId,
          migratedCount: result.migratedCount,
          operationId
        }
      });
      
      console.log(`Successfully migrated ${result.migratedCount} documents for user ${userId}`);
      result.success = true;
    } else {
      logPreferenceOperation(LogLevel.INFO, `No documents to migrate`, {
        operationType: 'update',
        additionalInfo: {
          userId,
          operationId
        }
      });
      
      console.log(`No documents to migrate for user ${userId}`);
      result.success = true;
    }
  } catch (error) {
    console.error(`Error during migration for user ${userId}:`, error);
    result.errorCount++;
    result.errors.push(error);
    result.details.push(`Global error: ${(error as Error).message}`);
    result.success = false;
    
    // Log error
    logPreferenceOperation(LogLevel.ERROR, `Migration failed with error`, {
      operationType: 'update',
      additionalInfo: {
        userId,
        error: (error as Error).message,
        operationId
      }
    });
  }
  
  return result;
}

/**
 * Migrate user preferences
 */
async function migrateUserPreferences(
  userId: string | number, 
  batch: WriteBatch
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    errorCount: 0,
    errors: [],
    details: []
  };
  
  try {
    // Create the user document path string format
    const userDocPath = `users/${typeof userId === 'number' ? `user-${userId}` : userId}`;
    
    // Check if preferences exist in the old location
    const oldPreferencesRef = doc(db, 'user_preferences', String(userId));
    const oldPreferencesSnap = await getDoc(oldPreferencesRef);
    
    if (oldPreferencesSnap.exists()) {
      const oldData = oldPreferencesSnap.data();
      
      // Create the new user document reference
      const newUserRef = doc(db, userDocPath);
      
      // Prepare the preferences data for the new schema
      const preferencesData = {
        preferences: {
          country: oldData.country || '',
          streamingServices: oldData.streamingServices || [],
          updatedAt: oldData.updatedAt || new Date().toISOString()
        },
        updatedAt: serverTimestamp(),
        _metadata: {
          migratedAt: new Date().toISOString(),
          source: 'migration-utility',
          originalCollection: 'user_preferences'
        }
      };
      
      // Add to batch
      batch.set(newUserRef, preferencesData, { merge: true });
      
      result.migratedCount++;
      result.details.push(`Migrated preferences for user ${userId}`);
      result.success = true;
    } else {
      result.details.push(`No preferences found for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error migrating preferences for user ${userId}:`, error);
    result.errorCount++;
    result.errors.push(error);
    result.details.push(`Preferences error: ${(error as Error).message}`);
  }
  
  return result;
}

/**
 * Migrate onboarding ratings
 */
async function migrateOnboardingRatings(
  userId: string | number, 
  batch: WriteBatch
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    errorCount: 0,
    errors: [],
    details: []
  };
  
  try {
    // Create the user document path string format
    const userDocPath = `users/${typeof userId === 'number' ? `user-${userId}` : userId}`;
    
    // Query the old onboarding ratings collection
    const oldRatingsRef = collection(db, 'onboarding_ratings');
    const q = query(oldRatingsRef, where('userId', '==', Number(userId)));
    const oldRatingsSnap = await getDocs(q);
    
    if (!oldRatingsSnap.empty) {
      // Process each onboarding rating
      oldRatingsSnap.forEach(ratingDoc => {
        const oldData = ratingDoc.data();
        const filmId = oldData.filmId;
        
        // Create the new document reference in the subcollection
        const newRatingRef = doc(db, `${userDocPath}/onboardingRatings/${filmId}`);
        
        // Prepare the rating data for the new schema
        const ratingData = {
          filmId,
          title: oldData.filmTitle || 'Unknown Title',
          rating: oldData.rating || 0,
          status: oldData.status || 'completed',
          timestamp: oldData.updatedAt || new Date().toISOString(),
          _metadata: {
            migratedAt: new Date().toISOString(),
            source: 'migration-utility',
            originalCollection: 'onboarding_ratings',
            originalDocId: ratingDoc.id
          }
        };
        
        // Add to batch
        batch.set(newRatingRef, ratingData);
        
        result.migratedCount++;
        result.details.push(`Migrated onboarding rating for film ${filmId}`);
      });
      
      result.success = true;
    } else {
      result.details.push(`No onboarding ratings found for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error migrating onboarding ratings for user ${userId}:`, error);
    result.errorCount++;
    result.errors.push(error);
    result.details.push(`Onboarding ratings error: ${(error as Error).message}`);
  }
  
  return result;
}

/**
 * Migrate film ratings (regular ratings, not onboarding)
 */
async function migrateFilmRatings(
  userId: string | number, 
  batch: WriteBatch
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    errorCount: 0,
    errors: [],
    details: []
  };
  
  try {
    // Create the user document path string format
    const userDocPath = `users/${typeof userId === 'number' ? `user-${userId}` : userId}`;
    
    // Query the old film ratings collection
    const oldRatingsRef = collection(db, 'film_ratings');
    const q = query(oldRatingsRef, where('userId', '==', Number(userId)));
    const oldRatingsSnap = await getDocs(q);
    
    if (!oldRatingsSnap.empty) {
      // Process each film rating
      oldRatingsSnap.forEach(ratingDoc => {
        const oldData = ratingDoc.data();
        const filmId = oldData.filmId;
        
        // Create the new document reference in the subcollection
        const newRatingRef = doc(db, `${userDocPath}/recommendationRatings/${filmId}`);
        
        // Convert 1-5 star rating to good/bad
        // Ratings 4-5 are "good", 1-3 are "bad"
        const goodBadRating = (oldData.rating >= 4) ? 'good' : 'bad';
        
        // Prepare the rating data for the new schema
        const ratingData = {
          filmId,
          title: oldData.filmTitle || 'Unknown Title',
          rating: goodBadRating,
          timestamp: oldData.updatedAt || new Date().toISOString(),
          _metadata: {
            migratedAt: new Date().toISOString(),
            source: 'migration-utility',
            originalCollection: 'film_ratings',
            originalDocId: ratingDoc.id,
            originalRating: oldData.rating
          }
        };
        
        // Add to batch
        batch.set(newRatingRef, ratingData);
        
        result.migratedCount++;
        result.details.push(`Migrated film rating for film ${filmId} as ${goodBadRating}`);
      });
      
      result.success = true;
    } else {
      result.details.push(`No film ratings found for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error migrating film ratings for user ${userId}:`, error);
    result.errorCount++;
    result.errors.push(error);
    result.details.push(`Film ratings error: ${(error as Error).message}`);
  }
  
  return result;
}

/**
 * Migrate watchlist items
 */
async function migrateWatchlist(
  userId: string | number, 
  batch: WriteBatch
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    errorCount: 0,
    errors: [],
    details: []
  };
  
  try {
    // Create the user document path string format
    const userDocPath = `users/${typeof userId === 'number' ? `user-${userId}` : userId}`;
    
    // Query the old watchlist collection
    const oldWatchlistRef = collection(db, 'watchlist');
    const q = query(oldWatchlistRef, where('userId', '==', Number(userId)));
    const oldWatchlistSnap = await getDocs(q);
    
    if (!oldWatchlistSnap.empty) {
      // Process each watchlist item
      oldWatchlistSnap.forEach(watchlistDoc => {
        const oldData = watchlistDoc.data();
        const filmId = oldData.filmId;
        
        // Create the new document reference in the subcollection
        const newWatchlistRef = doc(db, `${userDocPath}/watchlist/${filmId}`);
        
        // Prepare the watchlist data for the new schema
        const watchlistData = {
          filmId,
          title: oldData.filmTitle || 'Unknown Title',
          posterUrl: oldData.posterUrl || '',
          year: oldData.year,
          genres: oldData.genres || [],
          addedAt: oldData.addedAt || new Date().toISOString(),
          watched: oldData.watched || false,
          _metadata: {
            migratedAt: new Date().toISOString(),
            source: 'migration-utility',
            originalCollection: 'watchlist',
            originalDocId: watchlistDoc.id
          }
        };
        
        // Add to batch
        batch.set(newWatchlistRef, watchlistData);
        
        result.migratedCount++;
        result.details.push(`Migrated watchlist item for film ${filmId}`);
      });
      
      result.success = true;
    } else {
      result.details.push(`No watchlist items found for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error migrating watchlist for user ${userId}:`, error);
    result.errorCount++;
    result.errors.push(error);
    result.details.push(`Watchlist error: ${(error as Error).message}`);
  }
  
  return result;
}

/**
 * Check if a user's data has already been migrated
 * Returns true if at least some data exists in the new structure
 */
export async function hasUserBeenMigrated(userId: string | number): Promise<boolean> {
  // Create the user document path string format
  const userDocPath = `users/${typeof userId === 'number' ? `user-${userId}` : userId}`;
  
  try {
    // Check if the user document exists in the new location
    const userDocRef = doc(db, userDocPath);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      return true;
    }
    
    // Check if any onboarding ratings exist
    const onboardingRef = collection(db, `${userDocPath}/onboardingRatings`);
    const onboardingSnap = await getDocs(onboardingRef);
    
    if (!onboardingSnap.empty) {
      return true;
    }
    
    // Check if any recommendation ratings exist
    const recommendationRef = collection(db, `${userDocPath}/recommendationRatings`);
    const recommendationSnap = await getDocs(recommendationRef);
    
    if (!recommendationSnap.empty) {
      return true;
    }
    
    // Check if any watchlist items exist
    const watchlistRef = collection(db, `${userDocPath}/watchlist`);
    const watchlistSnap = await getDocs(watchlistRef);
    
    if (!watchlistSnap.empty) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking migration status for user ${userId}:`, error);
    return false;
  }
}