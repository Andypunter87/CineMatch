import { testPlacidConnection, generatePlacidImage } from './server/services/placid.js';

async function testPlacidIntegration() {
  console.log('Testing Placid API connection...');
  
  // Test connection
  const connectionTest = await testPlacidConnection();
  console.log('Connection test result:', connectionTest);
  
  if (!connectionTest.success) {
    console.error('Placid connection failed:', connectionTest.error);
    return;
  }
  
  // Test image generation
  try {
    const testData = {
      mood_name: "Introspective Global Cinema Explorer",
      subtitle: "Your film journey reveals a soul drawn to profound human stories",
      film_1: "The Red Balloon",
      film_2: "The Intouchables", 
      film_3: "Wild",
      bg_colour: "#3B82F6"
    };
    
    console.log('Testing image generation with:', testData);
    const imageUrl = await generatePlacidImage(testData);
    console.log('Generated image URL:', imageUrl);
    
  } catch (error) {
    console.error('Image generation failed:', error.message);
  }
}

testPlacidIntegration();