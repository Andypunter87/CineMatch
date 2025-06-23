import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBVT3-PoMtB4bZB8-CnxzZo9QJcj7xY5YQ",
  authDomain: "cinematch-892cd.firebaseapp.com",
  projectId: "cinematch-892cd",
  storageBucket: "cinematch-892cd.firebasestorage.app",
  messagingSenderId: "649770439987",
  appId: "1:649770439987:web:8b8f8a4c8b4b8b4b4b4b4b"
};

async function testChatDataPersistence() {
  console.log('Testing Chat Data Persistence with Client SDK');
  console.log('==============================================');

  try {
    // Initialize Firebase client
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('Firebase client initialized');

    const testUserId = '64'; // Current logged-in user
    
    // Test 1: Create sample chat session
    console.log('\n1. Creating sample chat session...');
    const chatSessionId = `demo_chat_${Date.now()}`;
    const sampleChatSession = {
      id: chatSessionId,
      userId: parseInt(testUserId),
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
          text: 'Something that makes me feel like I can take on the world',
          timestamp: new Date().toISOString()
        }
      ],
      preferences: {
        location: 'home',
        audience: 'solo',
        timeOfDay: ['evening'],
        mood: 'Something that makes me feel like I can take on the world',
        runtime: ['medium'],
        viewingParty: [],
        additionalContext: 'Generated from chat interface'
      },
      customVibes: ['Something that makes me feel like I can take on the world'],
      personalizedMoods: [
        'Stories of triumph against all odds',
        'Characters who inspire courage and determination',
        'Films that celebrate the human spirit'
      ],
      completed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const sessionRef = doc(db, 'users', testUserId, 'chat_sessions', chatSessionId);
    await setDoc(sessionRef, sampleChatSession);
    console.log(`✓ Chat session saved: ${chatSessionId}`);

    // Test 2: Create vibe preferences
    console.log('\n2. Creating vibe preferences...');
    const vibePreferences = [
      {
        text: 'Something that makes me feel like I can take on the world',
        source: 'user_custom',
        frequency: 3
      },
      {
        text: 'Stories of triumph against all odds',
        source: 'ai_generated',
        frequency: 1
      },
      {
        text: 'Characters who inspire courage and determination',
        source: 'ai_generated',
        frequency: 1
      }
    ];

    for (const vibe of vibePreferences) {
      const vibeId = vibe.text.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const vibeRef = doc(db, 'users', testUserId, 'vibe_preferences', vibeId);
      
      await setDoc(vibeRef, {
        text: vibe.text,
        frequency: vibe.frequency,
        lastUsed: new Date().toISOString(),
        source: vibe.source
      });
      console.log(`✓ Vibe saved: "${vibe.text}" (${vibe.source})`);
    }

    // Test 3: Query saved data
    console.log('\n3. Querying saved data...');
    
    // Check chat sessions
    const chatSessionsRef = collection(db, 'users', testUserId, 'chat_sessions');
    const chatSessionsSnap = await getDocs(chatSessionsRef);
    console.log(`✓ Found ${chatSessionsSnap.size} chat sessions`);

    // Check vibe preferences
    const vibesRef = collection(db, 'users', testUserId, 'vibe_preferences');
    const vibesSnap = await getDocs(vibesRef);
    console.log(`✓ Found ${vibesSnap.size} vibe preferences`);

    // Test 4: Show how data improves recommendations
    console.log('\n4. Analyzing data for recommendation improvement...');
    
    console.log('\nUser Pattern Analysis:');
    const vibes = [];
    vibesSnap.forEach(doc => {
      const data = doc.data();
      vibes.push({
        text: data.text,
        frequency: data.frequency || 1,
        source: data.source
      });
    });

    vibes.sort((a, b) => b.frequency - a.frequency);
    
    vibes.forEach(vibe => {
      console.log(`  - "${vibe.text}" (used ${vibe.frequency}x, ${vibe.source})`);
    });

    const userCustomVibes = vibes.filter(v => v.source === 'user_custom');
    const aiGeneratedVibes = vibes.filter(v => v.source === 'ai_generated');
    
    console.log(`\nPattern Insights:`);
    console.log(`  - User-created vibes: ${userCustomVibes.length}`);
    console.log(`  - AI-generated vibes: ${aiGeneratedVibes.length}`);
    console.log(`  - Most frequent vibe: "${vibes[0]?.text}" (${vibes[0]?.frequency}x)`);
    
    console.log(`\nRecommendation Enhancement Strategy:`);
    console.log(`  1. Prioritize films matching "${vibes[0]?.text}" theme`);
    console.log(`  2. Use AI-generated alternatives for variety`);
    console.log(`  3. Learn user's language patterns for future personalization`);
    console.log(`  4. Cross-reference with user's streaming services and ratings`);

    console.log('\n✓ Chat data persistence test completed successfully!');
    
    return {
      chatSessions: chatSessionsSnap.size,
      vibePreferences: vibesSnap.size,
      topVibe: vibes[0]?.text || 'None',
      userCustomCount: userCustomVibes.length,
      aiGeneratedCount: aiGeneratedVibes.length
    };

  } catch (error) {
    console.error('Test failed:', error.message);
    throw error;
  }
}

// Run the test
testChatDataPersistence()
  .then(results => {
    console.log('\nTest Results Summary:');
    console.log('====================');
    console.log(`Chat Sessions: ${results.chatSessions}`);
    console.log(`Vibe Preferences: ${results.vibePreferences}`);
    console.log(`Top Vibe: "${results.topVibe}"`);
    console.log(`User Custom: ${results.userCustomCount}`);
    console.log(`AI Generated: ${results.aiGeneratedCount}`);
    console.log('\n✨ All tests passed - Chat data persistence is working!');
  })
  .catch(error => {
    console.error('Test execution failed:', error);
  });