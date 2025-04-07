import OpenAI from "openai";
import { RecommendationRequest, Film } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

interface AIRecommendationResponse {
  recommendations: Film[];
}

export async function getAIRecommendations(preferences: RecommendationRequest): Promise<Film[]> {
  // Increased timeout to 20 seconds for better reliability
  const TIMEOUT_MS = 20000;
  const MAX_RETRIES = 2;
  
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

Return 5-6 films that match the criteria:
- Half should be mainstream/popular films
- Half should be independent, foreign, or lesser-known films
- ALL films should strongly match the user's mood and setting preferences
- Include films with complete information (especially those that have runtime data available)

Format your response as a JSON object with a 'recommendations' array.`;

  // Create the user query - enhanced for streaming service filtering by country
  const userQuery = `I'm looking for movie recommendations with these preferences:
- Setting: ${preferences.location}
- Time: ${timeOfDayString}
- Mood: ${preferences.mood}
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
        max_tokens: 1200 // Increased token limit to handle more recommendations
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
    return await makeOpenAICall();
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : 'Unknown error';
    console.error(`All OpenAI request attempts failed: ${errorDetails}`);
    throw new Error("Failed to get AI recommendations");
  }
}