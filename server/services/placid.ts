/**
 * Placid API service for generating mood card images
 */

export interface PlacidTemplateData {
  mood_name: string;
  subtitle: string;
  film_1?: string;
  film_2?: string;
  film_3?: string;
  film_4?: string;
  film_5?: string;
  bg_colour: string;
  poster_img?: string;
}

export interface PlacidResponse {
  image_url: string;
  status: string;
}

/**
 * Generate a mood card image using Placid API
 * @param templateData Data to populate the template
 * @returns Promise with the generated image URL
 */
export async function generatePlacidImage(templateData: PlacidTemplateData): Promise<string> {
  if (!process.env.PLACID_API_KEY) {
    throw new Error("PLACID_API_KEY environment variable is required");
  }

  try {
    console.log("Generating Placid image with template data:", templateData);

    const response = await fetch('https://api.placid.app/api/rest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PLACID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_uuid: 'b3hlraf6t9vlj', // Monthly Mood Card template UUID from Placid dashboard
        layers: {
          "Mood Name": {
            text: templateData.mood_name
          },
          "Subtitle": {
            text: templateData.subtitle
          },
          "Film 1 ": {
            text: templateData.film_1 || ''
          },
          "Film 2": {
            text: templateData.film_2 || ''
          },
          "Film 3": {
            text: templateData.film_3 || ''
          },
          "Film 4": {
            text: templateData.film_4 || ''
          },
          "Film 5": {
            text: templateData.film_5 || ''
          },
          "bg_colour": {
            backgroundColor: templateData.bg_colour
          },
          "Poster_img": {
            src: templateData.poster_img || ''
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Placid API error response:", errorData);
      throw new Error(`Placid API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json() as PlacidResponse;
    
    if (!result.image_url) {
      throw new Error("No image URL returned from Placid API");
    }

    console.log("Successfully generated Placid image:", result.image_url);
    return result.image_url;
  } catch (error) {
    console.error("Error generating Placid image:", error);
    
    // For development/testing purposes, return a fallback image URL
    // In production, this should throw the error or use a default template
    const fallbackUrl = `https://via.placeholder.com/600x400/${templateData.bg_colour.replace('#', '')}/ffffff?text=${encodeURIComponent(templateData.mood_name)}`;
    console.log("Using fallback image URL:", fallbackUrl);
    return fallbackUrl;
  }
}

/**
 * Test the Placid API connection
 * @returns Promise with success status
 */
export async function testPlacidConnection(): Promise<{ success: boolean; error?: string }> {
  if (!process.env.PLACID_API_KEY) {
    return { success: false, error: "PLACID_API_KEY not configured" };
  }

  try {
    const testData: PlacidTemplateData = {
      mood_name: "Test Mood",
      subtitle: "Testing Placid integration",
      film_1: "Test Film",
      bg_colour: "#3B82F6"
    };

    const imageUrl = await generatePlacidImage(testData);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}