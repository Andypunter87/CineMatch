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
    
    // Create streaming services string if available
    const streamingServicesString = preferences.streamingServices && preferences.streamingServices.length > 0
      ? `Available on these streaming platforms: ${preferences.streamingServices.join(", ")}.`
      : "Streaming platform availability not specified.";

    // Create the system prompt - simplified for faster response
    const systemPrompt = `You are a film recommendation expert. Provide personalized movie recommendations based on the user's preferences.
Return exactly 4 films that match the criteria.
Format your response as a JSON object with a 'recommendations' array.`;

    // Create the user query - simplified for faster response
    const userQuery = `I'm looking for movie recommendations with these preferences:
- Setting: ${preferences.location}
- Time: ${timeOfDayString}
- Mood: ${preferences.mood}
- ${streamingServicesString}

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

DO NOT include a posterUrl field in your response. I will generate those separately based on the movie title.`;

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
      // Create a simple placeholder that will always work
      // Using a data URI directly instead of an external service
      const title = film.title || "Movie";
      const safeTitle = title.length > 20 ? title.substring(0, 20) + "..." : title;
      const year = typeof film.year === 'number' ? film.year : "";
      
      // Generate a fixed color poster with the movie title - using UI colors
      const posterUrl = `https://via.placeholder.com/500x750/3498db/ffffff?text=${encodeURIComponent(safeTitle + (year ? `\n(${year})` : ""))}`;
      
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
        matchReason: film.matchReason || `Great match for ${preferences.mood} mood`
      };
    });
  } catch (error) {
    console.error("Error getting AI recommendations:", error);
    throw new Error("Failed to get AI recommendations");
  }
}