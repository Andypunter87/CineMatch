import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { RecommendationRequest, recommendationRequestSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint for film recommendations
  app.post('/api/recommendations', async (req, res) => {
    try {
      // Validate input
      const preferences = recommendationRequestSchema.parse(req.body);
      
      // Get recommendations based on user preferences
      const recommendations = await storage.getRecommendations(preferences);
      
      res.json(recommendations);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: 'Invalid request data', 
          errors: error.errors 
        });
      } else {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ message: 'Failed to get recommendations' });
      }
    }
  });
  
  // Alternative GET route for recommendations with query parameters
  app.get('/api/recommendations', async (req, res) => {
    try {
      // Extract query parameters
      const { location, timeOfDay, mood } = req.query;
      
      // Validate input
      const preferences = recommendationRequestSchema.parse({
        location,
        timeOfDay, 
        mood
      });
      
      // Get recommendations
      const recommendations = await storage.getRecommendations(preferences);
      
      res.json(recommendations);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ 
          message: 'Invalid request data', 
          errors: error.errors 
        });
      } else {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ message: 'Failed to get recommendations' });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
