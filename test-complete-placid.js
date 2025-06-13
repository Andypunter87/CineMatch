import fetch from 'node-fetch';
import { Client } from 'pg';

async function testCompletePlacidIntegration() {
  const placidApiKey = process.env.PLACID_API_KEY;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Testing complete Placid integration pipeline...');
    
    // Step 1: Generate Placid image using correct endpoint
    const placidResponse = await fetch('https://api.placid.app/api/rest/images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${placidApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_uuid: 'b3hlraf6t9vlj',
        layers: {
          "Mood Name": { text: "Introspective Global Cinema Explorer" },
          "Subtitle": { text: "Your film journey reveals a soul drawn to profound human stories that transcend borders and languages" },
          "Film 1 ": { text: "The Red Balloon" },
          "Film 2": { text: "The Intouchables" },
          "Film 3": { text: "The Man from Earth" },
          "Film 4": { text: "The Secret in Their Eyes" },
          "Film 5": { text: "Wild" },
          "bg_colour": { backgroundColor: "#3B82F6" }
        }
      })
    });
    
    const placidResult = await placidResponse.json();
    console.log('Placid API response:', placidResult);
    
    if (placidResult.status === 'queued' && placidResult.polling_url) {
      console.log('Image queued, polling for completion...');
      
      // Poll for image completion
      let finalImageUrl = null;
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const pollResponse = await fetch(placidResult.polling_url, {
          headers: { 'Authorization': `Bearer ${placidApiKey}` }
        });
        
        const pollResult = await pollResponse.json();
        console.log(`Poll ${i + 1}:`, pollResult.status);
        
        if (pollResult.status === 'finished' && pollResult.image_url) {
          finalImageUrl = pollResult.image_url;
          console.log('Final image URL:', finalImageUrl);
          break;
        }
      }
      
      // Step 2: Create mood card in database with real Placid URL
      if (finalImageUrl) {
        const insertQuery = `
          INSERT INTO monthly_mood_cards 
          (user_id, year, month, mood_name, subtitle, bg_colour, emojis, top_films, placid_image_url, share_url, email_sent, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `;
        
        await client.query(insertQuery, [
          1, 2025, 6,
          'Introspective Global Cinema Explorer',
          'Your film journey reveals a soul drawn to profound human stories that transcend borders and languages.',
          '#3B82F6',
          '["🎭", "🌍", "💭", "🎬", "✨"]',
          '["The Red Balloon", "The Intouchables", "The Man from Earth", "The Secret in Their Eyes", "Wild"]',
          finalImageUrl,
          'https://cinematch.co.uk/mymood/2025-06?uid=1',
          false
        ]);
        
        console.log('Mood card created successfully with authentic Placid image');
        
        // Step 3: Test API endpoint
        const testResponse = await fetch('http://localhost:5000/api/mood-card/public/2025/06?uid=1');
        const testResult = await testResponse.json();
        console.log('API test result:', testResult);
        
      } else {
        console.log('Image generation timed out or failed');
      }
    }
    
  } catch (error) {
    console.error('Error in Placid integration test:', error);
  } finally {
    await client.end();
  }
}

testCompletePlacidIntegration();