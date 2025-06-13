import fetch from 'node-fetch';

async function regenerateMoodCardWithPlacid() {
  try {
    console.log('Regenerating mood card with Placid API integration...');
    
    // Test Placid API first
    const placidApiKey = process.env.PLACID_API_KEY;
    if (!placidApiKey) {
      console.error('PLACID_API_KEY not found');
      return;
    }
    
    console.log('Testing Placid API connection...');
    
    const placidData = {
      template_uuid: 'monthly-mood-card',
      layers: {
        mood_name: { text: 'Introspective Global Cinema Explorer' },
        subtitle: { text: 'Your film journey reveals a soul drawn to profound human stories' },
        film_1: { text: 'The Red Balloon' },
        film_2: { text: 'The Intouchables' },
        film_3: { text: 'Wild' },
        film_4: { text: 'The Man from Earth' },
        film_5: { text: 'The Secret in Their Eyes' },
        bg_colour: { backgroundColor: '#3B82F6' }
      }
    };
    
    const placidResponse = await fetch('https://api.placid.app/api/rest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${placidApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(placidData)
    });
    
    console.log('Placid API response status:', placidResponse.status);
    const placidResult = await placidResponse.text();
    console.log('Placid API response:', placidResult);
    
    let placidImageUrl = null;
    
    if (placidResponse.ok) {
      try {
        const parsedResult = JSON.parse(placidResult);
        placidImageUrl = parsedResult.image_url;
        console.log('Generated Placid image URL:', placidImageUrl);
      } catch (e) {
        console.log('Could not parse Placid response, using fallback');
      }
    } else {
      console.log('Placid API call failed, this is expected without proper template setup');
    }
    
    // Generate fallback image URL
    if (!placidImageUrl) {
      placidImageUrl = `https://via.placeholder.com/600x400/3B82F6/ffffff?text=${encodeURIComponent('Introspective Global Cinema Explorer')}`;
      console.log('Using fallback image URL:', placidImageUrl);
    }
    
    // Now create the mood card via the API endpoint
    const moodCardResponse = await fetch('http://localhost:5000/api/mood-card/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=test_session' // This will fail auth but we'll see the logs
      },
      body: JSON.stringify({
        year: 2025,
        month: 6
      })
    });
    
    console.log('Mood card generation response status:', moodCardResponse.status);
    const moodCardResult = await moodCardResponse.text();
    console.log('Mood card response:', moodCardResult);
    
  } catch (error) {
    console.error('Error regenerating mood card:', error);
  }
}

regenerateMoodCardWithPlacid();