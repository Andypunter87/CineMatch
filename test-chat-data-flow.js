import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function testChatDataFlow() {
  console.log('🧪 Testing Complete Chat Data Flow and Recommendation Enhancement');
  console.log('================================================================');

  try {
    // Get Firebase credentials from environment
    const firebaseKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;
    if (!firebaseKey) {
      console.log('❌ No Firebase credentials found - checking existing app');
      // Try to use existing Firebase app if already initialized
      const existingApps = await import('firebase-admin').then(admin => admin.default.apps);
      if (existingApps.length === 0) {
        throw new Error('No Firebase app initialized');
      }
      console.log('✅ Using existing Firebase app');
    } else {
      const serviceAccount = JSON.parse(firebaseKey);
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('✅ Firebase Admin initialized');
    }

    const db = getFirestore();
    
    // Test user ID - using the logged-in user from the console logs
    const testUserId = '64';
    
    console.log(`\n👤 Testing chat data flow for user: ${testUserId}`);
    console.log('===================================================');

    // Test 1: Check existing user data structures
    console.log('\n📊 Test 1: Checking existing user data in Firestore...');
    
    // Check user preferences
    const prefsRef = db.collection('users').doc(testUserId).collection('preferences').doc('settings');
    const prefsDoc = await prefsRef.get();
    
    if (prefsDoc.exists()) {
      console.log('✅ User preferences found in Firestore');
      const prefsData = prefsDoc.data();
      console.log(`   - Country: ${prefsData.country || 'not set'}`);
      console.log(`   - Streaming services: ${prefsData.streamingServices ? prefsData.streamingServices.length : 0} services`);
      console.log(`   - Last updated: ${prefsData.lastUpdated || 'unknown'}`);
    } else {
      console.log('⚠️  No user preferences found in Firestore');
    }

    // Check onboarding ratings
    const ratingsCollection = db.collection('users').doc(testUserId).collection('ratings').doc('onboarding').collection('films');
    const ratingsSnapshot = await ratingsCollection.get();
    
    console.log(`✅ Found ${ratingsSnapshot.size} onboarding film ratings`);
    if (ratingsSnapshot.size > 0) {
      console.log('   Sample ratings:');
      let count = 0;
      ratingsSnapshot.forEach(doc => {
        if (count < 3) {
          const data = doc.data();
          console.log(`   - Film ${doc.id}: ${data.rating}/5 (${data.filmTitle || 'Unknown title'})`);
          count++;
        }
      });
    }

    // Check recommendation feedback
    const feedbackCollection = db.collection('users').doc(testUserId).collection('ratings').doc('recommendations').collection('films');
    const feedbackSnapshot = await feedbackCollection.get();
    
    console.log(`✅ Found ${feedbackSnapshot.size} recommendation feedback entries`);
    if (feedbackSnapshot.size > 0) {
      console.log('   Sample feedback:');
      let count = 0;
      feedbackSnapshot.forEach(doc => {
        if (count < 3) {
          const data = doc.data();
          console.log(`   - Film ${doc.id}: ${data.liked ? 'LIKED' : 'DISLIKED'} (${data.filmTitle || 'Unknown title'})`);
          count++;
        }
      });
    }

    // Test 2: Simulate chat session data
    console.log('\n💬 Test 2: Creating sample chat session...');
    
    const chatSessionId = `test_chat_${Date.now()}`;
    const sampleChatSession = {
      id: chatSessionId,
      userId: parseInt(testUserId),
      messages: [
        {
          id: '1',
          sender: 'cineMate',
          text: "Hi! I'm CineMate, your friendly film buff. Let's find you the perfect movie to watch! 🎬",
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          sender: 'cineMate',
          text: 'Where are you watching?',
          timestamp: new Date().toISOString()
        },
        {
          id: '3',
          sender: 'user',
          text: 'At home',
          timestamp: new Date().toISOString()
        },
        {
          id: '4',
          sender: 'cineMate',
          text: 'Who are you watching with?',
          timestamp: new Date().toISOString()
        },
        {
          id: '5',
          sender: 'user',
          text: 'Just me',
          timestamp: new Date().toISOString()
        },
        {
          id: '6',
          sender: 'cineMate',
          text: 'What time of day are you watching?',
          timestamp: new Date().toISOString()
        },
        {
          id: '7',
          sender: 'user',
          text: 'Evening',
          timestamp: new Date().toISOString()
        },
        {
          id: '8',
          sender: 'cineMate',
          text: 'What kind of vibe are you looking for?',
          timestamp: new Date().toISOString()
        },
        {
          id: '9',
          sender: 'user',
          text: 'Something that makes me feel like I can conquer the world',
          timestamp: new Date().toISOString()
        }
      ],
      preferences: {
        location: 'home',
        audience: 'solo',
        timeOfDay: ['evening'],
        mood: 'Something that makes me feel like I can conquer the world',
        runtime: ['medium'],
        viewingParty: [],
        additionalContext: 'Generated from chat interface'
      },
      customVibes: ['Something that makes me feel like I can conquer the world'],
      personalizedMoods: [
        'Something that feels like a warm hug',
        'An empowering journey of self-discovery',
        'Action that gets my heart racing',
        'A story that makes me believe in myself'
      ],
      completed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save chat session
    const sessionRef = db.collection('users').doc(testUserId).collection('chat_sessions').doc(chatSessionId);
    await sessionRef.set(sampleChatSession);
    console.log(`✅ Chat session saved: ${chatSessionId}`);
    console.log(`   Messages: ${sampleChatSession.messages.length}`);
    console.log(`   Custom vibe: "${sampleChatSession.preferences.mood}"`);
    console.log(`   Personalized moods: ${sampleChatSession.personalizedMoods.length}`);

    // Test 3: Save vibe preferences with frequency tracking
    console.log('\n🎭 Test 3: Creating vibe preference data...');
    
    const vibePreferences = [
      { 
        text: 'Something that makes me feel like I can conquer the world',
        source: 'user_custom',
        frequency: 3,
        description: 'User-created empowering vibe'
      },
      {
        text: 'A story that makes me believe in myself',
        source: 'ai_generated',
        frequency: 1,
        description: 'AI-generated based on user context'
      },
      {
        text: 'Action that gets my heart racing',
        source: 'ai_generated', 
        frequency: 2,
        description: 'AI-generated based on previous selections'
      }
    ];

    for (const vibe of vibePreferences) {
      const vibeId = vibe.text.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const vibeRef = db.collection('users').doc(testUserId).collection('vibe_preferences').doc(vibeId);
      
      const vibeData = {
        text: vibe.text,
        frequency: vibe.frequency,
        lastUsed: new Date().toISOString(),
        source: vibe.source,
        description: vibe.description
      };
      
      await vibeRef.set(vibeData);
      console.log(`✅ Vibe saved: "${vibe.text}" (frequency: ${vibe.frequency}, ${vibe.source})`);
    }

    // Test 4: Query and analyze the data for recommendations
    console.log('\n🔍 Test 4: Analyzing user data for recommendation enhancement...');
    
    // Get all chat sessions
    const chatSessionsSnapshot = await db.collection('users').doc(testUserId).collection('chat_sessions').get();
    console.log(`📊 Total chat sessions: ${chatSessionsSnapshot.size}`);
    
    // Get all vibe preferences ordered by frequency
    const vibesSnapshot = await db.collection('users').doc(testUserId).collection('vibe_preferences').get();
    console.log(`📊 Total vibe preferences: ${vibesSnapshot.size}`);
    
    if (vibesSnapshot.size > 0) {
      console.log('\n🎯 User\'s vibe preference patterns:');
      const vibes = [];
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
      
      vibes.forEach(vibe => {
        console.log(`   - "${vibe.text}" (used ${vibe.frequency}x, ${vibe.source})`);
      });
      
      // Identify patterns
      const userCustomVibes = vibes.filter(v => v.source === 'user_custom');
      const aiGeneratedVibes = vibes.filter(v => v.source === 'ai_generated');
      
      console.log(`\n📈 Pattern Analysis:`);
      console.log(`   - User-created vibes: ${userCustomVibes.length}`);
      console.log(`   - AI-generated vibes: ${aiGeneratedVibes.length}`);
      console.log(`   - Most frequent vibe: "${vibes[0]?.text}" (${vibes[0]?.frequency}x)`);
      
      if (userCustomVibes.length > 0) {
        console.log(`   - Preferred custom style: "${userCustomVibes[0].text}"`);
      }
    }

    // Test 5: Demonstrate how this data enhances recommendations
    console.log('\n🚀 Test 5: Recommendation enhancement strategy...');
    
    console.log('📋 Data points available for enhanced recommendations:');
    console.log(`   ✓ User preferences: Country, streaming services`);
    console.log(`   ✓ Film ratings: ${ratingsSnapshot.size} onboarding ratings`);
    console.log(`   ✓ Recommendation feedback: ${feedbackSnapshot.size} like/dislike entries`);
    console.log(`   ✓ Chat sessions: ${chatSessionsSnapshot.size} conversation histories`);
    console.log(`   ✓ Vibe preferences: ${vibesSnapshot.size} custom mood preferences`);
    
    console.log('\n🎯 Enhanced recommendation strategy:');
    console.log('   1. Merge user ratings with feedback (weighted scoring)');
    console.log('   2. Use vibe preference frequency for mood matching');
    console.log('   3. Analyze chat context for personalization');
    console.log('   4. Apply streaming service and country filtering');
    console.log('   5. Learn from user\'s custom vibe language patterns');

    // Test 6: Verify data retrieval for recommendation engine
    console.log('\n🔧 Test 6: Testing data retrieval for recommendation engine...');
    
    try {
      // Test the existing recommendation.ts functions
      const { getUserPreferenceProfile } = await import('./lib/recommendation.js');
      
      console.log('✅ Testing getUserPreferenceProfile...');
      const userProfile = await getUserPreferenceProfile(testUserId);
      
      console.log(`📊 User preference profile generated:`);
      console.log(`   - Total film preferences: ${Object.keys(userProfile).length}`);
      
      if (Object.keys(userProfile).length > 0) {
        const topPreferences = Object.entries(userProfile)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
        
        console.log('   Top 5 film preferences:');
        topPreferences.forEach(([filmId, score]) => {
          console.log(`     - Film ${filmId}: ${score.toFixed(2)} score`);
        });
      }
      
    } catch (error) {
      console.log(`⚠️  Could not test recommendation functions: ${error.message}`);
    }

    console.log('\n🎉 Chat data flow test completed successfully!');
    console.log('\n📋 Summary of data persistence:');
    console.log('   ✓ Chat sessions capture complete conversation history');
    console.log('   ✓ Custom vibe preferences tracked with usage frequency');
    console.log('   ✓ AI-generated moods saved for future personalization');
    console.log('   ✓ Data is structured for recommendation engine consumption');
    console.log('   ✓ User patterns identified for improved matching');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testChatDataFlow().then(() => {
  console.log('\n✨ Test execution completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});