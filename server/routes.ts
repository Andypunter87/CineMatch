import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { RecommendationRequest, recommendationRequestSchema, watchlist } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { setupAuth } from "./auth";
import { initializeDatabase } from "./db";
import adminRoutes from "./admin";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { sendFriendInvitationEmail } from "./services/email";

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
  
  // Register admin routes
  app.use('/api/admin', adminRoutes);
  
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
      
      // Track recommendation request
      const userId = req.isAuthenticated() && req.user ? req.user.id : undefined;
      storage.trackEvent({
        eventType: 'recommendation_request',
        userId,
        data: {
          location: preferences.location,
          mood: preferences.mood,
          timeOfDay: preferences.timeOfDay,
          hasStreamingServices: !!preferences.streamingServices?.length,
          country: preferences.country || 'unknown',
          resultCount: recommendations.length
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      }).catch(err => console.error('Error tracking recommendation event:', err));
      
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
  
  // SEO Routes
  // Google site verification
  app.get('/googleq9bwQxn38m7f86Zoa3bZBVq6zEOBulsJO4QPJdpmCN4.html', (_req, res) => {
    res.type('text/html');
    res.send('google-site-verification: googleq9bwQxn38m7f86Zoa3bZBVq6zEOBulsJO4QPJdpmCN4.html');
  });
  
  // Serve robots.txt
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /

# Sitemap location
Sitemap: https://cine-match.replit.app/sitemap.xml`);
  });
  
  // Serve sitemap.xml
  app.get('/sitemap.xml', (_req, res) => {
    res.header('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cine-match.replit.app/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/auth</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/watchlist</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/profile</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/terms</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/privacy</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://cine-match.replit.app/admin</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`);
  });
  
  // Recommendation Feedback API route
  app.post('/api/feedback', async (req, res) => {
    try {
      const schema = z.object({
        filmId: z.number(),
        filmTitle: z.string(),
        feedback: z.enum(['like', 'dislike']),
        recommendationContext: z.any().optional()
      });
      
      const { filmId, filmTitle, feedback, recommendationContext } = schema.parse(req.body);
      
      // Get user ID if authenticated
      const userId = req.isAuthenticated() && req.user ? req.user.id : undefined;
      
      // Track feedback event in analytics
      await storage.trackEvent({
        eventType: feedback === 'like' ? 'recommendation_liked' : 'recommendation_disliked',
        userId,
        data: {
          filmId,
          filmTitle,
          feedback,
          recommendationContext: JSON.stringify(recommendationContext)
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      });
      
      res.status(200).json({ 
        success: true, 
        message: `Feedback recorded: ${feedback === 'like' ? 'positive' : 'negative'}`
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error recording feedback:', error);
        res.status(500).json({ message: 'Failed to record feedback' });
      }
    }
  });
  
  // Watchlist API Routes
  
  // Get user watchlist
  app.get('/api/watchlist', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const watchlistItems = await storage.getWatchlistItems(userId);
      res.json(watchlistItems);
    } catch (error) {
      console.error('Error retrieving watchlist:', error);
      res.status(500).json({ message: 'Failed to retrieve watchlist' });
    }
  });
  
  // Add a film to the watchlist
  app.post('/api/watchlist', isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        filmId: z.number(),
        filmTitle: z.string(),
        filmYear: z.number().optional(),
        filmDirector: z.string().optional(),
        filmType: z.string().optional(),
        filmGenres: z.array(z.string()).optional(),
        filmPosterUrl: z.string().optional(),
        recommendationContext: z.any().optional() // Context of the recommendation
      });
      
      const filmData = schema.parse(req.body);
      const userId = req.user!.id;
      
      const newWatchlistItem = await storage.addToWatchlist({
        userId,
        ...filmData
      });
      
      // Track watchlist add event
      storage.trackEvent({
        eventType: 'watchlist_add',
        userId,
        data: {
          filmId: filmData.filmId,
          filmTitle: filmData.filmTitle,
          filmYear: filmData.filmYear,
          filmGenres: filmData.filmGenres?.join(',') || ''
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      }).catch(err => console.error('Error tracking watchlist add event:', err));
      
      res.status(201).json(newWatchlistItem);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error adding to watchlist:', error);
        res.status(500).json({ message: 'Failed to add film to watchlist' });
      }
    }
  });
  
  // Update a watchlist item (mark as watched, rate, etc.)
  app.put('/api/watchlist/:id', isAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // First check if the item exists and belongs to the user
      const existingItem = await storage.getWatchlistItem(userId, itemId);
      if (!existingItem) {
        return res.status(404).json({ message: 'Watchlist item not found' });
      }
      
      const schema = z.object({
        watched: z.boolean().optional(),
        userRating: z.number().min(1).max(5).optional(),
        userNotes: z.string().optional()
      });
      
      const { watched, userRating, userNotes } = schema.parse(req.body);
      
      // Create update object with proper types
      const updates: Partial<typeof watchlist.$inferInsert> = {
        watched,
        userRating,
        userNotes
      };
      
      // If marking as watched, set the date to now
      if (watched) {
        updates.dateWatched = new Date();
      }
      
      const updatedItem = await storage.updateWatchlistItem(itemId, updates);
      
      // Track watched film if that's being updated
      if (watched) {
        storage.trackEvent({
          eventType: 'film_watched',
          userId,
          data: {
            filmId: existingItem.filmId,
            filmTitle: existingItem.filmTitle,
            userRating,
            hasNotes: !!userNotes
          } as Record<string, any>,
          ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
          userAgent: req.headers['user-agent'] as string || 'unknown'
        }).catch(err => console.error('Error tracking film watched event:', err));
      }
      
      // Track if rating was added
      if (userRating && (!existingItem.userRating || existingItem.userRating !== userRating)) {
        storage.trackEvent({
          eventType: 'film_rated',
          userId,
          data: {
            filmId: existingItem.filmId,
            filmTitle: existingItem.filmTitle,
            rating: userRating
          } as Record<string, any>,
          ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
          userAgent: req.headers['user-agent'] as string || 'unknown'
        }).catch(err => console.error('Error tracking film rating event:', err));
      }
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      } else {
        console.error('Error updating watchlist item:', error);
        res.status(500).json({ message: 'Failed to update watchlist item' });
      }
    }
  });
  
  // Remove a film from the watchlist
  app.delete('/api/watchlist/:id', isAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // First check if the item exists and belongs to the user
      const existingItem = await storage.getWatchlistItem(userId, itemId);
      if (!existingItem) {
        return res.status(404).json({ message: 'Watchlist item not found' });
      }
      
      await storage.removeFromWatchlist(userId, itemId);
      
      // Track watchlist remove event
      storage.trackEvent({
        eventType: 'watchlist_remove',
        userId,
        data: {
          filmId: existingItem.filmId,
          filmTitle: existingItem.filmTitle,
          wasWatched: !!existingItem.watched
        } as Record<string, any>,
        ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown'
      }).catch(err => console.error('Error tracking watchlist remove event:', err));
      
      res.status(204).end();
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      res.status(500).json({ message: 'Failed to remove film from watchlist' });
    }
  });

  // ============ FRIENDS API ROUTES ============

  // Get user's friends
  app.get('/api/friends', isAuthenticated, async (req, res) => {
    try {
      const friends = await storage.getFriends(req.user!.id);
      
      // Don't send password or other sensitive fields to client
      const safeUserData = friends.map(friend => ({
        id: friend.id,
        username: friend.username,
        name: friend.name,
        email: friend.email,
        streamingServices: friend.streamingServices,
        country: friend.country
      }));
      
      res.status(200).json(safeUserData);
    } catch (error) {
      console.error("Error getting friends:", error);
      res.status(500).json({ message: "Failed to retrieve friends" });
    }
  });

  // Create a new friend request
  app.post('/api/friend-requests', isAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Validate email format
      if (!email.includes('@') || !email.includes('.')) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // Check if the user is trying to invite themselves
      if (req.user!.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({ message: "You cannot invite yourself" });
      }
      
      // Check if the user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // If they are already friends, don't create duplicate
        const friends = await storage.getFriends(req.user!.id);
        const isAlreadyFriend = friends.some(friend => friend.id === existingUser.id);
        
        if (isAlreadyFriend) {
          return res.status(400).json({ message: "You are already friends with this user" });
        }
        
        // If they exist but aren't friends, create friend connection directly
        await storage.addFriend(req.user!.id, existingUser.id);
        
        return res.status(200).json({ 
          message: "Friend added successfully", 
          directAdd: true,
          friend: {
            id: existingUser.id,
            name: existingUser.name || existingUser.username,
            email: existingUser.email
          }
        });
      }
      
      // Generate a unique invite code
      const inviteCode = randomBytes(16).toString('hex');
      
      // Create the friend request with the email
      const newRequest = await storage.createFriendRequest({
        senderId: req.user!.id,
        email,
        inviteCode,
        status: 'pending'
      });
      
      // Send invitation email
      const senderName = req.user!.name || req.user!.username || 'A friend';
      const emailSent = await sendFriendInvitationEmail(
        senderName,
        email,
        inviteCode
      );
      
      // Track the event
      await storage.trackEvent({
        eventType: 'create_friend_request',
        userId: req.user!.id,
        data: { 
          requestId: newRequest.id,
          email,
          emailSent
        } as Record<string, any>,
        timestamp: new Date()
      });
      
      res.status(201).json({
        ...newRequest,
        emailSent
      });
    } catch (error) {
      console.error("Error creating friend request:", error);
      res.status(500).json({ message: "Failed to create friend request" });
    }
  });

  // Get friend requests created by the user
  app.get('/api/friend-requests', isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getFriendRequestsByUserId(req.user!.id);
      res.status(200).json(requests);
    } catch (error) {
      console.error("Error retrieving friend requests:", error);
      res.status(500).json({ message: "Failed to retrieve friend requests" });
    }
  });

  // Accept a friend request by invite code
  app.post('/api/friend-requests/accept', isAuthenticated, async (req, res) => {
    try {
      const { inviteCode } = req.body;
      
      if (!inviteCode) {
        return res.status(400).json({ message: "Invite code is required" });
      }
      
      // Find the friend request
      const request = await storage.getFriendRequestByInviteCode(inviteCode);
      
      if (!request) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      
      if (request.status !== 'pending') {
        return res.status(400).json({ message: "Friend request is not pending" });
      }
      
      // Cannot accept your own friend request
      if (request.senderId === req.user!.id) {
        return res.status(400).json({ message: "Cannot accept your own friend request" });
      }
      
      // Update the request status
      const updatedRequest = await storage.updateFriendRequestStatus(request.id, 'accepted');
      
      // Add each other as friends
      await storage.addFriend(request.senderId, req.user!.id);
      
      // Track the event
      await storage.trackEvent({
        eventType: 'accept_friend_request',
        userId: req.user!.id,
        data: { 
          requestId: request.id, 
          friendId: request.senderId 
        } as Record<string, any>,
        timestamp: new Date()
      });
      
      res.status(200).json({ 
        message: "Friend request accepted", 
        request: updatedRequest 
      });
    } catch (error) {
      console.error("Error accepting friend request:", error);
      res.status(500).json({ message: "Failed to accept friend request" });
    }
  });

  // Remove a friend
  app.delete('/api/friends/:friendId', isAuthenticated, async (req, res) => {
    try {
      const friendId = parseInt(req.params.friendId);
      
      if (isNaN(friendId)) {
        return res.status(400).json({ message: "Invalid friend ID" });
      }
      
      await storage.removeFriend(req.user!.id, friendId);
      
      // Track the event
      await storage.trackEvent({
        eventType: 'remove_friend',
        userId: req.user!.id,
        data: { 
          friendId: friendId 
        } as Record<string, any>,
        timestamp: new Date()
      });
      
      res.status(200).json({ message: "Friend removed successfully" });
    }
    catch (error) {
      console.error("Error removing friend:", error);
      res.status(500).json({ message: "Failed to remove friend" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
