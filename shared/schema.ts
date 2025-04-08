import { pgTable, text, serial, integer, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username"), // Made optional to match new requirements
  email: text("email").notNull().unique(),
  password: text("password"),
  name: text("name"),
  streamingServices: text("streaming_services").array(),
  country: text("country"),
  authProvider: text("auth_provider").default("local"),
  providerId: text("provider_id"),
  isAdmin: boolean("is_admin").default(false),
});

// Friend requests table
export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(), // User who sent the invite
  email: text("email"), // Optional email of the invited person
  inviteCode: text("invite_code").notNull().unique(), // Unique code for invitation
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiration time
});

// Friends table (represents connections between users)
export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // First user in the friendship
  friendId: integer("friend_id").notNull(), // Second user in the friendship
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations for users
export const usersRelations = relations(users, ({ many }) => ({
  watchlistItems: many(watchlist),
  sentFriendRequests: many(friendRequests, { relationName: "senderRelation" }),
  friends: many(friends, { relationName: "userFriends" }),
  friendOf: many(friends, { relationName: "friendOfUser" }),
}));

// Define relations for friend requests
export const friendRequestRelations = relations(friendRequests, ({ one }) => ({
  sender: one(users, {
    fields: [friendRequests.senderId],
    references: [users.id],
    relationName: "senderRelation"
  }),
}));

// Define relations for friends
export const friendsRelations = relations(friends, ({ one }) => ({
  user: one(users, {
    fields: [friends.userId],
    references: [users.id],
    relationName: "userFriends"
  }),
  friend: one(users, {
    fields: [friends.friendId],
    references: [users.id],
    relationName: "friendOfUser"
  }),
}));

// Add watchlist table to track saved films
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  filmId: integer("film_id").notNull(),
  filmTitle: text("film_title").notNull(),
  filmYear: integer("film_year"),
  filmDirector: text("film_director"),
  filmType: text("film_type"),
  filmGenres: text("film_genres").array(),
  filmPosterUrl: text("film_poster_url"),
  // Context that generated this recommendation
  recommendationContext: json("recommendation_context").$type<RecommendationRequest>(),
  dateAdded: timestamp("date_added").defaultNow(),
  watched: boolean("watched").default(false),
  dateWatched: timestamp("date_watched"),
  userRating: integer("user_rating"), // 1-5 star rating
  userNotes: text("user_notes"),
  
  // TMDB specific fields
  tmdbId: integer("tmdb_id"),
  voteAverage: integer("vote_average"),
  runtime: integer("runtime"),
  originalLanguage: text("original_language"),
  releaseDate: text("release_date"),
});

// Define relations for watchlist
export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  name: true,
  streamingServices: true,
  country: true,
  authProvider: true,
  providerId: true,
  isAdmin: true,
});

// Define the film schema types
// Add analytics table to track usage data
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // registration, login, recommendation, watchlist_add, etc.
  userId: integer("user_id"), // Can be null for anonymous events
  data: json("data").$type<Record<string, any>>(), // Additional event data
  timestamp: timestamp("timestamp").defaultNow(),
  ip: text("ip"), // Store IP address for geographical data
  userAgent: text("user_agent"), // Browser and device info
});

export type Film = {
  id: number;
  title: string;
  year: number;
  director: string;
  actors: string[];
  synopsis: string;
  genres: string[];
  type: "mainstream" | "indie";
  posterUrl: string;
  matchPercentage?: number;
  matchReason?: string;
  availableOn?: string[]; // Streaming services where this film is available in the user's country
  
  // TMDB specific fields
  tmdbId?: number;
  voteAverage?: number;
  runtime?: number; // in minutes
  originalLanguage?: string;
  releaseDate?: string;
  availableStreamingByCountry?: Record<string, string[]>; // Map of country code to list of streaming services
  hasStreamingData?: boolean; // Flag to indicate if this film has streaming data from TMDB
  hasCompleteData?: boolean; // Flag to indicate if film has all required data (poster image and runtime)
};

// Define recommendation request schema
export const recommendationRequestSchema = z.object({
  location: z.enum(["home", "travel", "date", "friends"]),
  timeOfDay: z.array(z.enum(["weekday", "weekend", "late", "morning"])).min(1),
  mood: z.enum(["laugh", "think", "cry", "thrill", "escape", "inspire"]),
  runtime: z.array(z.enum(["short", "medium", "long"])).optional(),
  streamingServices: z.array(z.string()).optional(),
  country: z.string().optional(),
  excludeFilmIds: z.array(z.number()).optional(), // List of film IDs to exclude from recommendations
  viewingParty: z.array(z.number()).optional() // Array of friend IDs who are watching together
});

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

// Create insert schema for analytics
export const insertAnalyticsSchema = createInsertSchema(analytics);
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Analytics = typeof analytics.$inferSelect;

// Create friend request schema
export const insertFriendRequestSchema = createInsertSchema(friendRequests).pick({
  senderId: true,
  email: true,
  inviteCode: true,
  status: true,
  expiresAt: true,
});

// Create friend schema
export const insertFriendSchema = createInsertSchema(friends).pick({
  userId: true, 
  friendId: true
});

export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;

export type Friend = typeof friends.$inferSelect;
export type InsertFriend = z.infer<typeof insertFriendSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
