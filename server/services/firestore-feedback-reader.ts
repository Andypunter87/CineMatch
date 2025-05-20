/**
 * Firestore Feedback Reader Service
 * 
 * This service reads user feedback from Firestore and helps incorporate it
 * into the recommendation engine to improve personalization.
 */

import { getFirestoreDb } from '../firebase-admin';
import { RecommendationRequest } from '@shared/schema';

export interface FirestoreFeedbackEntry {
  filmId: number;
  title: string;
  liked: boolean;
  timestamp: string;
  moodContext?: string | null;
  runtimePreference?: string[] | null;
  recommendationContext?: RecommendationRequest | null;
}

/**
 * Get all film feedback for a user from Firestore
 * @param userId User ID to get feedback for
 * @returns Array of feedback entries or empty array if none found
 */
export async function getUserFilmFeedback(userId: number): Promise<FirestoreFeedbackEntry[]> {
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.warn('Firestore not initialized for feedback retrieval');
      return [];
    }

    // Attempt to get all feedback documents for this user
    const feedbackPath = `users/${userId}/feedback/films`;
    const feedbackCollection = db.collection(feedbackPath);
    const snapshot = await feedbackCollection.get();

    if (snapshot.empty) {
      console.log(`No feedback found in Firestore for user ${userId}`);
      return [];
    }

    // Convert to array of feedback entries
    const feedbackEntries: FirestoreFeedbackEntry[] = [];
    snapshot.forEach(doc => {
      const data = doc.data() as FirestoreFeedbackEntry;
      feedbackEntries.push(data);
    });

    console.log(`Found ${feedbackEntries.length} feedback entries in Firestore for user ${userId}`);
    return feedbackEntries;
  } catch (error) {
    console.error('Error retrieving feedback from Firestore:', error);
    return [];
  }
}

/**
 * Extract user preference weighting from feedback data
 * @param feedback Array of feedback entries
 * @returns Object containing weighted preferences
 */
export function extractPreferenceWeights(feedback: FirestoreFeedbackEntry[]) {
  // Skip if no feedback
  if (!feedback || feedback.length === 0) {
    return {
      moodWeights: {},
      runtimeWeights: {},
      hasPreferences: false
    };
  }

  // Initialize counters for different preference types
  const moodWeights: Record<string, { liked: number, disliked: number }> = {};
  const runtimeWeights: Record<string, { liked: number, disliked: number }> = {};
  
  // Process each feedback entry
  feedback.forEach(entry => {
    // Process mood context if available
    if (entry.moodContext) {
      if (!moodWeights[entry.moodContext]) {
        moodWeights[entry.moodContext] = { liked: 0, disliked: 0 };
      }
      
      if (entry.liked) {
        moodWeights[entry.moodContext].liked += 1;
      } else {
        moodWeights[entry.moodContext].disliked += 1;
      }
    }
    
    // Process runtime preferences if available
    if (entry.runtimePreference && entry.runtimePreference.length > 0) {
      entry.runtimePreference.forEach(runtime => {
        if (!runtimeWeights[runtime]) {
          runtimeWeights[runtime] = { liked: 0, disliked: 0 };
        }
        
        if (entry.liked) {
          runtimeWeights[runtime].liked += 1;
        } else {
          runtimeWeights[runtime].disliked += 1;
        }
      });
    }
  });

  return {
    moodWeights,
    runtimeWeights,
    hasPreferences: Object.keys(moodWeights).length > 0 || Object.keys(runtimeWeights).length > 0
  };
}

/**
 * Apply feedback-based weights to a film score
 * @param film Film object with initial score
 * @param preferences User preferences from request
 * @param weights Extracted weights from feedback
 * @returns Updated score with feedback weights applied
 */
export function applyFeedbackWeights(
  film: any, 
  preferences: RecommendationRequest,
  weights: ReturnType<typeof extractPreferenceWeights>
): number {
  // If no weights, return original score
  if (!weights.hasPreferences) {
    return film.score;
  }

  let scoreAdjustment = 0;
  
  // Apply mood-based weights
  if (preferences.mood && weights.moodWeights[preferences.mood]) {
    const moodWeight = weights.moodWeights[preferences.mood];
    // Calculate net sentiment (positive if more likes than dislikes)
    const netSentiment = moodWeight.liked - moodWeight.disliked;
    
    // Adjust score based on net sentiment (higher weight for stronger preference)
    scoreAdjustment += netSentiment * 5;
  }
  
  // Apply runtime-based weights
  if (preferences.runtime && preferences.runtime.length > 0) {
    let totalRuntimeAdjustment = 0;
    let matchedRuntimeCount = 0;
    
    preferences.runtime.forEach(runtime => {
      if (weights.runtimeWeights[runtime]) {
        const runtimeWeight = weights.runtimeWeights[runtime];
        const netSentiment = runtimeWeight.liked - runtimeWeight.disliked;
        totalRuntimeAdjustment += netSentiment * 3;
        matchedRuntimeCount++;
      }
    });
    
    // Apply average runtime adjustment if any matches found
    if (matchedRuntimeCount > 0) {
      scoreAdjustment += totalRuntimeAdjustment / matchedRuntimeCount;
    }
  }
  
  // Return adjusted score
  return film.score + scoreAdjustment;
}