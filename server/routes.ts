import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { RecommendationRequest, recommendationRequestSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { initializeDatabase } from "./db";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Function to check if user is authenticated, return 401 otherwise
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "You must be logged in to access this resource" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize the database
  await initializeDatabase();
  
  // Setup authentication routes and middleware
  setupAuth(app);
  
  // API endpoint for film recommendations
  app.post('/api/recommendations', async (req, res) => {
    try {
      // Extract user information if logged in
      const streamingServices = req.isAuthenticated() && req.user 
        ? req.user.streamingServices 
        : undefined;
        
      // Extract user country if logged in and not provided in request
      let country = req.body.country;
      if ((!country || country === '') && req.isAuthenticated() && req.user && req.user.country) {
        country = req.user.country;
      }
      
      // Validate input
      const preferences = recommendationRequestSchema.parse({
        ...req.body,
        streamingServices,
        country
      });
      
      // Get recommendations based on user preferences
      const recommendations = await storage.getRecommendations(preferences);
      
      res.json(recommendations);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('ZodError:', error.errors);
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
      // Extract query parameters - handle timeOfDay as array
      const { location, mood } = req.query;
      let timeOfDay = req.query.timeOfDay;
      let country = req.query.country as string | undefined;
      
      // Convert timeOfDay to array if it's a string
      if (typeof timeOfDay === 'string') {
        timeOfDay = [timeOfDay];
      }
      
      // Extract user information if logged in
      const streamingServices = req.isAuthenticated() && req.user 
        ? req.user.streamingServices 
        : undefined;
        
      // Use user's country if not provided and user is logged in
      if ((!country || country === '') && req.isAuthenticated() && req.user && req.user.country) {
        country = req.user.country;
      }
      
      // Validate input
      const preferences = recommendationRequestSchema.parse({
        location,
        timeOfDay, 
        mood,
        streamingServices,
        country
      });
      
      // Get recommendations
      const recommendations = await storage.getRecommendations(preferences);
      
      res.json(recommendations);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('ZodError:', error.errors);
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

  // Get list of available streaming services 
  app.get('/api/streaming-services', (req, res) => {
    // List of popular streaming services
    const streamingServices = [
      "Netflix", 
      "Amazon Prime", 
      "Hulu", 
      "Disney+", 
      "HBO Max", 
      "Apple TV+", 
      "Peacock", 
      "Paramount+", 
      "Crunchyroll",
      "Mubi",
      "Criterion Channel",
      "BBC iPlayer",
      "ITVX",
      "Channel 4"
    ];
    
    res.json(streamingServices);
  });

  // API routes for user profile management
  // Update user streaming services
  app.put('/api/user/streaming', isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        streamingServices: z.array(z.string())
      });
      
      const { streamingServices } = schema.parse(req.body);
      const userId = req.user!.id;
      
      const updatedUser = await storage.updateUserStreamingServices(userId, streamingServices);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error updating streaming services:', error);
        res.status(500).json({ message: 'Failed to update streaming services' });
      }
    }
  });

  // Update user country
  app.put('/api/user/country', isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        country: z.string().min(1, 'Country is required')
      });
      
      const { country } = schema.parse(req.body);
      const userId = req.user!.id;
      
      const updatedUser = await storage.updateUserCountry(userId, country);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error updating country:', error);
        res.status(500).json({ message: 'Failed to update country' });
      }
    }
  });

  // Change user password
  app.put('/api/user/password', isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(6, 'New password must be at least 6 characters')
      });
      
      const { currentPassword, newPassword } = schema.parse(req.body);
      const userId = req.user!.id;
      
      // Verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify user has a password
      if (!user.password) {
        return res.status(400).json({ message: 'User has no password set' });
      }
      
      // Compare passwords
      const parts = user.password.split('.');
      if (parts.length !== 2) {
        return res.status(400).json({ message: 'Password format is invalid' });
      }
      
      const [hashedPassword, salt] = parts;
      const hashedInputBuffer = (await scryptAsync(currentPassword, salt, 64)) as Buffer;
      const storedHashBuffer = Buffer.from(hashedPassword, 'hex');
      
      if (!timingSafeEqual(hashedInputBuffer, storedHashBuffer)) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const newSalt = randomBytes(16).toString('hex');
      const newHashedBuffer = (await scryptAsync(newPassword, newSalt, 64)) as Buffer;
      const newPasswordHash = `${newHashedBuffer.toString('hex')}.${newSalt}`;
      
      // Update the password
      const updatedUser = await storage.updateUserPassword(userId, newPasswordHash);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Failed to update password' });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
