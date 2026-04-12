/**
 * Chat data persistence test utilities — PostgreSQL version
 */
import { storage } from './storage';

export async function testChatDataPersistence(userId: string) {
  console.log('🧪 Testing Chat Data Persistence (PostgreSQL)');

  const numericId = parseInt(userId, 10);
  const results = {
    userPreferences: null as any,
    onboardingRatings: 0,
    recommendationFeedback: 0,
    chatSessions: 0,
    vibePreferences: 0,
    userProfile: null as any,
    recommendations: {
      dataPoints: [] as string[],
      strategy: [] as string[]
    }
  };

  try {
    const user = await storage.getUser(numericId);
    if (user) {
      results.userPreferences = {
        country: user.country,
        streamingServices: user.streamingServices,
      };
    }

    const ratings = await storage.getUserOnboardingRatings(numericId);
    results.onboardingRatings = ratings.length;

    const feedback = await storage.getAllFilmFeedback(numericId);
    results.recommendationFeedback = feedback.length;

    results.recommendations.dataPoints = [
      `${results.onboardingRatings} onboarding ratings`,
      `${results.recommendationFeedback} film feedback entries`,
    ];

    results.recommendations.strategy = [
      'PostgreSQL-backed recommendations',
      'Session-based AI context'
    ];

    console.log('✅ Chat data test complete');
  } catch (err) {
    console.error('Error during chat data test:', err);
  }

  return results;
}

export async function analyzeUserVibePatterns(userId: string) {
  const numericId = parseInt(userId, 10);
  try {
    const feedback = await storage.getAllFilmFeedback(numericId);
    const liked = feedback.filter(f => f.liked).length;
    const disliked = feedback.filter(f => !f.liked).length;
    return {
      totalFeedback: feedback.length,
      liked,
      disliked,
      likeRatio: feedback.length > 0 ? liked / feedback.length : 0,
    };
  } catch (err) {
    console.error('Error analyzing vibe patterns:', err);
    return { totalFeedback: 0, liked: 0, disliked: 0, likeRatio: 0 };
  }
}
