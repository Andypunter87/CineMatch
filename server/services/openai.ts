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
- year (number)
- director (string)
- actors (array of strings)
- synopsis (string, brief)
- genres (array of strings)
- type ("mainstream" or "indie")
- posterUrl (string - provide a valid working URL)
- matchPercentage (number between 80-98)
- matchReason (string)`;

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
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsedContent = JSON.parse(content) as AIRecommendationResponse;
    console.log("Successfully received AI recommendations");
    
    // Format and structure the recommendations to match our Film type
    return parsedContent.recommendations.map(film => ({
      id: film.id || Math.floor(Math.random() * 10000),
      title: film.title,
      year: film.year,
      director: film.director || "Unknown",
      actors: Array.isArray(film.actors) ? film.actors : ["Unknown"],
      synopsis: film.synopsis || "No synopsis available",
      genres: Array.isArray(film.genres) ? film.genres : ["Drama"],
      type: (film.type === "mainstream" || film.type === "indie") ? film.type : "mainstream",
      posterUrl: film.posterUrl || "https://via.placeholder.com/500x750?text=No+Poster+Available",
      matchPercentage: film.matchPercentage || 85,
      matchReason: film.matchReason || `Great match for ${preferences.mood} mood`
    }));
  } catch (error) {
    console.error("Error getting AI recommendations:", error);
    throw new Error("Failed to get AI recommendations");
  }
}