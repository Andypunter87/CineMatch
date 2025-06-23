import { getFirestoreDb } from './firebase-admin.js';
import { getUserPreferenceProfile } from '../lib/recommendation.js';

/**
 * Test chat data persistence and recommendation enhancement
 */
export async function testChatDataPersistence(userId: string) {
  console.log('🧪 Testing Chat Data Persistence and Recommendation Enhancement');
  console.log('================================================================');
  
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const results = {
    userPreferences: null as any,
    onboardingRatings: 0,
    recommendationFeedback: 0,
    chatSessions: 0,
    vibePreferences: 0,
    userProfile: null as any,
    recommendations: {
      dataPoints: [] as string[],
      strategy: [] as string[]
    }
  };

  try {
    console.log(`👤 Testing for user: ${userId}`);

    // Test 1: Check user preferences
    console.log('\n📊 Checking user preferences...');
    const prefsRef = db.collection('users').doc(userId).collection('preferences').doc('settings');
    const prefsDoc = await prefsRef.get();
    
    if (prefsDoc.exists()) {
      results.userPreferences = prefsDoc.data();
      console.log('✅ User preferences found');
      console.log(`   Country: ${results.userPreferences.country || 'not set'}`);
      console.log(`   Streaming services: ${results.userPreferences.streamingServices?.length || 0}`);
    } else {
      console.log('⚠️  No user preferences in Firestore');
    }

    // Test 2: Check onboarding ratings
    console.log('\n📊 Checking onboarding ratings...');
    const ratingsCollection = db.collection('users').doc(userId).collection('ratings').doc('onboarding').collection('films');
    const ratingsSnapshot = await ratingsCollection.get();
    results.onboardingRatings = ratingsSnapshot.size;
    console.log(`✅ Found ${results.onboardingRatings} onboarding ratings`);

    // Test 3: Check recommendation feedback
    console.log('\n📊 Checking recommendation feedback...');
    const feedbackCollection = db.collection('users').doc(userId).collection('ratings').doc('recommendations').collection('films');
    const feedbackSnapshot = await feedbackCollection.get();
    results.recommendationFeedback = feedbackSnapshot.size;
    console.log(`✅ Found ${results.recommendationFeedback} recommendation feedback entries`);

    // Test 4: Create sample chat session
    console.log('\n💬 Creating sample chat session...');
    const chatSessionId = `test_chat_${Date.now()}`;
    const sampleChatSession = {
      id: chatSessionId,
      userId: parseInt(userId),
      messages: [
        {
          id: '1',
          sender: 'cineMate',
          text: "Hi! I'm CineMate, your friendly film buff. Let's find you the perfect movie to watch!",
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          sender: 'user',
          text: 'At home',
          timestamp: new Date().toISOString()
        },
        {
          id: '3',
          sender: 'user',
          text: 'Something that makes me feel empowered and confident',
          timestamp: new Date().toISOString()
        }
      ],
      preferences: {
        location: 'home',
        audience: 'solo',
        timeOfDay: ['evening'],
        mood: 'Something that makes me feel empowered and confident',
        runtime: ['medium'],
        viewingParty: [],
        additionalContext: 'Generated from chat interface'
      },
      customVibes: ['Something that makes me feel empowered and confident'],
      personalizedMoods: [
        'A story of triumph against all odds',
        'Characters who inspire me to be my best self',
        'An uplifting journey of self-discovery'
      ],
      completed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const sessionRef = db.collection('users').doc(userId).collection('chat_sessions').doc(chatSessionId);
    await sessionRef.set(sampleChatSession);
    console.log(`✅ Chat session created: ${chatSessionId}`);

    // Test 5: Create vibe preferences
    console.log('\n🎭 Creating vibe preferences...');
    const vibePreferences = [
      {
        text: 'Something that makes me feel empowered and confident',
        source: 'user_custom',
        frequency: 2
      },
      {
        text: 'A story of triumph against all odds',
        source: 'ai_generated',
        frequency: 1
      }
    ];

    for (const vibe of vibePreferences) {
      const vibeId = vibe.text.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const vibeRef = db.collection('users').doc(userId).collection('vibe_preferences').doc(vibeId);
      
      await vibeRef.set({
        text: vibe.text,
        frequency: vibe.frequency,
        lastUsed: new Date().toISOString(),
        source: vibe.source
      });
      console.log(`✅ Vibe saved: "${vibe.text}" (${vibe.source})`);
    }

    // Test 6: Check all data after creation
    console.log('\n🔍 Verifying data persistence...');
    const chatSessionsSnapshot = await db.collection('users').doc(userId).collection('chat_sessions').get();
    results.chatSessions = chatSessionsSnapshot.size;
    console.log(`📊 Total chat sessions: ${results.chatSessions}`);

    const vibesSnapshot = await db.collection('users').doc(userId).collection('vibe_preferences').get();
    results.vibePreferences = vibesSnapshot.size;
    console.log(`📊 Total vibe preferences: ${results.vibePreferences}`);

    // Test 7: Test recommendation enhancement
    console.log('\n🚀 Testing recommendation enhancement...');
    try {
      results.userProfile = await getUserPreferenceProfile(userId);
      console.log(`✅ User preference profile generated with ${Object.keys(results.userProfile).length} film preferences`);
    } catch (error) {
      console.log(`⚠️  Could not generate user profile: ${error}`);
    }

    // Test 8: Analyze data for recommendations
    console.log('\n📈 Analyzing data for recommendation strategy...');
    
    results.recommendations.dataPoints = [
      `User preferences: ${results.userPreferences ? 'Available' : 'Missing'}`,
      `Onboarding ratings: ${results.onboardingRatings} films`,
      `Recommendation feedback: ${results.recommendationFeedback} entries`,
      `Chat sessions: ${results.chatSessions} conversations`,
      `Vibe preferences: ${results.vibePreferences} custom vibes`
    ];

    results.recommendations.strategy = [
      'Merge onboarding ratings with recommendation feedback using weighted scoring',
      'Use vibe preference frequency to prioritize mood matching',
      'Analyze chat conversation context for personalization',
      'Apply user streaming services and country filtering',
      'Learn from custom vibe language patterns for future recommendations'
    ];

    console.log('\n📋 Data points available for enhanced recommendations:');
    results.recommendations.dataPoints.forEach(point => {
      console.log(`   ✓ ${point}`);
    });

    console.log('\n🎯 Enhanced recommendation strategy:');
    results.recommendations.strategy.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });

    console.log('\n🎉 Chat data persistence test completed successfully!');
    return results;

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Analyze user's vibe patterns for recommendation insights
 */
export async function analyzeUserVibePatterns(userId: string) {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const vibesSnapshot = await db.collection('users').doc(userId).collection('vibe_preferences').get();
    
    const vibes: Array<{text: string, frequency: number, source: string, lastUsed: string}> = [];
    vibesSnapshot.forEach(doc => {
      const data = doc.data();
      vibes.push({
        text: data.text,
        frequency: data.frequency || 1,
        source: data.source,
        lastUsed: data.lastUsed
      });
    });

    // Sort by frequency
    vibes.sort((a, b) => b.frequency - a.frequency);

    const analysis = {
      totalVibes: vibes.length,
      userCustomVibes: vibes.filter(v => v.source === 'user_custom').length,
      aiGeneratedVibes: vibes.filter(v => v.source === 'ai_generated').length,
      mostFrequentVibe: vibes[0] || null,
      recentVibes: vibes.filter(v => {
        const lastUsed = new Date(v.lastUsed);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return lastUsed > oneWeekAgo;
      }),
      patterns: {
        preferredStyle: vibes[0]?.text || null,
        averageFrequency: vibes.length > 0 ? vibes.reduce((sum, v) => sum + v.frequency, 0) / vibes.length : 0,
        customVsAi: vibes.filter(v => v.source === 'user_custom').length > vibes.filter(v => v.source === 'ai_generated').length ? 'prefers_custom' : 'accepts_ai'
      }
    };

    return analysis;
  } catch (error) {
    console.error('Error analyzing vibe patterns:', error);
    return null;
  }
}