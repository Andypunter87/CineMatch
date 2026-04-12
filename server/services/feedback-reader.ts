/**
 * Feedback Reader Service
 * 
 * Reads user film feedback from PostgreSQL and incorporates it into
 * the recommendation engine to improve personalization.
 */

import { storage } from '../storage';
import { RecommendationRequest } from '@shared/schema';

export interface FeedbackEntry {
  filmId: number;
  title: string;
  liked: boolean;
  timestamp: string;
  moodContext?: string | null;
  runtimePreference?: string[] | null;
  recommendationContext?: RecommendationRequest | null;
}

export async function getUserFilmFeedback(userId: number): Promise<FeedbackEntry[]> {
  try {
    const feedback = await storage.getUserFeedbackForRecommendations(userId);
    return feedback.map(f => ({
      filmId: f.filmId,
      title: f.filmTitle,
      liked: f.liked,
      timestamp: f.createdAt ? f.createdAt.toISOString() : new Date().toISOString(),
      moodContext: f.moodContext ?? null,
      runtimePreference: f.runtimePreference ?? null,
      recommendationContext: f.recommendationContext ?? null,
    }));
  } catch (error) {
    console.error('Error retrieving film feedback from PostgreSQL:', error);
    return [];
  }
}

export function extractPreferenceWeights(feedback: FeedbackEntry[]) {
  if (!feedback || feedback.length === 0) {
    return { moodWeights: {}, runtimeWeights: {}, hasPreferences: false };
  }

  const moodWeights: Record<string, { liked: number; disliked: number }> = {};
  const runtimeWeights: Record<string, { liked: number; disliked: number }> = {};

  feedback.forEach(entry => {
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
    hasPreferences: Object.keys(moodWeights).length > 0 || Object.keys(runtimeWeights).length > 0,
  };
}

export function applyFeedbackWeights(
  film: any,
  preferences: RecommendationRequest,
  weights: ReturnType<typeof extractPreferenceWeights>
): number {
  if (!weights.hasPreferences) return film.score;

  let scoreAdjustment = 0;

  if (preferences.mood && weights.moodWeights[preferences.mood]) {
    const moodWeight = weights.moodWeights[preferences.mood];
    const netSentiment = moodWeight.liked - moodWeight.disliked;
    scoreAdjustment += netSentiment * 5;
  }

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

    if (matchedRuntimeCount > 0) {
      scoreAdjustment += totalRuntimeAdjustment / matchedRuntimeCount;
    }
  }

  return film.score + scoreAdjustment;
}
