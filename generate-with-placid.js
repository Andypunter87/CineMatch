import fetch from 'node-fetch';

async function generateMoodCardWithRealPlacid() {
  const placidApiKey = process.env.PLACID_API_KEY;
  
  if (!placidApiKey) {
    console.error('PLACID_API_KEY not found');
    return;
  }

  console.log('Generating mood card with real Placid template...');
  
  const placidData = {
    template_uuid: 'monthly-mood-card',
    layers: {
      mood_name: { text: 'Introspective Global Cinema Explorer' },
      subtitle: { text: 'Your film journey reveals a soul drawn to profound human stories that transcend borders and languages' },
      film_1: { text: 'The Red Balloon' },
      film_2: { text: 'The Intouchables' },
      film_3: { text: 'The Man from Earth' },
      film_4: { text: 'The Secret in Their Eyes' },
      film_5: { text: 'Wild' },
      bg_colour: { backgroundColor: '#3B82F6' }
    }
  };
  
  try {
    const response = await fetch('https://api.placid.app/api/rest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${placidApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(placidData)
    });
    
    console.log('Placid API response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Success! Generated image URL:', result.image_url);
      
      // Update database with real Placid URL
      const updateQuery = `
        INSERT INTO monthly_mood_cards 
        (user_id, year, month, mood_name, subtitle, bg_colour, emojis, top_films, placid_image_url, share_url, email_sent, created_at)
        VALUES (1, 2025, 6, 'Introspective Global Cinema Explorer', 
        'Your film journey reveals a soul drawn to profound human stories that transcend borders and languages.',
        '#3B82F6',
        '["🎭", "🌍", "💭", "🎬", "✨"]',
        '["The Red Balloon", "The Intouchables", "The Man from Earth", "The Secret in Their Eyes", "Wild"]',
        '${result.image_url}',
        'https://cinematch.co.uk/mymood/2025-06?uid=1',
        false,
        NOW());
      `;
      
      console.log('Database update query prepared with real Placid URL');
      console.log('Real Placid image will be available at:', result.image_url);
      
    } else {
      const errorText = await response.text();
      console.error('Placid API error:', errorText);
    }
    
  } catch (error) {
    console.error('Error calling Placid API:', error);
  }
}

generateMoodCardWithRealPlacid();