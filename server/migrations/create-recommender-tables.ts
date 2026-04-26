import { db } from "../db";
import { sql } from "drizzle-orm";

export async function createRecommenderTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "watch_choices" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER REFERENCES "users"("id"),
        "film_id" INTEGER NOT NULL,
        "vibe" TEXT,
        "ts" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "group_sessions" (
        "id" SERIAL PRIMARY KEY,
        "host_user_id" INTEGER REFERENCES "users"("id"),
        "session_code" TEXT NOT NULL UNIQUE,
        "status" TEXT NOT NULL DEFAULT 'waiting',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "group_session_members" (
        "id" SERIAL PRIMARY KEY,
        "session_id" INTEGER NOT NULL REFERENCES "group_sessions"("id"),
        "user_id" INTEGER REFERENCES "users"("id"),
        "display_name" TEXT,
        "status" TEXT NOT NULL DEFAULT 'waiting',
        "joined_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Recommender tables ready");
  } catch (error) {
    console.error("Error creating recommender tables:", error);
    throw error;
  }
}
