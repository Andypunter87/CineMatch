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
});

// Define relations for users
export const usersRelations = relations(users, ({ many }) => ({
  watchlistItems: many(watchlist),
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
});

// Define the film schema types
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
};

// Define recommendation request schema
export const recommendationRequestSchema = z.object({
  location: z.enum(["home", "travel", "date", "friends"]),
  timeOfDay: z.array(z.enum(["weekday", "weekend", "late", "morning"])).min(1),
  mood: z.enum(["laugh", "think", "cry", "thrill", "escape", "inspire"]),
  streamingServices: z.array(z.string()).optional(),
  country: z.string().optional()
});

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
