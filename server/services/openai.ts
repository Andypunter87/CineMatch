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
  // Create a promise that rejects after 8 seconds
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("OpenAI request timed out")), 8000);
  });

  try {
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

Return exactly 4 films that match the criteria:
- 2 should be mainstream/popular films
- 2 should be independent, foreign, or lesser-known films
- ALL films should strongly match the user's mood and setting preferences

Format your response as a JSON object with a 'recommendations' array.`;

    // Create the user query - enhanced for streaming service filtering by country
    const userQuery = `I'm looking for movie recommendations with these preferences:
- Setting: ${preferences.location}
- Time: ${timeOfDayString}
- Mood: ${preferences.mood}
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

    // Make the API call with a timeout
    const responsePromise = openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 800 // Limit token count for faster response
    });

    // Race between the API call and the timeout
    const response = await Promise.race([responsePromise, timeoutPromise]) as any;

    // Parse the response
    let parsedContent: AIRecommendationResponse;
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }
      
      parsedContent = JSON.parse(content) as AIRecommendationResponse;
      console.log("Successfully received AI recommendations");
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      throw new Error("Failed to parse AI recommendations");
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
      const background = backgrounds[backgroundIndex];
      
      // No posterUrl - we'll generate it on the client side
      const posterUrl = "";
      
      return {
        id: film.id || Math.floor(Math.random() * 10000),
        title: film.title,
        year: typeof film.year === 'number' ? film.year : 2000,
        director: film.director || "Unknown",
        actors: Array.isArray(film.actors) ? film.actors.slice(0, 4) : ["Unknown"],
        synopsis: film.synopsis || "No synopsis available",
        genres: Array.isArray(film.genres) ? film.genres.slice(0, 3) : ["Drama"],
        type: (film.type === "mainstream" || film.type === "indie") ? film.type : "mainstream",
        posterUrl: posterUrl,
        matchPercentage: typeof film.matchPercentage === 'number' ? film.matchPercentage : 85,
        matchReason: film.matchReason || `Great match for ${preferences.mood} mood`,
        availableOn: Array.isArray(film.availableOn) ? film.availableOn : []
      };
    });
  } catch (error) {
    console.error("Error getting AI recommendations:", error);
    throw new Error("Failed to get AI recommendations");
  }
}