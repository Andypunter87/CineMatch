import { 
  users,
  watchlist,
  analytics,
  friends,
  friendRequests,
  notifications,
  userRecommendations,
  type User,
  type InsertUser,
  type Film,
  type RecommendationRequest,
  type InsertAnalytics,
  type Analytics,
  type Friend,
  type InsertFriend,
  type FriendRequest,
  type InsertFriendRequest,
  type Notification,
  type InsertNotification,
  type UserRecommendations,
  type InsertUserRecommendations
} from "@shared/schema";
import { films } from "./data/films";
import { db } from "./db";
import { eq, and, or, desc, gte, lte, sql, count, SQL, inArray } from "drizzle-orm";
import session from "express-session";
import { getAIRecommendations } from "./services/openai";
import { getEnhancedRecommendations } from "./services/recommendation-enhancer";
import connectPg from "connect-pg-simple";

// Define watchlist item structure
export type WatchlistItem = typeof watchlist.$inferSelect;

// Define watchlist insert structure
export type InsertWatchlistItem = typeof watchlist.$inferInsert;

// Define Storage Interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserWithFallback(id: number): Promise<User | undefined>; // Fallback method for migrations
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderId(providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStreamingServices(userId: number, streamingServices: string[]): Promise<User>;
  updateUserCountry(userId: number, country: string): Promise<User>;
  updateUserPassword(userId: number, passwordHash: string): Promise<User>;
  updateOnboardingStatus(userId: number, needsOnboarding: boolean): Promise<User>;
  
  // Friend operations
  getFriends(userId: number): Promise<User[]>;
  addFriend(userId: number, friendId: number): Promise<Friend>;
  removeFriend(userId: number, friendId: number): Promise<void>;
  createFriendRequest(request: InsertFriendRequest): Promise<FriendRequest>;
  getFriendRequestByInviteCode(inviteCode: string): Promise<FriendRequest | undefined>;
  updateFriendRequestStatus(requestId: number, status: string): Promise<FriendRequest>;
  getFriendRequestsByUserId(userId: number): Promise<FriendRequest[]>;
  
  // Recommendation operations
  getRecommendations(preferences: RecommendationRequest): Promise<Film[]>;
  saveUserRecommendations(userId: number, preferences: RecommendationRequest, recommendations: Film[]): Promise<UserRecommendations>;
  getUserLastRecommendations(userId: number): Promise<UserRecommendations | undefined>;
  getUserRatedFilms(userId: number): Promise<{ filmId: number; title: string; genres: string[]; rating: number; filmType: string }[]>; // New method to get user's rated films
  
  // Film operations
  getFilmById(filmId: number): Promise<Film | undefined>;
  getPopularFilmsForOnboarding(count: number): Promise<Film[]>;
  
  // Watchlist operations
  getWatchlistItems(userId: number): Promise<WatchlistItem[]>;
  getWatchlistItem(userId: number, itemId: number): Promise<WatchlistItem | undefined>;
  getWatchlistItemByFilmId(userId: number, filmId: number): Promise<WatchlistItem | undefined>;
  addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem>;
  updateWatchlistItem(itemId: number, updates: Partial<InsertWatchlistItem>): Promise<WatchlistItem>;
  removeFromWatchlist(userId: number, itemId: number): Promise<void>;
  
  // Analytics operations
  trackEvent(eventData: InsertAnalytics): Promise<void>;
  getAnalytics(filter?: {
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: number;
  }): Promise<Analytics[]>;
  getUserCount(): Promise<number>;
  getEventCount(eventType: string): Promise<number>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  
  sessionStore: any; // Using any for session store to avoid type issues
}

