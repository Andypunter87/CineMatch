import { pgTable, text, serial, integer, timestamp, json, boolean, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Film type definition (used across multiple tables)
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
  source?: 'onboarding' | 'friend' | 'feedback' | 'fallback'; // Where the recommendation came from
  
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
  location: z.union([z.enum(["home", "travel"]), z.string()]), // Allow custom text responses
  audience: z.enum(["solo", "friends", "date", "family"]),
  timeOfDay: z.array(z.enum(["weekday", "weekend", "late", "morning"])).min(1),
  mood: z.union([z.enum(["laugh", "think", "cry", "thrill", "escape", "inspire"]), z.string()]), // Allow custom text responses
  runtime: z.array(z.enum(["short", "medium", "long"])).optional(),
  streamingServices: z.array(z.string()).optional(),
  country: z.string().optional(),
  excludeFilmIds: z.array(z.number()).optional(), // List of film IDs to exclude from recommendations
  viewingParty: z.array(z.number()).optional(), // Array of friend IDs who are watching together
  userRatedFilms: z.array(z.object({
    filmId: z.number(),
    title: z.string(),
    genres: z.array(z.string()),
    rating: z.number(),
    filmType: z.string()
  })).optional(), // User's rated films for personalized recommendations
  requestedBatchSize: z.number().positive().optional(), // Requested number of films to return
  userId: z.number().optional(), // User ID for Firestore feedback integration
  friendUserId: z.number().optional(), // Friend's user ID for co-watching recommendations
  weightRatio: z.number().min(0).max(1).optional(), // Weight ratio between primary user (1.0) and friend (0.0), defaults to 0.5 (equal)
  personalizationSummary: z.string().optional(), // Summary of personalization reasoning (e.g., shared interests)
  _bypassStreamingFilter: z.boolean().optional(), // Special flag used for "Show More" to bypass streaming service constraints
  _disableMoodFilter: z.boolean().optional(), // Special flag to disable mood filtering for more diverse recommendations
  _disableRuntimeFilter: z.boolean().optional() // Special flag to disable runtime filtering for more diverse recommendations
});

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

// 1. Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username"),
  email: text("email").notNull().unique(),
  password: text("password"), // nullable — not set for Google SSO users
  name: text("name"),
  streamingServices: text("streaming_services").array(),
  country: text("country"),
  authProvider: text("auth_provider").default("local"),
  googleId: text("google_id").unique(), // Google OAuth subject ID (sub), unique per user
  providerId: text("provider_id"), // kept for backwards-compat, prefer googleId
  isAdmin: boolean("is_admin").default(false),
  onboardingState: jsonb("onboarding_state").default({
    completed: false,
    currentStep: "intro",
    progress: 0,
    lastUpdated: new Date().toISOString(),
  }),
});

// 2. Watchlist table
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  filmId: integer("film_id").notNull(),
  filmTitle: text("film_title").notNull(),
  filmYear: integer("film_year"),
  filmDirector: text("film_director"),
  filmType: text("film_type"),
  filmGenres: text("film_genres").array(),
  filmPosterUrl: text("film_poster_url"),
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

// 3. Onboarding Ratings table - NEW for handling the onboarding flow
export const onboardingRatings = pgTable("onboarding_ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  filmId: integer("film_id").notNull(),
  filmTitle: text("film_title").notNull(),
  filmPosterUrl: text("film_poster_url"),
  rating: integer("rating"), // 1-5 stars, null means "haven't seen"
  status: text("status").notNull().default("not_seen"), // "not_seen", "seen", "liked", "loved", etc.
  batchNumber: integer("batch_number").default(1), // Which batch this rating belonged to
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Friend requests table
export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  email: text("email"), 
  friendName: text("friend_name"),
  inviteCode: text("invite_code").notNull().unique(),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Friends table 
export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  friendId: integer("friend_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Analytics table
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), 
  userId: integer("user_id").references(() => users.id),
  data: json("data").$type<Record<string, any>>(),
  timestamp: timestamp("timestamp").defaultNow(),
  ip: text("ip"),
  userAgent: text("user_agent"),
});

