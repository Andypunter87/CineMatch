import OpenAI from 'openai';
import { getFirestoreDb } from '../firebase-admin';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface UserRatedFilm {
  title: string;
  genres: string[];
  rating: number;
}

interface ViewingContext {
  audience: "solo" | "friends" | "date" | "family";
  timeOfDay: string[];
}

interface UserData {
  userRatedFilms: UserRatedFilm[];
  viewingContext: ViewingContext;
}

// Fallback mood labels for when OpenAI fails
const fallbackMoodLabels = [
  "Something that feels like a warm hug",
  "Let me escape into another world",
  "Make me feel cleverer than I am",
  "Something beautifully melancholic",
  "A film that surprises me"
];

/**
 * Generate personalized mood labels based on user's watch history and context
 * @param userData Object containing user's rated films and viewing context
 * @returns Array of 5 personalized mood label strings
 */
export async function generateMoodLabels(userData: UserData): Promise<string[]> {
  try {
    // Create context for the LLM based on user's preferences
    const userContext = buildUserContext(userData);
    
    const systemPrompt = `You are CineMate, a warm and clever film-obsessed friend who describes moods and vibes in delightfully quirky ways.

Given a user's past preferences, generate 5 mood labels they might pick from when deciding what film to watch.

Each label should be:
- Short (max 12 words)
- Specific, emotional, and playful
- Avoid plain terms like "comedy" or "action" — focus on how the film makes them *feel*
- Reflect the user's apparent taste based on their rating history

Examples:
- "Let me feel like I'm on a mission"
- "Something odd, but wholesome"
- "Make me cry in a good way"
- "A film that feels like a secret handshake"
- "Something slightly surreal but very warm"

Return exactly 5 labels as a JSON array of strings.`;

    const userPrompt = `Generate 5 personalized mood labels for this user:

${userContext}

Current viewing context:
- Audience: ${userData.viewingContext.audience}
- Time: ${userData.viewingContext.timeOfDay.join(", ")}

Return as a JSON array of exactly 5 mood label strings.`;

    console.log('Generating personalized mood labels with OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let moodLabels: string[];
    try {
      moodLabels = JSON.parse(responseContent);
      if (!Array.isArray(moodLabels) || moodLabels.length !== 5) {
        throw new Error('Invalid response format');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

    console.log('Generated mood labels:', moodLabels);
    return moodLabels;

  } catch (error) {
    console.error('Error generating mood labels:', error);
    console.log('Falling back to default mood labels');
    return fallbackMoodLabels;
  }
}

/**
 * Build context string from user's rating history for the LLM
 */
function buildUserContext(userData: UserData): string {
  const { userRatedFilms } = userData;
  
  if (!userRatedFilms || userRatedFilms.length === 0) {
    return "New user with no rating history yet.";
  }

  // Analyze user's preferences
  const highRatedFilms = userRatedFilms.filter(film => film.rating >= 4);
  const lowRatedFilms = userRatedFilms.filter(film => film.rating <= 2);
  
  // Get genre preferences
  const genreFrequency: Record<string, number> = {};
  highRatedFilms.forEach(film => {
    film.genres.forEach(genre => {
      genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
    });
  });
  
  const preferredGenres = Object.entries(genreFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([genre]) => genre);

  let context = `User's film preferences:
- Has rated ${userRatedFilms.length} films
- Highly rated (4-5 stars): ${highRatedFilms.length} films
- Low rated (1-2 stars): ${lowRatedFilms.length} films`;

  if (preferredGenres.length > 0) {
    context += `\n- Favorite genres: ${preferredGenres.join(", ")}`;
  }

  if (highRatedFilms.length > 0) {
    const topFilms = highRatedFilms.slice(0, 5).map(film => 
      `"${film.title}" (${film.genres.join(", ")}) - ${film.rating} stars`
    );
    context += `\n- Top rated films: ${topFilms.join("; ")}`;
  }

  if (lowRatedFilms.length > 0) {
    const dislikedFilms = lowRatedFilms.slice(0, 3).map(film => 
      `"${film.title}" (${film.genres.join(", ")}) - ${film.rating} stars`
    );
    context += `\n- Films they didn't enjoy: ${dislikedFilms.join("; ")}`;
  }

  return context;
}

/**
 * Save mood labels to Firestore for the user
 * @param userId User ID
 * @param moodLabels Array of mood label strings
 * @param sessionId Optional session ID for tracking
 */
export async function saveMoodLabelsToFirestore(
  userId: string, 
  moodLabels: string[], 
  sessionId?: string
): Promise<void> {
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.error('Firestore not available');
      return;
    }

    const moodLabelsData = {
      userId,
      labels: moodLabels,
      createdAt: new Date(),
      sessionId: sessionId || null,
      version: '1.0'
    };

    // Save to user's mood labels collection
    await db.collection('userMoodLabels').doc(userId).set(moodLabelsData);
    
    console.log(`Saved ${moodLabels.length} mood labels for user ${userId}`);
  } catch (error) {
    console.error('Error saving mood labels to Firestore:', error);
  }
}

/**
 * Retrieve mood labels from Firestore for the user
 * @param userId User ID
 * @returns Array of mood label strings or null if not found
 */
export async function getMoodLabelsFromFirestore(userId: string): Promise<string[] | null> {
  try {
    const db = getFirestoreDb();
    if (!db) {
      console.error('Firestore not available');
      return null;
    }

    const doc = await db.collection('userMoodLabels').doc(userId).get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return data?.labels || null;
  } catch (error) {
    console.error('Error retrieving mood labels from Firestore:', error);
    return null;
  }
}

/**
 * Generate and save mood labels for a user
 * @param userId User ID
 * @param userData User's rating history and context
 * @param sessionId Optional session ID
 * @returns Generated mood labels
 */
export async function generateAndSaveMoodLabels(
  userId: string,
  userData: UserData,
  sessionId?: string
): Promise<string[]> {
  const moodLabels = await generateMoodLabels(userData);
  await saveMoodLabelsToFirestore(userId, moodLabels, sessionId);
  return moodLabels;
}