// PostgreSQL session store
const PostgresSessionStore = connectPg(session);

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  private films: Film[];
  sessionStore: any; // Using any for session store type
  
  constructor() {
    this.films = films;
    
    // Initialize session store with PostgreSQL
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: false
      },
      createTableIfMissing: true
    });
  }
  
  // Watchlist operations implementation
  async getWatchlistItems(userId: number): Promise<WatchlistItem[]> {
    try {
      const items = await db
        .select()
        .from(watchlist)
        .where(eq(watchlist.userId, userId))
        .orderBy(desc(watchlist.dateAdded));
      return items;
    } catch (error) {
      console.error("Error retrieving watchlist items:", error);
      throw new Error("Failed to retrieve watchlist items");
    }
  }
  
  async getWatchlistItem(userId: number, itemId: number): Promise<WatchlistItem | undefined> {
    try {
      const [item] = await db
        .select()
        .from(watchlist)
        .where(and(
          eq(watchlist.userId, userId),
          eq(watchlist.id, itemId)
        ));
      return item;
    } catch (error) {
      console.error("Error retrieving watchlist item:", error);
      return undefined;
    }
  }
  
  async addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem> {
    try {
      // Check if the film is already in the user's watchlist
      const [existingItem] = await db
        .select()
        .from(watchlist)
        .where(and(
          eq(watchlist.userId, item.userId),
          eq(watchlist.filmId, item.filmId)
        ));
      
      // If it already exists, return the existing item
      if (existingItem) {
        return existingItem;
      }
      
      // Otherwise, insert the new item
      const [newItem] = await db
        .insert(watchlist)
        .values(item)
        .returning();
      return newItem;
    } catch (error) {
      console.error("Error adding item to watchlist:", error);
      throw new Error("Failed to add item to watchlist");
    }
  }
  
  async updateWatchlistItem(itemId: number, updates: Partial<InsertWatchlistItem>): Promise<WatchlistItem> {
    try {
      const [updatedItem] = await db
        .update(watchlist)
        .set(updates)
        .where(eq(watchlist.id, itemId))
        .returning();
      return updatedItem;
    } catch (error) {
      console.error("Error updating watchlist item:", error);
      throw new Error("Failed to update watchlist item");
    }
  }
  
  async removeFromWatchlist(userId: number, itemId: number): Promise<void> {
    try {
      await db
        .delete(watchlist)
        .where(and(
          eq(watchlist.userId, userId),
          eq(watchlist.id, itemId)
        ));
    } catch (error) {
      console.error("Error removing item from watchlist:", error);
      throw new Error("Failed to remove item from watchlist");
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error retrieving user:", error);
      return undefined;
    }
  }
  
  /**
   * Fallback method to get user when there might be schema changes/migrations
   * Uses raw SQL query to only select columns we know exist
   */
  async getUserWithFallback(id: number): Promise<User | undefined> {
    try {
      // Use a raw SQL query to select only the basic fields we know exist
      // This avoids issues with Drizzle trying to access columns that might not exist yet
      const result = await db.execute(sql`
        SELECT 
          id, username, email, name, streaming_services, country, 
          auth_provider, provider_id, password, is_admin
        FROM users 
        WHERE id = ${id}
      `);
      
      if (result.length === 0) {
        return undefined;
      }
      
      // Convert the result to a User object
      const user = result[0];
      return {
        ...user,
        streamingServices: user.streaming_services,
        authProvider: user.auth_provider,
        providerId: user.provider_id,
        isAdmin: user.is_admin === true // Convert to boolean in case it's null
      } as User;
    } catch (error) {
      console.error("Error retrieving user with fallback:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error retrieving user by username:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error("Error retrieving user by email:", error);
      return undefined;
    }
  }

  async getUserByProviderId(providerId: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.providerId, providerId));
      return user;
    } catch (error) {
      console.error("Error retrieving user by provider ID:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }

  async updateUserStreamingServices(userId: number, streamingServices: string[]): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ streamingServices })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user streaming services:", error);
      throw new Error("Failed to update user streaming services");
    }
  }

  async updateUserCountry(userId: number, country: string): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ country })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user country:", error);
      throw new Error("Failed to update user country");
    }
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ password: passwordHash })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user password:", error);
      throw new Error("Failed to update user password");
    }
  }
  
  /**
   * Update the onboarding status for a user
   * @param userId The ID of the user to update
   * @param needsOnboarding Whether the user needs onboarding
   * @returns The updated user
   */
  async updateOnboardingStatus(userId: number, needsOnboarding: boolean): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ needsOnboarding })
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user onboarding status:", error);
      throw new Error("Failed to update user onboarding status");
    }
  }

  async getRecommendations(preferences: RecommendationRequest): Promise<Film[]> {
    try {
      // Use enhanced recommendations that combine OpenAI with TMDB data for streaming availability
      // If this is a "Show More" request with a batch size and exclusions, log it
      if (preferences.requestedBatchSize) {
        console.log(`Processing recommendation request with batch size: ${preferences.requestedBatchSize}`);
        
        if (preferences.excludeFilmIds && preferences.excludeFilmIds.length > 0) {
          console.log(`Excluding ${preferences.excludeFilmIds.length} films from recommendations`);
        }
      }
      
      return await getEnhancedRecommendations(preferences);
    } catch (error) {
      console.error("Error getting enhanced recommendations, falling back to local algorithm:", error);
      
      // Fallback to local algorithm if OpenAI fails
      const scoredFilms = this.films.map(film => {
        let score = 0;
        let matchReason = "";
  
        // Score based on audience (previously location)
        if (preferences.audience === "solo" && 
            (film.genres.includes("Drama") || film.genres.includes("Documentary"))) {
          score += 20;
          matchReason = "for solo viewing";
        } else if (preferences.audience === "date" && 
                  (film.genres.includes("Romance") || film.genres.includes("Comedy"))) {
          score += 25;
          matchReason = "for a perfect date night";
        } else if (preferences.audience === "friends" && 
                  (film.genres.includes("Comedy") || film.genres.includes("Action") || film.genres.includes("Horror"))) {
          score += 20;
          matchReason = "for watching with friends";
        } else if (preferences.audience === "family" && 
                  (film.genres.includes("Family") || film.genres.includes("Adventure") || film.genres.includes("Animation"))) {
          score += 20;
          matchReason = "for family viewing";
        }
  
        // Handle timeOfDay as array
        const timeTypes = preferences.timeOfDay;
        for (const timeType of timeTypes) {
          if (timeType === "weekday" && 
              (film.genres.includes("Comedy") || film.genres.includes("Romance"))) {
            score += 15;
            matchReason += matchReason ? " during a weekday evening" : "a weekday evening";
          } else if (timeType === "weekend" && 
                    (film.genres.includes("Action") || film.genres.includes("Adventure") || film.genres.includes("Sci-Fi"))) {
            score += 15;
            matchReason += matchReason ? " during the weekend" : "a weekend watch";
          } else if (timeType === "late" && 
                    (film.genres.includes("Horror") || film.genres.includes("Thriller") || film.genres.includes("Mystery"))) {
            score += 25;
            matchReason += matchReason ? " late at night" : "a late night session";
          } else if (timeType === "morning" && 
                    (film.genres.includes("Family") || film.genres.includes("Animation") || film.genres.includes("Documentary"))) {
            score += 20;
            matchReason += matchReason ? " in the morning" : "a morning or daytime watch";
          }
        }
  
        // Score based on mood
        if (preferences.mood === "laugh" && film.genres.includes("Comedy")) {
          score += 30;
          matchReason += matchReason ? " when you want to laugh" : "when you want to laugh";
        } else if (preferences.mood === "think" && 
                  (film.genres.includes("Mystery") || film.genres.includes("Sci-Fi") || film.genres.includes("Thriller"))) {
          score += 30;
          matchReason += matchReason ? " when you want to think" : "when you want something thought-provoking";
        } else if (preferences.mood === "cry" && 
                  (film.genres.includes("Drama") || film.genres.includes("Romance"))) {
          score += 30;
          matchReason += matchReason ? " when you need a good cry" : "when you need a good cry";
        } else if (preferences.mood === "thrill" && 
                  (film.genres.includes("Action") || film.genres.includes("Horror") || film.genres.includes("Thriller"))) {
          score += 30;
          matchReason += matchReason ? " when you want thrills" : "when you want something thrilling";
        } else if (preferences.mood === "escape" && 
                  (film.genres.includes("Fantasy") || film.genres.includes("Sci-Fi") || film.genres.includes("Adventure"))) {
          score += 30;
          matchReason += matchReason ? " when you want to escape" : "when you want to escape reality";
        } else if (preferences.mood === "inspire" && 
                  (film.genres.includes("Biography") || film.genres.includes("Documentary") || film.genres.includes("Drama"))) {
          score += 30;
          matchReason += matchReason ? " when you want inspiration" : "when you need inspiration";
        }
  
        // Add a small random factor to avoid identical scores
        score += Math.random() * 5;
  
        // Convert score to a percentage match (max possible score would be around 85)
        const matchPercentage = Math.min(98, Math.floor((score / 85) * 100));
  
        return {
          ...film,
          matchPercentage,
          matchReason,
          score
        };
      });
  
      // Sort films by score (highest first) and take top 8
      const recommendations = scoredFilms
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
  
      return recommendations;
    }
  }
  
  // Analytics operations implementation
  async trackEvent(eventData: InsertAnalytics): Promise<void> {
    try {
      await db
        .insert(analytics)
        .values(eventData);
      console.log(`Tracked event: ${eventData.eventType}`);
    } catch (error) {
      console.error("Error tracking event:", error);
      // Don't throw an error here to avoid disrupting the main application flow
    }
  }
  
  async getAnalytics(filter?: {
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: number;
  }): Promise<Analytics[]> {
    try {
      // Create filters array
      const filters: any[] = [];
      
      // Apply filters if provided
      if (filter) {
        if (filter.eventType) {
          filters.push(eq(analytics.eventType, filter.eventType));
        }
        
        if (filter.userId) {
          filters.push(eq(analytics.userId, filter.userId));
        }
        
        if (filter.startDate) {
          filters.push(gte(analytics.timestamp, filter.startDate));
        }
        
        if (filter.endDate) {
          filters.push(lte(analytics.timestamp, filter.endDate));
        }
      }
      
      // Apply all filters at once if there are any
      const results = filters.length > 0
        ? await db.select().from(analytics).where(and(...filters)).orderBy(desc(analytics.timestamp))
        : await db.select().from(analytics).orderBy(desc(analytics.timestamp));
      
      return results;
    } catch (error) {
      console.error("Error retrieving analytics:", error);
      return [];
    }
  }
  
  async getUserCount(): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(users);
      
      return result.count;
    } catch (error) {
      console.error("Error getting user count:", error);
      return 0;
    }
  }
  
  async getEventCount(eventType: string): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(analytics)
        .where(eq(analytics.eventType, eventType));
      
      return result.count;
    } catch (error) {
      console.error("Error getting event count:", error);
      return 0;
    }
  }

  // Friend operations implementation
  async getFriends(userId: number): Promise<User[]> {
    try {
      // First, get all friendships where this user is the first user
      const directFriendships = await db
        .select({
          friendId: friends.friendId,
        })
        .from(friends)
        .where(eq(friends.userId, userId));
      
      // Then, get all friendships where this user is the second user
      const inverseFriendships = await db
        .select({
          friendId: friends.userId,
        })
        .from(friends)
        .where(eq(friends.friendId, userId));
      
      // Combine the friend IDs
      const friendIds = [
        ...directFriendships.map(f => f.friendId),
        ...inverseFriendships.map(f => f.friendId)
      ];
      
      // If no friends found, return empty array
      if (friendIds.length === 0) {
        return [];
      }
      
      // Get the actual user objects for all these friends
      
      // Use proper parameterization with in clause
      const placeholders = friendIds.map(id => `${id}`).join(', ');
      const friendUsers = await db
        .select()
        .from(users)
        .where(sql`${users.id} IN (${sql.raw(placeholders)})`);
      
      return friendUsers;
    } catch (error) {
      console.error("Error retrieving friends:", error);
      return [];
    }
  }
  
  async addFriend(userId: number, friendId: number): Promise<Friend> {
    try {
      // Check if friendship already exists
      const existingFriendship = await db
        .select()
        .from(friends)
        .where(
          or(
            and(
              eq(friends.userId, userId),
              eq(friends.friendId, friendId)
            ),
            and(
              eq(friends.userId, friendId),
              eq(friends.friendId, userId)
            )
          )
        );
      
      if (existingFriendship.length > 0) {
        throw new Error("Friendship already exists");
      }
      
      // Create new friendship
      const [newFriendship] = await db
        .insert(friends)
        .values({
          userId,
          friendId
        })
        .returning();
      
      return newFriendship;
    } catch (error) {
      console.error("Error adding friend:", error);
      throw new Error("Failed to add friend");
    }
  }
  
  async removeFriend(userId: number, friendId: number): Promise<void> {
    try {
      await db
        .delete(friends)
        .where(
          or(
            and(
              eq(friends.userId, userId),
              eq(friends.friendId, friendId)
            ),
            and(
              eq(friends.userId, friendId),
              eq(friends.friendId, userId)
            )
          )
        );
    } catch (error) {
      console.error("Error removing friend:", error);
      throw new Error("Failed to remove friend");
    }
  }
  
  async createFriendRequest(request: InsertFriendRequest): Promise<FriendRequest> {
    try {
      const [newRequest] = await db
        .insert(friendRequests)
        .values(request)
        .returning();
      
      return newRequest;
    } catch (error) {
      console.error("Error creating friend request:", error);
      throw new Error("Failed to create friend request");
    }
  }
  
  async getFriendRequestByInviteCode(inviteCode: string): Promise<FriendRequest | undefined> {
    try {
      const [request] = await db
        .select()
        .from(friendRequests)
        .where(eq(friendRequests.inviteCode, inviteCode));
      
      return request;
    } catch (error) {
      console.error("Error retrieving friend request:", error);
      return undefined;
    }
  }
  
  async updateFriendRequestStatus(requestId: number, status: string): Promise<FriendRequest> {
    try {
      // Normalize status to ensure consistency
      // 'accept' will be stored as 'accepted', 'reject' as 'rejected'
      // This handles any inconsistencies in the API calls
      let normalizedStatus = status;
      if (status === 'accept') {
        normalizedStatus = 'accepted';
      } else if (status === 'reject') {
        normalizedStatus = 'rejected';
      }
      
      console.log(`Updating friend request ${requestId} status to: ${normalizedStatus} (original: ${status})`);
      
      const [updatedRequest] = await db
        .update(friendRequests)
        .set({ status: normalizedStatus })
        .where(eq(friendRequests.id, requestId))
        .returning();
      
      return updatedRequest;
    } catch (error) {
      console.error("Error updating friend request status:", error);
      throw new Error("Failed to update friend request status");
    }
  }
  
  async getFriendRequestsByUserId(userId: number): Promise<FriendRequest[]> {
    try {
      // Get the user's email
      const userResult = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId));
      
      if (!userResult.length) return [];
      
      const userEmail = userResult[0].email;
      
      // Get requests either sent by user or addressed to user's email
      const requests = await db
        .select()
        .from(friendRequests)
        .where(
          or(
            eq(friendRequests.userId, userId),
            eq(friendRequests.email, userEmail)
          )
        )
        .orderBy(desc(friendRequests.createdAt));
      
      return requests;
    } catch (error) {
      console.error("Error retrieving friend requests:", error);
      return [];
    }
  }
  
  // Notification operations implementation
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [newNotification] = await db
        .insert(notifications)
        .values(notification)
        .returning();
      return newNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw new Error("Failed to create notification");
    }
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    try {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
      return userNotifications;
    } catch (error) {
      console.error("Error getting user notifications:", error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<Notification> {
    try {
      const [updatedNotification] = await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId))
        .returning();
      return updatedNotification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw new Error("Failed to mark notification as read");
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw new Error("Failed to mark all notifications as read");
    }
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ));
      return result.count;
    } catch (error) {
      console.error("Error getting unread notifications count:", error);
      return 0;
    }
  }

  // User recommendation history operations
  async saveUserRecommendations(userId: number, preferences: RecommendationRequest, recommendations: Film[]): Promise<UserRecommendations> {
    try {
      // First, check if there's an existing recommendation for this user
      const [existingRecommendation] = await db
        .select()
        .from(userRecommendations)
        .where(eq(userRecommendations.userId, userId));
      
      const now = new Date();
      
      if (existingRecommendation) {
        // Update the existing recommendation
        const [updated] = await db
          .update(userRecommendations)
          .set({
            preferences,
            recommendations,
            updatedAt: now
          })
          .where(eq(userRecommendations.id, existingRecommendation.id))
          .returning();
        
        return updated;
      } else {
        // Insert a new recommendation
        const [newRecommendation] = await db
          .insert(userRecommendations)
          .values({
            userId,
            preferences,
            recommendations,
            createdAt: now,
            updatedAt: now
          })
          .returning();
          
        return newRecommendation;
      }
    } catch (error) {
      console.error("Error saving user recommendations:", error);
      throw new Error("Failed to save user recommendations");
    }
  }
  
  async getUserLastRecommendations(userId: number): Promise<UserRecommendations | undefined> {
    try {
      const [lastRecommendation] = await db
        .select()
        .from(userRecommendations)
        .where(eq(userRecommendations.userId, userId))
        .orderBy(desc(userRecommendations.updatedAt))
        .limit(1);
      
      return lastRecommendation;
    } catch (error) {
      console.error("Error getting user's last recommendations:", error);
      return undefined;
    }
  }
  
  /**
   * Gets all films rated by the user from the watchlist
   * This is used to inform the recommendation engine of user preferences
   */
  async getUserRatedFilms(userId: number): Promise<{ filmId: number; title: string; genres: string[]; rating: number; filmType: string }[]> {
    try {
      // Get all watchlist items with non-null ratings
      const ratedItems = await db
        .select()
        .from(watchlist)
        .where(and(
          eq(watchlist.userId, userId),
          sql`${watchlist.userRating} IS NOT NULL`
        ));
      
      // Map to the required format with just the necessary fields
      return ratedItems
        .filter(item => item.userRating !== null && item.userRating > 0)
        .map(item => ({
          filmId: item.filmId,
          title: item.filmTitle,
          genres: item.filmGenres || [],
          rating: item.userRating as number,
          filmType: item.filmType || 'unknown'
        }));
    } catch (error) {
      console.error("Error getting user's rated films:", error);
      return [];
    }
  }
  
  /**
   * Get a film by its ID
   */
  async getFilmById(filmId: number): Promise<Film | undefined> {
    try {
      // First, check if it's in our static film list (faster)
      const filmFromStatic = this.films.find(film => film.id === filmId);
      if (filmFromStatic) {
        return filmFromStatic;
      }
      
      // If not found in static list, check if we have any watchlist entries for this film
      // This can help with films added from external sources like TMDB
      const [watchlistItem] = await db
        .select()
        .from(watchlist)
        .where(eq(watchlist.filmId, filmId))
        .limit(1);
        
      if (watchlistItem) {
        // Construct a Film object from the watchlist item
        return {
          id: watchlistItem.filmId,
          title: watchlistItem.filmTitle,
          year: watchlistItem.filmYear || 2000,
          director: watchlistItem.filmDirector || "Unknown",
          actors: [], // We don't store actors in watchlist
          synopsis: "No synopsis available", // We don't have synopsis in watchlist
          genres: watchlistItem.filmGenres || [],
          type: (watchlistItem.filmType as "mainstream" | "indie") || "mainstream",
          posterUrl: watchlistItem.filmPosterUrl || "",
          tmdbId: watchlistItem.tmdbId ? Number(watchlistItem.tmdbId) : undefined,
          runtime: watchlistItem.runtime ? Number(watchlistItem.runtime) : undefined,
          voteAverage: watchlistItem.voteAverage ? Number(watchlistItem.voteAverage) : undefined
        };
      }
      
      // If we still haven't found it, return undefined
      return undefined;
    } catch (error) {
      console.error(`Error getting film with ID ${filmId}:`, error);
      return undefined;
    }
  }
  
  /**
   * Get a list of popular films for the onboarding process
   */
  async getPopularFilmsForOnboarding(count: number): Promise<Film[]> {
    try {
      // Create a mix of mainstream and indie films across different genres
      const genreMix = [
        "Comedy", "Drama", "Action", "Sci-Fi", 
        "Romance", "Thriller", "Horror", "Animation", 
        "Adventure", "Family", "Documentary", "Fantasy"
      ];
      
      // Select films to ensure a mix of:
      // 1. Genres (using the genreMix array)
      // 2. Types (both mainstream and indie)
      // 3. Years (a range of decades)
      const selectedFilms: Film[] = [];
      const usedIds = new Set<number>();
      
      // First, ensure we have at least one film from each primary genre if possible
      for (const genre of genreMix) {
        // Find films matching this genre that haven't been selected yet
        const matchingFilms = this.films.filter(film => 
          film.genres.includes(genre) && 
          !usedIds.has(film.id) &&
          // Prefer films with poster URLs and higher match potential
          film.posterUrl && 
          film.synopsis && 
          film.synopsis.length > 20
        );
        
        if (matchingFilms.length > 0) {
          // Sort by year in descending order and take the first one
          // This prioritizes newer films that are more likely to be recognized
          const selectedFilm = matchingFilms.sort((a, b) => b.year - a.year)[0];
          selectedFilms.push(selectedFilm);
          usedIds.add(selectedFilm.id);
          
          // If we have enough films, stop
          if (selectedFilms.length >= count) {
            break;
          }
        }
      }
      
      // If we don't have enough films yet, add more popular ones
      if (selectedFilms.length < count) {
        // Sort remaining films by recency and select enough to reach the count
        const remainingFilms = this.films
          .filter(film => !usedIds.has(film.id) && film.posterUrl && film.synopsis)
          .sort((a, b) => b.year - a.year)
          .slice(0, count - selectedFilms.length);
          
        selectedFilms.push(...remainingFilms);
      }
      
      return selectedFilms;
    } catch (error) {
      console.error("Error getting popular films for onboarding:", error);
      
      // Fallback: return a subset of the static film list if there's an error
      return this.films
        .filter(film => film.posterUrl)
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
    }
  }
  
  /**
   * Get a watchlist item by user ID and film ID
   */
  async getWatchlistItemByFilmId(userId: number, filmId: number): Promise<WatchlistItem | undefined> {
    try {
      const [item] = await db
        .select()
        .from(watchlist)
        .where(and(
          eq(watchlist.userId, userId),
          eq(watchlist.filmId, filmId)
        ));
      return item;
    } catch (error) {
      console.error(`Error getting watchlist item for user ${userId} and film ${filmId}:`, error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();
