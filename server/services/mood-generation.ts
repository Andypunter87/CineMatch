import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface MoodAnalysis {
  moodName: string;
  subtitle: string;
  bgColour: string;
  emojis: string;
}

export async function generateMoodFromFilms(films: string[]): Promise<MoodAnalysis> {
  if (!films || films.length === 0) {
    return {
      moodName: "New Beginnings",
      subtitle: "Ready to discover your first cinematic adventures",
      bgColour: "#3B82F6",
      emojis: "🎬✨🌟"
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 200,
      system: `You are a poetic brand writer for CineMatch — a mood-based film recommendation service with a warm, stylish tone.

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

Always respond with valid JSON only.`,
      messages: [
        {
          role: "user",
          content: `The user's top films this month are:
${films.map((film) => `- ${film}`).join('\n')}

Please return JSON with moodName, subtitle, bgColour (hex), and emojis.`
        }
      ]
    });

    const block = response.content[0];
    if (!block || block.type !== "text" || !block.text) {
      throw new Error("Empty response from Claude");
    }

    let text = block.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    const moodData = JSON.parse(text) as MoodAnalysis;

    if (!moodData.moodName || !moodData.subtitle || !moodData.bgColour || !moodData.emojis) {
      throw new Error("Invalid mood data structure from Claude");
    }

    return moodData;
  } catch (error) {
    console.error("Error generating mood from Claude:", error);

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
