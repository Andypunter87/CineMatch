import { db } from "../db";
import { storage } from "../storage";
import { onboardingRatings, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { Film } from "@shared/schema";

/**
 * Service for handling onboarding-related functionality
 */
export class OnboardingService {
  /**
   * Updates the user's onboarding state
   * @param userId User ID
   * @param onboardingState Object containing onboarding state properties to update
   */
  async updateOnboardingState(
    userId: number, 
    onboardingState: {
      completed?: boolean;
      currentStep?: "intro" | "preferences" | "ratings" | "completed";
      progress?: number;
      fingerprint?: {
        nickname?: string;
        topTags?: string[];
        topFilmIds?: number[];
        genres?: string[];
        vibeTraits?: { tone: string; style: string; pace: string };
        tagWeights?: Record<string, number>;
        vibeProfile?: Record<string, number>;
        [key: string]: unknown;
      };
    }
  ) {
    try {
      // Get current state first
      const [user] = await db
        .select({ onboardingState: users.onboardingState })
        .from(users)
        .where(eq(users.id, userId));
        
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Create a new state object that merges the current state with the updates
      const currentState = user.onboardingState || {
        completed: false,
        currentStep: "intro",
        progress: 0,
        lastUpdated: new Date().toISOString(),
      };
      
      const updatedState = {
        ...currentState,
        ...onboardingState,
        lastUpdated: new Date().toISOString(),
      };
      
      // Update the user's onboarding state
      await db
        .update(users)
        .set({ onboardingState: updatedState })
        .where(eq(users.id, userId));
        
      return updatedState;
    } catch (error) {
      console.error("Error updating onboarding state:", error);
      throw error;
    }
  }
  
  /**
   * Marks onboarding as completed for a user
   * @param userId User ID
   */
  async completeOnboarding(userId: number) {
    return this.updateOnboardingState(userId, {
      completed: true,
      currentStep: "completed",
      progress: 100,
    });
  }
  
  /**
   * Saves user preferences during onboarding
   * @param userId User ID
   * @param country User's country
   * @param streamingServices Array of streaming service IDs
   */
  async saveUserPreferences(userId: number, country: string, streamingServices: string[]) {
    console.log(`OnboardingService.saveUserPreferences - userId: ${userId}, country: ${country}, streamingServices: ${streamingServices.join(',')}`);
    
    try {
      // Data validation
      if (!userId || isNaN(userId)) {
        throw new Error(`Invalid user ID: ${userId}`);
      }
      
      if (!country || typeof country !== 'string' || country.length !== 2) {
        throw new Error(`Invalid country code: ${country}`);
      }
      
      if (!Array.isArray(streamingServices)) {
        console.warn(`Invalid streaming services value: ${JSON.stringify(streamingServices)}`);
        streamingServices = [];
      }
      // An empty array is a valid intentional choice — user has no
      // subscribed streamers (or cleared them on a retake). Persist it.
      
      console.log(`Calling storage.updateUserCountry - userId: ${userId}, country: ${country}`);
      const user = await storage.updateUserCountry(userId, country);
      console.log(`Country updated successfully for user ${userId}`);
      
      console.log(`Calling storage.updateUserStreamingServices - userId: ${userId}, services: ${streamingServices.join(',')}`);
      const updatedUser = await storage.updateUserStreamingServices(userId, streamingServices);
      console.log(`Streaming services updated successfully for user ${userId}`);
      
      // Update onboarding state to mark preferences step as completed
      console.log(`Updating onboarding state for user ${userId} to ratings step (50% progress)`);
      await this.updateOnboardingState(userId, {
        currentStep: "ratings",
        progress: 50,
      });
      console.log(`Onboarding state updated successfully for user ${userId}`);
      
      return updatedUser;
    } catch (error) {
      console.error(`Error saving user preferences for userId ${userId}:`, error);
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
      throw error;
    }
  }
  
  /**
   * Fetches films for the onboarding rating step from a curated list
   * Uses a static, curated list with verified metadata and poster images
   * for a more reliable onboarding experience
   * 
   * @param count Number of films to retrieve
   * @param offset Pagination offset
   * @param batchNumber Which batch of films this is (for tracking)
   * @param seed Random seed for consistent shuffling
   */
  async getFilmsForOnboardingRatings(count: number = 12, offset: number = 0, batchNumber: number = 1, seed: number = Date.now()) {
    try {
      // Import is done inside the function to avoid circular dependencies
      const { getCuratedOnboardingFilms } = await import('../data/onboarding-films');
      
      // Get films from curated list rather than dynamic TMDB data
      // Using the seed ensures consistent random ordering within a session
      const films = getCuratedOnboardingFilms(count, offset, seed);
      
      console.log(`Fetched ${films.length} curated films for onboarding (batch ${batchNumber})`);
      
      if (films.length === 0) {
        throw new Error("No curated films available");
      }
      
      // Log the first film for debugging
      if (films.length > 0) {
        console.log(`Selected ${films.length} films for this batch. First film: ${films[0].title}`);
      }
      
      return films;
    } catch (error) {
      console.error("Error fetching curated films for onboarding:", error);
      
      // Fallback to dynamic data in case of error
      try {
        console.log("Falling back to dynamic film data");
        return await storage.getPopularFilmsForOnboarding(count, offset, seed);
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        throw error; // Throw the original error
      }
    }
  }
  
  /**
   * Saves a user's film rating during onboarding
   * @param userId User ID
   * @param filmId Film ID
   * @param filmTitle Film title (for easier querying)
   * @param filmPosterUrl Film poster URL
   * @param rating Rating (1-5, null if "haven't seen")
   * @param status Rating status (e.g., "not_seen", "liked", "loved")
   * @param batchNumber Which batch this rating belongs to
   */
  async saveFilmRating(
    userId: number,
    filmId: number,
    filmTitle: string,
    filmPosterUrl: string,
    rating: number | null,
    status: string = "not_seen",
    batchNumber: number = 1
  ) {
    try {
      // Check if this film has already been rated by this user during onboarding
      const existingRatings = await db
        .select()
        .from(onboardingRatings)
        .where(and(
          eq(onboardingRatings.userId, userId),
          eq(onboardingRatings.filmId, filmId)
        ));
      
      if (existingRatings.length > 0) {
        // Update existing rating
        const [updatedRating] = await db
          .update(onboardingRatings)
          .set({
            rating,
            status,
            batchNumber,
          })
          .where(and(
            eq(onboardingRatings.userId, userId),
            eq(onboardingRatings.filmId, filmId)
          ))
          .returning();
          
        return updatedRating;
      } else {
        // Insert new rating
        const [newRating] = await db
          .insert(onboardingRatings)
          .values({
            userId,
            filmId,
            filmTitle,
            filmPosterUrl,
            rating,
            status,
            batchNumber,
          })
          .returning();
          
        return newRating;
      }
    } catch (error) {
      console.error("Error saving film rating:", error);
      throw error;
    }
  }
  
  /**
   * Saves multiple film ratings at once (batch save)
   * @param userId User ID
   * @param ratings Array of rating objects
   * @param batchNumber Which batch these ratings belong to
   */
  async saveMultipleRatings(
    userId: number,
    ratings: Array<{
      filmId: number;
      filmTitle: string;
      filmPosterUrl: string;
      rating: number | null;
      status: string;
    }>,
    batchNumber: number = 1
  ) {
    try {
      const results = [];
      
      // Save each rating individually (could be optimized with bulk insert)
      for (const rating of ratings) {
        const result = await this.saveFilmRating(
          userId,
          rating.filmId,
          rating.filmTitle,
          rating.filmPosterUrl,
          rating.rating,
          rating.status,
          batchNumber
        );
        
        results.push(result);
      }
      
      // Calculate how far along we are in the process
      const totalRatings = await db
        .select({ count: sql`count(*)` })
        .from(onboardingRatings)
        .where(eq(onboardingRatings.userId, userId));
      
      const count = Number(totalRatings[0]?.count || 0);
      let progress = 50; // Start at 50% since preferences are already done
      
      // Calculate progress based on how many films have been rated
      if (count >= 12) {
        // Consider 12 ratings as minimum completion
        progress = 100;
        
        // Mark onboarding as complete if enough ratings
        await this.updateOnboardingState(userId, {
          progress,
          currentStep: count >= 12 ? "completed" : "ratings",
          completed: count >= 12,
        });
      } else {
        // Scale progress from 50% to 99% based on number of ratings
        progress = 50 + Math.floor((count / 12) * 49);
        
        await this.updateOnboardingState(userId, {
          progress,
        });
      }
      
      return {
        ratings: results,
        progress,
        totalRated: count,
      };
    } catch (error) {
      console.error("Error saving multiple ratings:", error);
      throw error;
    }
  }
  
  /**
   * Get all onboarding ratings for a user
   * @param userId User ID
   */
  async getUserOnboardingRatings(userId: number) {
    try {
      const ratings = await db
        .select()
        .from(onboardingRatings)
        .where(eq(onboardingRatings.userId, userId));
        
      return ratings;
    } catch (error) {
      console.error("Error getting user onboarding ratings:", error);
      throw error;
    }
  }
  
  /**
   * Convert onboarding ratings to the format needed for the recommendation engine
   * @param userId User ID
   */
  async getOnboardingRatingsForRecommendations(userId: number) {
    try {
      const ratings = await this.getUserOnboardingRatings(userId);
      
      // Only include films that have an actual rating (not "haven't seen")
      const ratedFilms = ratings.filter(r => r.rating !== null);
      
      // Get the full film details for each rated film
      const filmsWithDetails = await Promise.all(
        ratedFilms.map(async (rating) => {
          const film = await storage.getFilmById(rating.filmId);
          if (!film) {
            return null;
          }
          
          return {
            filmId: rating.filmId,
            title: rating.filmTitle,
            genres: film.genres,
            rating: rating.rating as number, // We know it's not null from the filter above
            filmType: film.type,
          };
        })
      );
      
      // Filter out any null results (films that couldn't be found)
      return filmsWithDetails.filter(film => film !== null);
    } catch (error) {
      console.error("Error converting onboarding ratings for recommendations:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const onboardingService = new OnboardingService();