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
  try {
    // Convert timeOfDay array to string for better readability in the prompt
    const timeOfDayString = preferences.timeOfDay.join(", ");
    
    // Create streaming services string if available
    const streamingServicesString = preferences.streamingServices && preferences.streamingServices.length > 0
      ? `Available on these streaming platforms: ${preferences.streamingServices.join(", ")}.`
      : "Streaming platform availability not specified.";

    // Create the system prompt
    const systemPrompt = `You are a film recommendation expert. Provide personalized movie recommendations based on the user's preferences.
The recommendations should include a mix of mainstream and independent/foreign films.
Return exactly 6 films that match the criteria.
Format your response as a JSON object with a 'recommendations' array.`;

    // Create the user query
    const userQuery = `I'm looking for movie recommendations with these preferences:
- Setting: ${preferences.location}
- Time: ${timeOfDayString}
- Mood: ${preferences.mood}
- ${streamingServicesString}

Please respond with a valid JSON object containing an array of recommendations.
Each film in the JSON recommendations array should include:
1. A unique id (number)
2. Title (string)
3. Year of release (number)
4. Director (string)
5. List of main actors (array of strings, 3-4 names)
6. A brief synopsis (string, 1-2 sentences)
7. List of genres (array of strings)
8. Type (string, either "mainstream" or "indie")
9. A posterUrl (string) - use TMDB format: "https://image.tmdb.org/t/p/w500/[path]" or another reliable source
10. A match percentage (number between 80-98)
11. A match reason (string) explaining why this film matches my criteria (1 sentence)`;

    // Make the API call
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsedContent = JSON.parse(content) as AIRecommendationResponse;
    
    // Format and structure the recommendations to match our Film type
    return parsedContent.recommendations.map(film => ({
      id: film.id || Math.floor(Math.random() * 10000),
      title: film.title,
      year: film.year,
      director: film.director,
      actors: film.actors,
      synopsis: film.synopsis,
      genres: film.genres,
      type: film.type as "mainstream" | "indie",
      posterUrl: film.posterUrl,
      matchPercentage: film.matchPercentage,
      matchReason: film.matchReason
    }));
  } catch (error) {
    console.error("Error getting AI recommendations:", error);
    throw new Error("Failed to get AI recommendations");
  }
}