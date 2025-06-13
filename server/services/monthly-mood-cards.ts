import { db } from "../db";
import { monthlyMoodCards, watchlist, users } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateMoodFromFilms } from "./mood-generation";
import { generatePlacidImage, PlacidTemplateData } from "./placid";
import { sendEmail } from "./email";

export interface MonthlyFilmData {
  userId: number;
  topFilms: string[];
  userName: string;
  userEmail: string;
}

export interface MoodCardData {
  id: number;
  userId: number;
  year: number;
  month: number;
  moodName: string;
  subtitle: string;
  bgColour: string;
  emojis: string;
  topFilms: string[];
  placidImageUrl?: string;
  shareUrl?: string;
  emailSent: boolean;
  createdAt: Date;
}

/**
 * Collect top films for a user from the previous month
 * @param userId User ID
 * @param year Year to collect data for
 * @param month Month to collect data for (1-12)
 * @returns Promise with array of film titles
 */
export async function getTopFilmsForMonth(userId: number, year: number, month: number): Promise<string[]> {
  try {
    // Get the start and end dates for the specified month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    console.log(`Collecting films for user ${userId} between ${startDate.toISOString()} and ${endDate.toISOString()}`);

    // Query watchlist items from the specified month
    const films = await db
      .select({
        title: watchlist.filmTitle,
        dateAdded: watchlist.dateAdded,
        rating: watchlist.userRating,
      })
      .from(watchlist)
      .where(
        and(
          eq(watchlist.userId, userId),
          sql`${watchlist.dateAdded} >= ${startDate}`,
          sql`${watchlist.dateAdded} <= ${endDate}`
        )
      )
      .orderBy(desc(watchlist.userRating), desc(watchlist.dateAdded))
      .limit(5);

    const filmTitles = films.map(film => film.title);
    console.log(`Found ${filmTitles.length} films for user ${userId}:`, filmTitles);

    return filmTitles;
  } catch (error) {
    console.error(`Error getting top films for user ${userId}:`, error);
    return [];
  }
}

/**
 * Collect film data for all active users from the previous month
 * @param year Year to collect data for
 * @param month Month to collect data for (1-12)
 * @returns Promise with array of user film data
 */
export async function collectMonthlyFilmData(year: number, month: number): Promise<MonthlyFilmData[]> {
  try {
    console.log(`Collecting monthly film data for ${year}-${month.toString().padStart(2, '0')}`);

    // Get all users who have films in their watchlist
    const activeUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(sql`EXISTS (
        SELECT 1 FROM ${watchlist} 
        WHERE ${watchlist.userId} = ${users.id}
      )`);

    console.log(`Found ${activeUsers.length} active users`);

    const monthlyData: MonthlyFilmData[] = [];

    for (const user of activeUsers) {
      const topFilms = await getTopFilmsForMonth(user.id, year, month);
      
      if (topFilms.length > 0) {
        monthlyData.push({
          userId: user.id,
          topFilms,
          userName: user.name || 'CineMatch User',
          userEmail: user.email,
        });
      }
    }

    console.log(`Collected data for ${monthlyData.length} users with film activity`);
    return monthlyData;
  } catch (error) {
    console.error("Error collecting monthly film data:", error);
    return [];
  }
}

/**
 * Generate and save a mood card for a user
 * @param userId User ID
 * @param year Year
 * @param month Month (1-12)
 * @param topFilms Array of film titles
 * @returns Promise with the created mood card data
 */