// 7. Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  relatedUserId: integer("related_user_id").references(() => users.id),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// 8. User Recommendations table
export const userRecommendations = pgTable("user_recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  preferences: jsonb("preferences").$type<RecommendationRequest>().notNull(),
  recommendations: jsonb("recommendations").$type<Film[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 9. Film Feedback table (replaces Firestore feedback collection)
export const filmFeedback = pgTable("film_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  filmId: integer("film_id").notNull(),
  filmTitle: text("film_title").notNull(),
  liked: boolean("liked").notNull(),
  moodContext: text("mood_context"),
  runtimePreference: text("runtime_preference").array(),
  recommendationContext: jsonb("recommendation_context").$type<RecommendationRequest>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique().on(t.userId, t.filmId)]);

// 10. Chat Sessions table (replaces Firestore chat_sessions collection)
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  sessionKey: text("session_key").notNull().unique(),
  messages: jsonb("messages").$type<Array<{ id: string; sender: string; text: string; timestamp: string }>>().default([]),
  preferences: jsonb("preferences").$type<RecommendationRequest>(),
  customVibes: text("custom_vibes").array().default([]),
  personalizedMoods: text("personalized_moods").array().default([]),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 11. User Preferences table (replaces Firestore user_preferences collection)
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  country: text("country").default(""),
  streamingServices: text("streaming_services").array().default([]),
  language: text("language").default("en"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 12. Vibe Preferences table (replaces Firestore vibe_preferences collection)
export const vibePreferences = pgTable("vibe_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  customVibe: text("custom_vibe").notNull(),
  count: integer("count").default(1),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique().on(t.userId, t.customVibe)]);

// 13. Monthly Mood Cards table
export const monthlyMoodCards = pgTable("monthly_mood_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  moodName: text("mood_name").notNull(),
  subtitle: text("subtitle").notNull(),
  bgColour: text("bg_colour").notNull(),
  emojis: text("emojis").notNull(),
  topFilms: jsonb("top_films").$type<string[]>().notNull(), // Array of film titles
  placidImageUrl: text("placid_image_url"),
  shareUrl: text("share_url"),
  emailSent: boolean("email_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// =====================
// RELATIONS 
// =====================

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  watchlistItems: many(watchlist),
  onboardingRatings: many(onboardingRatings),
  sentFriendRequests: many(friendRequests, { relationName: "senderRelation" }),
  friends: many(friends, { relationName: "userFriends" }),
  friendOf: many(friends, { relationName: "friendOfUser" }),
  notifications: many(notifications),
  relatedNotifications: many(notifications, { relationName: "relatedUserNotifications" }),
  recommendations: many(userRecommendations),
  moodCards: many(monthlyMoodCards),
  filmFeedback: many(filmFeedback),
  chatSessions: many(chatSessions),
  userPreferences: many(userPreferences),
  vibePreferences: many(vibePreferences),
}));

// Watchlist relations
export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
}));

// Onboarding ratings relations
export const onboardingRatingsRelations = relations(onboardingRatings, ({ one }) => ({
  user: one(users, {
    fields: [onboardingRatings.userId],
    references: [users.id],
  }),
}));

// Friend request relations
export const friendRequestRelations = relations(friendRequests, ({ one }) => ({
  sender: one(users, {
    fields: [friendRequests.userId],
    references: [users.id],
    relationName: "senderRelation"
  }),
}));

// Friends relations
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

// Notification relations
export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  relatedUser: one(users, {
    fields: [notifications.relatedUserId],
    references: [users.id],
    relationName: "relatedUserNotifications"
  }),
}));

// Monthly mood card relations
export const monthlyMoodCardRelations = relations(monthlyMoodCards, ({ one }) => ({
  user: one(users, {
    fields: [monthlyMoodCards.userId],
    references: [users.id],
  }),
}));

// Film feedback relations
export const filmFeedbackRelations = relations(filmFeedback, ({ one }) => ({
  user: one(users, {
    fields: [filmFeedback.userId],
    references: [users.id],
  }),
}));

// Chat sessions relations
export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
}));

// User preferences relations
export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

