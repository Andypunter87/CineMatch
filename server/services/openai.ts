import OpenAI from "openai";
import { RecommendationRequest, Film } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

interface AIRecommendationResponse {
  recommendations: Film[];
}

// Create a cache object to store recent recommendation results
// This is a simple in-memory cache to avoid repeated identical requests
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const recommendationCache = new Map<string, {timestamp: number, data: Film[]}>();

export async function getAIRecommendations(preferences: RecommendationRequest): Promise<Film[]> {
  // Set timeout to 20 seconds to ensure we get quality recommendations
  const TIMEOUT_MS = 20000;
  const MAX_RETRIES = 2;
  
  // Create a cache key based on the preferences
  // Exclude excludeFilmIds from the cache key as these change frequently
  const { excludeFilmIds, viewingParty, userRatedFilms, requestedBatchSize, ...cacheablePreferences } = preferences;
  
  // Create a consistent batch size for caching - we'll filter results post-cache
  // This way, the cache works consistently regardless of different batch sizes for the same preferences
  const standardBatchSize = 6; // Always cache a standard number of items
  
  const cacheKey = JSON.stringify({
    location: cacheablePreferences.location,
    audience: cacheablePreferences.audience,
    mood: cacheablePreferences.mood,
    timeOfDay: cacheablePreferences.timeOfDay,
    runtime: cacheablePreferences.runtime,
    country: cacheablePreferences.country,
    // Use a standard batch size for caching
    batchSize: standardBatchSize,
    // Include a summarized version of streaming services (sorted to ensure consistent keys)
    streamingServices: cacheablePreferences.streamingServices?.sort() || [],
    // Include information about viewing party
    hasViewingParty: !!viewingParty,
    friendCount: viewingParty?.length || 0,
    // Include summary of user ratings to make the cache key user-specific
    hasUserRatings: !!userRatedFilms?.length,
    userRatingsCount: userRatedFilms?.length || 0
  });
  
  // Check if we have a valid cached result
  const now = Date.now();
  const cachedResult = recommendationCache.get(cacheKey);
  
  if (cachedResult && (now - cachedResult.timestamp) < CACHE_TTL) {
    console.log('Using cached recommendation results');
    
    // First, filter by excluded film IDs
    let filteredResults = cachedResult.data;
    if (excludeFilmIds?.length) {
      filteredResults = filteredResults.filter(film => !excludeFilmIds.includes(film.id));
      console.log(`Filtered ${cachedResult.data.length - filteredResults.length} excluded films from cache results`);
    }
    
    // Apply the requested batch size
    const actualBatchSize = requestedBatchSize || 6;
    if (filteredResults.length > actualBatchSize) {
      console.log(`Limiting cached results to requested batch size of ${actualBatchSize}`);
      filteredResults = filteredResults.slice(0, actualBatchSize);
    }
    
    return filteredResults;
  }
  
  // Create a promise that rejects after the timeout
  const createTimeoutPromise = () => new Promise((_, reject) => {
    setTimeout(() => reject(new Error("OpenAI request timed out")), TIMEOUT_MS);
  });

  // Convert timeOfDay array to string for better readability in the prompt
  const timeOfDayString = preferences.timeOfDay.join(", ");

  // Create the system prompt - enhanced for streaming service filtering by country
  const systemPrompt = `You are a film recommendation expert with deep knowledge of global cinema. 
Provide personalized movie recommendations based on the user's preferences.

IMPORTANT ABOUT STREAMING AVAILABILITY:
1. If NO streaming services are specified by the user, leave the 'availableOn' array EMPTY for ALL recommendations
2. If streaming services ARE specified, ONLY include them in 'availableOn' when there's a STRONG likelihood the film is available on that service
3. For older or obscure films, it's better to leave 'availableOn' as an empty array than to make uncertain guesses
4. NEVER include streaming services the user didn't specify in their preferences

IMPORTANT ABOUT EXCLUDED FILMS:
1. If the user provides a list of film IDs to exclude, NEVER include any film with those IDs in your recommendations
2. Films with excluded IDs should be completely omitted from your response - do not reference them at all
3. Exclusions take absolute priority over all other matching criteria

IMPORTANT ABOUT USER RATINGS:
1. If the user provides a list of rated films, use these ratings to personalize recommendations
2. For highly rated films (4-5 stars), recommend similar films with related genres, directors, or styles
3. For moderately rated films (3 stars), consider their genres but don't prioritize them
4. For poorly rated films (1-2 stars), avoid recommending similar films
5. Pay special attention to the genres and film types (mainstream vs indie) that the user has rated highly
6. If the user has rated both indie and mainstream films, ensure a balanced mix in recommendations

IMPORTANT ABOUT AUDIENCES:
1. If audience is "solo", focus purely on the user's personal taste based on other preferences
2. If audience is "friends", prioritize films that work well with groups (comedies, action films, or broadly appealing entertainment)
3. If audience is "date", prioritize films that work well for couples (romantic comedies, dramas with romantic elements, or crowd-pleasing films that set the right tone)
4. If audience is "family", prioritize family-friendly films appropriate for all ages (avoiding excessive violence, sexual content, or strong language)

IMPORTANT ABOUT GROUP VIEWING:
1. If the user indicates this is a group viewing with friends, prioritize films that:
   a. Are broadly appealing rather than niche or divisive
   b. Spark conversation or create shared experiences
   c. Have strong entertainment value over artistic merit in borderline cases
   d. Balance the preferences of everyone in the group based on their rated films
   e. Find common ground in genres and styles that overlap across multiple friends' preferences
2. For date night, prioritize films that create a shared emotional experience and can lead to interesting conversation
3. For family viewing, prioritize films with positive themes, clear storylines, and appropriate content

Return the requested number of films that match the criteria:
- PRIORITIZE films most likely to be available on streaming services (including specialty platforms like Mubi, Criterion Channel, etc.)
- Focus on films that have had digital releases and wide distribution
- Prefer films from 2000 onwards when possible (better streaming coverage)
- Include both popular and independent films that are commonly available on streaming platforms
- ALL films should strongly match the user's mood, audience and setting preferences
- Include films with complete information (especially those that have runtime data available)
- When user has rated films, prioritize recommendations that match their apparent taste

Format your response as a JSON object with a 'recommendations' array.`;

  // Create the user query - enhanced for streaming service filtering by country
  const userQuery = `I'm looking for movie recommendations with these preferences:
- Setting: ${preferences.location}
- Audience: ${preferences.audience || "solo"} 
- Time: ${timeOfDayString}
- Mood: ${preferences.mood}
- Number of films to return: ${preferences.requestedBatchSize || 6}
${preferences.runtime && preferences.runtime.length > 0
  ? `- Runtime preferences: ${preferences.runtime.map(r => 
    r === "short" ? "Under 90 minutes" : 
    r === "medium" ? "90-120 minutes" : 
    "Over 120 minutes").join(", ")}`
  : `- No runtime preference specified`
}
${preferences.streamingServices && preferences.streamingServices.length > 0 
  ? `- User has access to these streaming services: ${preferences.streamingServices.join(", ")}`
  : `- User hasn't specified any streaming services`
}
${preferences.country 
  ? `- User is located in: ${preferences.country}`
  : `- User location: Unknown`
}
${preferences.viewingParty && preferences.viewingParty.length > 0
  ? `- IMPORTANT: This is a ${preferences.audience === "date" ? "date night" : "group viewing"} with ${preferences.viewingParty.length} other ${preferences.viewingParty.length === 1 ? "person" : "people"}. 
  - For this group viewing, make sure the recommendations:
    * Are broadly appealing rather than niche
    * Find common ground in the film preferences of everyone in the group
    * Balance entertainment value with the group's taste preferences
    * Consider that the ratings above include EVERYONE'S preferences combined`
  : ""
}
${preferences.audience === "family"
  ? "- IMPORTANT: These are family-friendly recommendations. Prioritize films appropriate for family viewing with content suitable for all ages."
  : ""
}
${preferences.excludeFilmIds && preferences.excludeFilmIds.length > 0
  ? `- IMPORTANT: User has already seen these films, EXCLUDE them completely from recommendations: Films with IDs ${preferences.excludeFilmIds.join(", ")}`
  : ""
}
${preferences.userRatedFilms && preferences.userRatedFilms.length > 0
  ? `- IMPORTANT: User has rated these films, use them to personalize recommendations:
${preferences.userRatedFilms.map(film => 
  `  * "${film.title}" (${film.filmType}) - Genres: [${film.genres.join(", ")}] - User rating: ${film.rating}/5`
).join("\n")}`
  : ""
}

