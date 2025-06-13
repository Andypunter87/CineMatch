import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MoodAnalysis {
  moodName: string;
  subtitle: string;
  bgColour: string;
  emojis: string;
}

/**
 * Generate a poetic mood analysis from a list of films using OpenAI
 * @param films Array of film titles that user matched with this month
 * @returns Promise with mood analysis
 */
export async function generateMoodFromFilms(films: string[]): Promise<MoodAnalysis> {
  if (!films || films.length === 0) {
    // Fallback for users with no film data
    return {
      moodName: "New Beginnings",
      subtitle: "Ready to discover your first cinematic adventures",
      bgColour: "#3B82F6",
      emojis: "🎬✨🌟"
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are a poetic brand writer for CineMatch — a mood-based film recommendation service with a warm, stylish tone.

Your job is to analyse the vibe of a user's top 5 films and return a JSON object with:
- moodName: A one-line mood name (like a playlist title, 3-5 words max)
- subtitle: A short subtitle that evokes feeling or aesthetic (one sentence)
- bgColour: A suggested colour (hex code)
- emojis: 3 matching emojis as a single string

Tone: poetic, charming, cinematic, a bit nostalgic. Nothing generic or corporate. Always match the feel of the films.

Examples of good mood names:
"Bittersweet & Beautiful"
"Sad Girls and Soft Light" 
"French Existential Chaos"
"Films That Feel Like Sunday"
"Dreamy Indie Afternoons"
"Dark Comedy & Wine"

Always respond with valid JSON only.`
        },
        {
          role: "user",
          content: `The user's top films this month are:
${films.map((film, i) => `- ${film}`).join('\n')}

Please return JSON with moodName, subtitle, bgColour (hex), and emojis.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 200
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const moodData = JSON.parse(content) as MoodAnalysis;
    
    // Validate the response structure
    if (!moodData.moodName || !moodData.subtitle || !moodData.bgColour || !moodData.emojis) {
      throw new Error("Invalid mood data structure from OpenAI");
    }

    return moodData;
  } catch (error) {
    console.error("Error generating mood from OpenAI:", error);
    
    // Fallback mood based on film count and general vibe
    const fallbackMoods = [
      {
        moodName: "Cinematic Explorer",
        subtitle: "Discovering stories that speak to the soul",
        bgColour: "#8B5CF6",
        emojis: "🎭🌙📽️"
      },
      {
        moodName: "Film Connoisseur",
        subtitle: "Curating moments of pure cinematic magic",
        bgColour: "#F59E0B",
        emojis: "🎬🍿✨"
      },
      {
        moodName: "Story Seeker",
        subtitle: "Finding beauty in every frame and feeling",
        bgColour: "#EF4444",
        emojis: "🎞️❤️🌟"
      }
    ];
    
    return fallbackMoods[films.length % fallbackMoods.length];
  }
}