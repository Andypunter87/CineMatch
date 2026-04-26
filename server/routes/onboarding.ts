import express from "express";
import { onboardingService } from "../services/onboarding-service";
import { z } from "zod";
import { User } from "@shared/schema";

const router = express.Router();

// Middleware to ensure user is authenticated
const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Schema for user preferences
const preferencesSchema = z.object({
  country: z.string().min(2).max(2).optional(),
  streamingServices: z.array(z.string()).optional(),
  // Optional fingerprint fields from taste-test onboarding
  genres: z.array(z.string()).optional(),
  vibeTraits: z.object({
    tone: z.string(),
    style: z.string(),
    pace: z.string(),
  }).optional(),
  topTags: z.array(z.string()).optional(),
  topFilmIds: z.array(z.number()).optional(),
  nickname: z.string().optional(),
  tagWeights: z.record(z.string(), z.number()).optional(),
  vibeProfile: z.record(z.string(), z.number()).optional(),
});

// Schema for film rating
const ratingSchema = z.object({
  filmId: z.number(),
  filmTitle: z.string(),
  filmPosterUrl: z.string(),
  rating: z.number().min(1).max(5).nullable(),
  status: z.string().default("not_seen"),
});

// Schema for batch ratings
const batchRatingsSchema = z.object({
  ratings: z.array(ratingSchema),
  batchNumber: z.number().default(1),
});

// Get onboarding state
router.get("/state", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    
    // Get the user's onboarding state directly from the user object
    if (user.onboardingState) {
      return res.json({ onboardingState: user.onboardingState });
    }
    
    // If not present in the user object, default to a starting state
    const defaultState = {
      completed: false,
      currentStep: "intro" as "intro", // Type assertion to match expected enum type
      progress: 0
    };
    
    // Update the user with the default state
    await onboardingService.updateOnboardingState(user.id, defaultState);
    
    return res.json({ onboardingState: defaultState });
  } catch (error) {
    console.error("Error getting onboarding state:", error);
    res.status(500).json({ error: "Failed to get onboarding state" });
  }
});

// Update onboarding state
router.put("/state", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    const { completed, currentStep, progress } = req.body;
    
    const updatedState = await onboardingService.updateOnboardingState(user.id, {
      completed,
      currentStep,
      progress,
    });
    
    res.json({ onboardingState: updatedState });
  } catch (error) {
    console.error("Error updating onboarding state:", error);
    res.status(500).json({ error: "Failed to update onboarding state" });
  }
});

// Save user preferences (streaming services and country)
router.post("/preferences", isAuthenticated, async (req, res) => {
  console.log("Received onboarding preferences request:", JSON.stringify({
    body: req.body,
    user: req.user ? { id: req.user.id, name: req.user.name } : null
  }));
  
  try {
    const user = req.user!;
    console.log("Processing preferences for user:", user.id, user.name || user.username);
    
    // Validate request body
    console.log("Validating preferences schema for:", req.body);
    const validation = preferencesSchema.safeParse(req.body);
    if (!validation.success) {
      console.error("Validation error:", validation.error.format());
      return res.status(400).json({ 
        error: "Invalid preferences data", 
        details: validation.error.format(),
        received: req.body
      });
    }
    
    const { country, streamingServices, genres, vibeTraits, topTags, topFilmIds, nickname, tagWeights, vibeProfile } = validation.data;

    let updatedUser: User = user as User;

    // Save country/streaming preferences if provided
    if (country && streamingServices && streamingServices.length > 0) {
      console.log(`Valid preferences: country=${country}, streamingServices=${streamingServices.join(",")}`);
      console.log("Calling onboardingService.saveUserPreferences for user:", user.id);
      updatedUser = await onboardingService.saveUserPreferences(
        user.id,
        country,
        streamingServices
      );
      console.log("User preferences saved successfully, user:", updatedUser.id);
    }

    // Store fingerprint data in onboarding state if provided
    if (topTags || topFilmIds || nickname || genres || vibeTraits || tagWeights || vibeProfile) {
      await onboardingService.updateOnboardingState(user.id, {
        fingerprint: { nickname, topTags, topFilmIds, genres, vibeTraits, tagWeights, vibeProfile },
      });
    }
    
    // Create response with updated onboarding state
    const response = { 
      success: true, 
      user: updatedUser,
      onboardingState: {
        completed: false,
        currentStep: "ratings" as "ratings",
        progress: 50
      }
    };
    console.log("Sending successful preferences response");
    res.json(response);
  } catch (error) {
    console.error("Error saving preferences:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    res.status(500).json({ 
      error: "Failed to save preferences",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get films for rating during onboarding from curated static list
router.get("/films", isAuthenticated, async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || 12;
    const offset = parseInt(req.query.offset as string) || 0;
    const batchNumber = parseInt(req.query.batchNumber as string) || 1;
    const seed = parseInt(req.query.seed as string) || Date.now();
    
    console.log(`Fetching ${count} onboarding films with offset ${offset}, batch ${batchNumber}, seed ${seed}`);
    
    // Get films from curated list in onboarding service
    const films = await onboardingService.getFilmsForOnboardingRatings(
      count,
      offset,
      batchNumber,
      seed
    );
    
    // Check if we have films with proper poster URLs
    const filmsWithPosters = films.filter(film => film.posterUrl && film.posterUrl.trim() !== '');
    if (filmsWithPosters.length < films.length) {
      console.warn(`Warning: ${films.length - filmsWithPosters.length} films missing valid poster URLs`);
    }
    
    console.log(`Returning ${films.length} curated films for onboarding, first film: ${films[0]?.title || 'none'}`);
    res.json({ films });
  } catch (error) {
    console.error("Error fetching films for onboarding:", error);
    res.status(500).json({ error: "Failed to fetch films" });
  }
});

// Save a single film rating
router.post("/rate", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    
    // Validate request body
    const validation = ratingSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid rating data", details: validation.error.format() });
    }
    
    const { filmId, filmTitle, filmPosterUrl, rating, status } = validation.data;
    const batchNumber = req.body.batchNumber || 1;
    
    // Save the rating
    const result = await onboardingService.saveFilmRating(
      user.id,
      filmId,
      filmTitle,
      filmPosterUrl,
      rating,
      status,
      batchNumber
    );
    
    res.json({ success: true, rating: result });
  } catch (error) {
    console.error("Error saving film rating:", error);
    res.status(500).json({ error: "Failed to save film rating" });
  }
});

// Save multiple film ratings at once
router.post("/rate-batch", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    
    // Validate request body
    const validation = batchRatingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid batch rating data", details: validation.error.format() });
    }
    
    const { ratings, batchNumber } = validation.data;
    
    // Save all ratings
    const result = await onboardingService.saveMultipleRatings(
      user.id,
      ratings,
      batchNumber
    );
    
    res.json({ 
      success: true, 
      result,
      progress: result.progress,
      complete: result.progress >= 100
    });
  } catch (error) {
    console.error("Error saving batch ratings:", error);
    res.status(500).json({ error: "Failed to save batch ratings" });
  }
});

// Complete onboarding
router.post("/complete", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    
    // Mark onboarding as complete
    const updatedState = await onboardingService.completeOnboarding(user.id);
    
    res.json({ 
      success: true, 
      onboardingState: updatedState
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

// Get all onboarding ratings for the current user
router.get("/ratings", isAuthenticated, async (req, res) => {
  try {
    const user = req.user!;
    
    const ratings = await onboardingService.getUserOnboardingRatings(user.id);
    
    res.json({ ratings });
  } catch (error) {
    console.error("Error fetching onboarding ratings:", error);
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
});

export default router;