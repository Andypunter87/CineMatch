import { 
  users,
  watchlist,
  type User,
  type InsertUser,
  type Film,
  type RecommendationRequest
} from "@shared/schema";
import { films } from "./data/films";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import { getAIRecommendations } from "./services/openai";
import connectPg from "connect-pg-simple";

// Define watchlist item structure
export type WatchlistItem = typeof watchlist.$inferSelect;

// Define watchlist insert structure
export type InsertWatchlistItem = typeof watchlist.$inferInsert;

// Define Storage Interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderId(providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStreamingServices(userId: number, streamingServices: string[]): Promise<User>;
  updateUserCountry(userId: number, country: string): Promise<User>;
  updateUserPassword(userId: number, passwordHash: string): Promise<User>;
  
  // Recommendation operations
  getRecommendations(preferences: RecommendationRequest): Promise<Film[]>;
  
  // Watchlist operations
  getWatchlistItems(userId: number): Promise<WatchlistItem[]>;
  getWatchlistItem(userId: number, itemId: number): Promise<WatchlistItem | undefined>;
  addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem>;
  updateWatchlistItem(itemId: number, updates: Partial<InsertWatchlistItem>): Promise<WatchlistItem>;
  removeFromWatchlist(userId: number, itemId: number): Promise<void>;
  
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

  async getRecommendations(preferences: RecommendationRequest): Promise<Film[]> {
    try {
      // Use OpenAI API for recommendations
      return await getAIRecommendations(preferences);
    } catch (error) {
      console.error("Error getting AI recommendations, falling back to local algorithm:", error);
      
      // Fallback to local algorithm if OpenAI fails
      const scoredFilms = this.films.map(film => {
        let score = 0;
        let matchReason = "";
  
        // Score based on location
        if (preferences.location === "home" && 
            (film.genres.includes("Drama") || film.genres.includes("Documentary"))) {
          score += 20;
          matchReason = "a quiet night at home";
        } else if (preferences.location === "date" && 
                  (film.genres.includes("Romance") || film.genres.includes("Comedy"))) {
          score += 25;
          matchReason = "a perfect date night";
        } else if (preferences.location === "friends" && 
                  (film.genres.includes("Comedy") || film.genres.includes("Action") || film.genres.includes("Horror"))) {
          score += 20;
          matchReason = "watching with friends";
        } else if (preferences.location === "travel" && 
                  (film.genres.includes("Adventure") || film.genres.includes("Fantasy"))) {
          score += 20;
          matchReason = "when you're traveling";
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
}

export const storage = new DatabaseStorage();