export async function generateMoodCard(
  userId: number,
  year: number,
  month: number,
  topFilms: string[]
): Promise<MoodCardData> {
  try {
    console.log(`Generating mood card for user ${userId}`);

    // Check if mood card already exists for this user/month
    const existingCard = await db
      .select()
      .from(monthlyMoodCards)
      .where(
        and(
          eq(monthlyMoodCards.userId, userId),
          eq(monthlyMoodCards.year, year),
          eq(monthlyMoodCards.month, month)
        )
      )
      .limit(1);

    if (existingCard.length > 0) {
      console.log(`Mood card already exists for user ${userId}`);
      return existingCard[0] as MoodCardData;
    }

    // Generate mood analysis using OpenAI
    const moodData = await generateMoodFromFilms(topFilms);
    console.log(`Generated mood data:`, moodData);

    // Prepare Placid template data
    const placidData: PlacidTemplateData = {
      mood_name: moodData.moodName,
      subtitle: moodData.subtitle,
      bg_colour: moodData.bgColour,
      film_1: topFilms[0] || '',
      film_2: topFilms[1] || '',
      film_3: topFilms[2] || '',
      film_4: topFilms[3] || '',
      film_5: topFilms[4] || '',
    };

    // Generate Placid image
    const placidImageUrl = await generatePlacidImage(placidData);
    console.log(`Generated Placid image: ${placidImageUrl}`);

    // Create share URL
    const shareUrl = `https://cinematch.co.uk/mymood/${year}-${month.toString().padStart(2, '0')}?uid=${userId}`;

    // Save mood card to database
    const [newCard] = await db
      .insert(monthlyMoodCards)
      .values({
        userId,
        year,
        month,
        moodName: moodData.moodName,
        subtitle: moodData.subtitle,
        bgColour: moodData.bgColour,
        emojis: moodData.emojis,
        topFilms,
        placidImageUrl,
        shareUrl,
        emailSent: false,
      })
      .returning();

    console.log(`Saved mood card to database with ID: ${newCard.id}`);
    return newCard as MoodCardData;
  } catch (error) {
    console.error(`Error generating mood card for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Send mood card email to a user
 * @param moodCard Mood card data
 * @param userName User's name
 * @param userEmail User's email
 * @returns Promise with success status
 */
export async function sendMoodCardEmail(
  moodCard: MoodCardData,
  userName: string,
  userEmail: string
): Promise<boolean> {
  try {
    const monthName = new Date(moodCard.year, moodCard.month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #000000;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3B82F6; font-size: 28px; margin: 0;">🎬 Your ${monthName} Mood Card is Ready!</h1>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6;">Hi ${userName},</p>
        
        <p style="font-size: 16px; line-height: 1.6;">
          Your monthly CineMatch mood has been created: <strong>${moodCard.moodName}</strong>
        </p>
        
        <div style="background-color: ${moodCard.bgColour}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; color: white;">
          <h2 style="margin: 0 0 10px 0; font-size: 24px;">${moodCard.emojis}</h2>
          <h3 style="margin: 0 0 10px 0; font-size: 20px;">${moodCard.moodName}</h3>
          <p style="margin: 0; font-size: 16px; opacity: 0.9;">${moodCard.subtitle}</p>
        </div>
        
        <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #E2E8F0;">
          <h4 style="color: #3B82F6; margin-top: 0;">Your Top Films This Month:</h4>
          <ul style="line-height: 1.8; color: #374151;">
            ${moodCard.topFilms.map(film => `<li>${film}</li>`).join('')}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${moodCard.shareUrl}" 
             style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">
            🎨 View Your Mood Card
          </a>
        </div>
        
        <p style="font-size: 14px; color: #6B7280; margin-top: 30px;">
          Share your mood with friends and discover what your film choices say about you!<br>
          The CineMatch Team
        </p>
      </div>
    `;

    const success = await sendEmail({
      to: userEmail,
      subject: `🎬 Your ${monthName} CineMatch Mood: ${moodCard.moodName}`,
      html: htmlContent
    });

    if (success) {
      // Mark email as sent in database
      await db
        .update(monthlyMoodCards)
        .set({ emailSent: true })
        .where(eq(monthlyMoodCards.id, moodCard.id));
    }

    return success;
  } catch (error) {
    console.error("Error sending mood card email:", error);
    return false;
  }
}

/**
 * Generate mood cards for all users for a specific month
 * @param year Year to generate for
 * @param month Month to generate for (1-12)
 * @returns Promise with summary of generation results
 */
export async function generateMonthlyMoodCards(year: number, month: number): Promise<{
  totalUsers: number;
  cardsGenerated: number;
  emailsSent: number;
  errors: string[];
}> {
  console.log(`Starting monthly mood card generation for ${year}-${month.toString().padStart(2, '0')}`);

  const results = {
    totalUsers: 0,
    cardsGenerated: 0,
    emailsSent: 0,
    errors: [] as string[],
  };

  try {
    // Collect film data for all users
    const monthlyData = await collectMonthlyFilmData(year, month);
    results.totalUsers = monthlyData.length;

    for (const userData of monthlyData) {
      try {
        // Generate mood card
        const moodCard = await generateMoodCard(
          userData.userId,
          year,
          month,
          userData.topFilms
        );
        results.cardsGenerated++;

        // Send email if not already sent
        if (!moodCard.emailSent) {
          const emailSent = await sendMoodCardEmail(
            moodCard,
            userData.userName,
            userData.userEmail
          );

          if (emailSent) {
            results.emailsSent++;
          } else {
            results.errors.push(`Failed to send email to user ${userData.userId}`);
          }
        }

        // Add a small delay to avoid overwhelming external APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Failed to process user ${userData.userId}: ${errorMessage}`);
        console.error(`Error processing user ${userData.userId}:`, error);
      }
    }

    console.log("Monthly mood card generation completed:", results);
    return results;
  } catch (error) {
    console.error("Error in generateMonthlyMoodCards:", error);
    results.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return results;
  }
}

/**
 * Get a mood card by user ID and month
 * @param userId User ID
 * @param year Year
 * @param month Month (1-12)
 * @returns Promise with mood card data or null
 */
export async function getMoodCard(userId: number, year: number, month: number): Promise<MoodCardData | null> {
  try {
    const [moodCard] = await db
      .select()
      .from(monthlyMoodCards)
      .where(
        and(
          eq(monthlyMoodCards.userId, userId),
          eq(monthlyMoodCards.year, year),
          eq(monthlyMoodCards.month, month)
        )
      )
      .limit(1);

    return moodCard ? (moodCard as MoodCardData) : null;
  } catch (error) {
    console.error("Error getting mood card:", error);
    return null;
  }
}