// Vibe preferences relations
export const vibePreferencesRelations = relations(vibePreferences, ({ one }) => ({
  user: one(users, {
    fields: [vibePreferences.userId],
    references: [users.id],
  }),
}));

// =====================
// INSERT SCHEMAS
// =====================

// User insert schema
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  name: true,
  streamingServices: true,
  country: true,
  authProvider: true,
  googleId: true,
  providerId: true,
  isAdmin: true,
  onboardingState: true,
});

// Onboarding rating insert schema
export const insertOnboardingRatingSchema = createInsertSchema(onboardingRatings, {
  createdAt: z.date().optional(),
}).pick({
  userId: true,
  filmId: true,
  filmTitle: true,
  filmPosterUrl: true,
  rating: true,
  status: true,
  batchNumber: true,
});

// Analytics insert schema
export const insertAnalyticsSchema = createInsertSchema(analytics);

// Friend request insert schema
export const insertFriendRequestSchema = createInsertSchema(friendRequests).pick({
  userId: true,
  email: true,
  friendName: true,
  inviteCode: true,
  status: true,
});

// Friend insert schema
export const insertFriendSchema = createInsertSchema(friends).pick({
  userId: true, 
  friendId: true
});

// Notification insert schema
export const insertNotificationSchema = createInsertSchema(notifications, {
  createdAt: z.date().optional(),
}).pick({
  userId: true,
  type: true,
  message: true,
  relatedUserId: true,
  read: true,
});

// Monthly mood card insert schema
export const insertMonthlyMoodCardSchema = createInsertSchema(monthlyMoodCards, {
  createdAt: z.date().optional(),
}).pick({
  userId: true,
  year: true,
  month: true,
  moodName: true,
  subtitle: true,
  bgColour: true,
  emojis: true,
  topFilms: true,
  placidImageUrl: true,
  shareUrl: true,
  emailSent: true,
});

// User recommendations insert schema
export const insertUserRecommendationsSchema = createInsertSchema(userRecommendations, {
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// =====================
// TYPES
// =====================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type OnboardingRating = typeof onboardingRatings.$inferSelect;
export type InsertOnboardingRating = z.infer<typeof insertOnboardingRatingSchema>;

export type WatchlistItem = typeof watchlist.$inferSelect;
export type InsertWatchlistItem = typeof watchlist.$inferInsert;

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;

export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;

export type Friend = typeof friends.$inferSelect;
export type InsertFriend = z.infer<typeof insertFriendSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type UserRecommendations = typeof userRecommendations.$inferSelect;
export type InsertUserRecommendations = z.infer<typeof insertUserRecommendationsSchema>;

// Film feedback insert schema
export const insertFilmFeedbackSchema = createInsertSchema(filmFeedback, {
  createdAt: z.date().optional(),
}).pick({
  userId: true,
  filmId: true,
  filmTitle: true,
  liked: true,
  moodContext: true,
  runtimePreference: true,
  recommendationContext: true,
});

// Chat sessions insert schema
export const insertChatSessionSchema = createInsertSchema(chatSessions, {
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
}).pick({
  userId: true,
  sessionKey: true,
  messages: true,
  preferences: true,
  customVibes: true,
  personalizedMoods: true,
  completed: true,
});

export type FilmFeedback = typeof filmFeedback.$inferSelect;
export type InsertFilmFeedback = z.infer<typeof insertFilmFeedbackSchema>;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

// User preferences insert schema
export const insertUserPreferencesSchema = createInsertSchema(userPreferences, {
  lastUpdated: z.date().optional(),
  createdAt: z.date().optional(),
}).pick({
  userId: true,
  country: true,
  streamingServices: true,
  language: true,
});

// Vibe preferences insert schema
export const insertVibePreferenceSchema = createInsertSchema(vibePreferences, {
  lastUsed: z.date().optional(),
  createdAt: z.date().optional(),
}).pick({
  userId: true,
  customVibe: true,
  count: true,
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferencesSchema>;

export type VibePreference = typeof vibePreferences.$inferSelect;
export type InsertVibePreference = z.infer<typeof insertVibePreferenceSchema>;
