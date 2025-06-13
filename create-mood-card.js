import { Client } from 'pg';

async function createMoodCard() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Generate mood data
    const moodData = {
      id: `mood_${Date.now()}`,
      userId: 1,
      year: 2025,
      month: 6,
      moodName: "Introspective Global Cinema Explorer",
      moodDescription: "Your June 2025 film journey reveals a soul drawn to profound human stories that transcend borders and languages. From the whimsical poetry of French cinema to the raw emotional depths of international dramas, you seek films that challenge perspectives and touch the heart.",
      topFilms: ["The Red Balloon", "The Intouchables", "The Man from Earth", "The Secret in Their Eyes", "Wild"],
      shareUrl: "https://cinematch.co.uk/mymood/2025-06?uid=1",
      placidImageUrl: null,
      createdAt: new Date().toISOString(),
      emailSent: false
    };

    // Insert into database
    const insertQuery = `
      INSERT INTO monthly_mood_cards 
      (id, user_id, year, month, mood_name, mood_description, top_films, share_url, placid_image_url, created_at, email_sent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id, year, month) 
      DO UPDATE SET 
        mood_name = EXCLUDED.mood_name,
        mood_description = EXCLUDED.mood_description,
        top_films = EXCLUDED.top_films,
        share_url = EXCLUDED.share_url,
        created_at = EXCLUDED.created_at
      RETURNING *;
    `;

    const result = await client.query(insertQuery, [
      moodData.id,
      moodData.userId,
      moodData.year,
      moodData.month,
      moodData.moodName,
      moodData.moodDescription,
      JSON.stringify(moodData.topFilms),
      moodData.shareUrl,
      moodData.placidImageUrl,
      moodData.createdAt,
      moodData.emailSent
    ]);

    console.log('Mood card created successfully:', result.rows[0]);
    return result.rows[0];

  } catch (error) {
    console.error('Error creating mood card:', error);
    throw error;
  } finally {
    await client.end();
  }
}

createMoodCard().then(() => {
  console.log('Mood card generation completed');
  process.exit(0);
}).catch(error => {
  console.error('Failed to create mood card:', error);
  process.exit(1);
});