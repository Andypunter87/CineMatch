import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  name: text("name"),
  email: text("email").notNull().unique(),
  streamingServices: text("streaming_services").array(),
  country: text("country"),
  authProvider: text("auth_provider").default("local"),
  providerId: text("provider_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
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
