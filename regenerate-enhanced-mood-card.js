import { generateMoodCard } from './server/services/monthly-mood-cards.js';
import { db } from './server/db.js';
import { monthlyMoodCards } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function regenerateEnhancedMoodCard() {
  try {
    console.log('🎨 Regenerating mood card with poster background and overlay color...');
    
    // Delete existing mood card first
    
    await db.delete(monthlyMoodCards)
      .where(and(
        eq(monthlyMoodCards.userId, 1),
        eq(monthlyMoodCards.year, 2025),
        eq(monthlyMoodCards.month, 6)
      ));
    
    console.log('✅ Deleted existing mood card');
    
    // Generate new mood card with poster integration
    const topFilms = [
      "The Red Balloon",
      "The Intouchables", 
      "The Man from Earth",
      "The Secret in Their Eyes",
      "Wild"
    ];
    
    const moodCard = await generateMoodCard(1, 2025, 6, topFilms);
    
    console.log('✅ Generated enhanced mood card:', {
      moodName: moodCard.moodName,
      placidImageUrl: moodCard.placidImageUrl
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

regenerateEnhancedMoodCard();