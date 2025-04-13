import { Film, RecommendationRequest } from "@shared/schema";
import { getAIRecommendations } from "./openai";

/**
 * Safely parses recommendations from storage which could be either JSON strings or objects
 * @param recommendations The recommendations from storage (could be a string or object)
 * @returns An array of Film objects
 */
export function safelyParseRecommendations(recommendations: string | any): Film[] {
  let result: Film[] = [];
  
  try {
    // Check the type of recommendations
    if (typeof recommendations === 'string') {
      // If it's a string, try to parse it as JSON
      result = JSON.parse(recommendations);
    } else {
      // If it's already an object (array), use it directly
      result = recommendations as Film[];
    }
  } catch (error) {
    console.error("Error parsing recommendations:", error);
    // Return empty array if parsing fails
    result = [];
  }
  
  return result;
}

/**
 * Helper function to request additional batch of films while preventing duplicates
 * @param preferences User preferences
 * @param excludeFilmIds Film IDs to exclude from recommendations
 * @param batchSize Desired number of films to return
 */
export async function getAdditionalRecommendations(
  preferences: RecommendationRequest,
  excludeFilmIds: number[] = [],
  batchSize: number = 6
): Promise<Film[]> {
  console.log(`Requesting additional batch of ${batchSize} recommendations, excluding ${excludeFilmIds.length} films`);
  
  // Create a new preferences object with the exclusions and batch size
  // For the "Show More" feature, we'll temporarily disable the streaming service filtering
  // to get a more diverse set of recommendations
  const requestWithExclusions: RecommendationRequest = {
    ...preferences,
    excludeFilmIds: excludeFilmIds,
    requestedBatchSize: batchSize,
    // Don't constrain to streaming services for additional recommendations
    // This helps avoid getting the same film repeatedly when options are limited
    _bypassStreamingFilter: true
  };
  
  // Call the AI recommendation service with our updated preferences
  return getAIRecommendations(requestWithExclusions);
}