Each recommendation must include:
- id (number)
- title (string)
- year (number, between 1920-2023)
- director (string)
- actors (array of strings, 3-4 names maximum)
- synopsis (string, 1-2 sentences only)
- genres (array of strings, 2-3 genres maximum)
- type ("mainstream" or "indie" only)
- matchPercentage (number between 80-98)
- matchReason (string, 10-15 words)
- availableOn (array of strings)

IMPORTANT ABOUT AVAILABILITY:
- If the user hasn't specified any streaming services, the availableOn array should be EMPTY for all films
- If the user has specified streaming services, ONLY include services in availableOn when they likely have that specific film
- For older or obscure films, it's usually better to leave availableOn as an empty array
- NEVER include streaming services that aren't in the user's list

DO NOT include a posterUrl field in your response.`;

  // Define the API call function that we'll retry if needed
  const makeOpenAICall = async (retryCount = 0): Promise<Film[]> => {
    try {
      console.log(`Making OpenAI request (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
      
      // Make the API call with a timeout
      const responsePromise = openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000 // Adjusted token limit for better performance
      });

      // Race between the API call and the timeout
      const response = await Promise.race([responsePromise, createTimeoutPromise()]) as any;

      // Parse the response
      let parsedContent: AIRecommendationResponse;
      try {
        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("Empty response from OpenAI");
        }
        
        parsedContent = JSON.parse(content) as AIRecommendationResponse;
        
        // Validate the structure of the response
        if (!parsedContent.recommendations || !Array.isArray(parsedContent.recommendations) || parsedContent.recommendations.length === 0) {
          throw new Error("Invalid recommendations structure in OpenAI response");
        }
        
        console.log(`Successfully received AI recommendations (attempt ${retryCount + 1})`);
      } catch (parseError) {
        console.error(`Error parsing OpenAI response (attempt ${retryCount + 1}):`, parseError);
        
        // If we have retries left, try again
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying OpenAI request after parsing error...`);
          return makeOpenAICall(retryCount + 1);
        }
        throw new Error("Failed to parse AI recommendations after multiple attempts");
      }
      
      // Format and structure the recommendations to match our Film type
      return parsedContent.recommendations.map(film => {
        // Use a hardcoded set of colorful poster backgrounds
        const backgrounds = [
          "linear-gradient(135deg, #3498db, #2c3e50)",
          "linear-gradient(135deg, #e74c3c, #c0392b)",
          "linear-gradient(135deg, #1abc9c, #16a085)",
          "linear-gradient(135deg, #9b59b6, #8e44ad)",
          "linear-gradient(135deg, #f1c40f, #f39c12)"
        ];
        
        // Choose a background based on the first letter of the title
        const firstChar = (film.title || "A").charAt(0).toLowerCase();
        const backgroundIndex = firstChar.charCodeAt(0) % backgrounds.length;
        
        return {
          id: film.id || Math.floor(Math.random() * 10000),
          title: film.title,
          year: typeof film.year === 'number' ? film.year : 2000,
          director: film.director || "Unknown",
          actors: Array.isArray(film.actors) ? film.actors.slice(0, 4) : ["Unknown"],
          synopsis: film.synopsis || "No synopsis available",
          genres: Array.isArray(film.genres) ? film.genres.slice(0, 3) : ["Drama"],
          type: (film.type === "mainstream" || film.type === "indie") ? film.type : "mainstream",
          posterUrl: "", // We'll generate it on the client side
          matchPercentage: typeof film.matchPercentage === 'number' ? film.matchPercentage : 85,
          matchReason: film.matchReason || `Great match for ${preferences.mood} mood`,
          availableOn: Array.isArray(film.availableOn) ? film.availableOn : []
        };
      });
    } catch (error) {
      // If timeout or any other error and we have retries left
      if (retryCount < MAX_RETRIES) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Retrying OpenAI request after error: ${errorMessage}`);
        // Add a small delay before retrying to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        return makeOpenAICall(retryCount + 1);
      }
      
      // If we've used all retries, propagate the error
      const errorDetails = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error getting AI recommendations after ${retryCount + 1} attempts: ${errorDetails}`);
      throw new Error("Failed to get AI recommendations after multiple attempts");
    }
  };

  // Start the API call process with retries
  try {
    // Get the recommendations
    const recommendations = await makeOpenAICall();
    
    // Store in cache for future requests
    recommendationCache.set(cacheKey, {
      timestamp: Date.now(),
      data: recommendations
    });
    
    // Check for and delete expired cache entries (cache maintenance)
    // Convert entries to array to avoid iteration issues
    Array.from(recommendationCache.entries()).forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_TTL) {
        recommendationCache.delete(key);
      }
    });
    
    return recommendations;
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : 'Unknown error';
    console.error(`All OpenAI request attempts failed: ${errorDetails}`);
    throw new Error("Failed to get AI recommendations");
  }
}