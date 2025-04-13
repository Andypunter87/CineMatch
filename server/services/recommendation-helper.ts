import { Film } from "@shared/schema";

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