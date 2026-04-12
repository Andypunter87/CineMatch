import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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

const fallbackMoodLabels = [
  "Something that feels like a warm hug",
  "Let me escape into another world",
  "Make me feel cleverer than I am",
  "Something beautifully melancholic",
  "A film that surprises me"
];

// In-memory cache for mood labels (per user, keyed by userId)
const moodLabelCache = new Map<string, { labels: string[]; timestamp: number }>();
const MOOD_LABEL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function generateMoodLabels(userData: UserData): Promise<string[]> {
  try {
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

Return exactly 5 labels as a JSON array of strings and nothing else.`;

    const userPrompt = `Generate 5 personalized mood labels for this user:

${userContext}

Current viewing context:
- Audience: ${userData.viewingContext.audience}
- Time: ${userData.viewingContext.timeOfDay.join(", ")}

Return as a JSON array of exactly 5 mood label strings.`;

    console.log('Generating personalized mood labels with Claude...');

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt }
      ]
    });

    const block = response.content[0];
    if (!block || block.type !== "text" || !block.text) {
      throw new Error('No response from Claude');
    }

    const responseContent = block.text;

    let moodLabels: string[];
    try {
      let cleanedContent = responseContent.trim();

      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const arrayMatch = cleanedContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        cleanedContent = arrayMatch[0];
      }

      moodLabels = JSON.parse(cleanedContent);
      if (!Array.isArray(moodLabels) || moodLabels.length !== 5) {
        throw new Error('Invalid response format');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      throw new Error('Invalid JSON response from Claude');
    }

    console.log('Generated mood labels:', moodLabels);
    return moodLabels;

  } catch (error) {
    console.error('Error generating mood labels:', error);
    console.log('Falling back to default mood labels');
    return fallbackMoodLabels;
  }
}

function buildUserContext(userData: UserData): string {
  const { userRatedFilms } = userData;

  if (!userRatedFilms || userRatedFilms.length === 0) {
    return "New user with no rating history yet.";
  }

  const highRatedFilms = userRatedFilms.filter(film => film.rating >= 4);
  const lowRatedFilms = userRatedFilms.filter(film => film.rating <= 2);

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

export async function saveMoodLabels(userId: string, moodLabels: string[]): Promise<void> {
  moodLabelCache.set(userId, { labels: moodLabels, timestamp: Date.now() });
}

export async function getMoodLabelsFromFirestore(userId: string): Promise<string[] | null> {
  const cached = moodLabelCache.get(userId);
  if (cached && Date.now() - cached.timestamp < MOOD_LABEL_CACHE_TTL) {
    return cached.labels;
  }
  return null;
}

export async function generateAndSaveMoodLabels(
  userId: string,
  userData: UserData,
  sessionId?: string
): Promise<string[]> {
  const moodLabels = await generateMoodLabels(userData);
  await saveMoodLabels(userId, moodLabels);
  return moodLabels;
}
