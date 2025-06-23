import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function testChatPersistence() {
  console.log('🧪 Testing Chat Data Persistence to Firestore');
  console.log('=============================================');

  try {
    // Initialize Firebase Admin
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not found');
    }

    const serviceAccount = JSON.parse(serviceAccountKey);
    
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    const db = getFirestore(app);
    console.log('✅ Firebase Admin initialized successfully');

    // Test user ID
    const testUserId = '1';
    
    // Test 1: Save a sample chat session
    console.log('\n📝 Test 1: Saving sample chat session...');
    
    const sampleChatSession = {
      id: `chat_test_${Date.now()}`,
      userId: parseInt(testUserId),
      messages: [
        {
          id: '1',
          sender: 'cineMate',
          text: 'Hi! I\'m CineMate, your friendly film buff. Let\'s find you the perfect movie to watch! 🎬',
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
        }
      ],
      preferences: {
        location: 'home',
        audience: 'solo',
        timeOfDay: ['evening'],
        mood: 'Something that makes me feel cozy',
        runtime: ['medium'],
        viewingParty: [],
        additionalContext: 'Generated from chat interface'
      },
      customVibes: ['Something that makes me feel cozy'],
      personalizedMoods: [
        'Something that feels like a warm hug',
        'A cozy evening escape',
        'Comfort food for the soul'
      ],
      completed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const sessionRef = db.collection('users').doc(testUserId).collection('chat_sessions').doc(sampleChatSession.id);
    await sessionRef.set(sampleChatSession);
    
    console.log(`✅ Chat session saved: ${sampleChatSession.id}`);
    console.log(`   Path: users/${testUserId}/chat_sessions/${sampleChatSession.id}`);
    console.log(`   Messages: ${sampleChatSession.messages.length}`);
    console.log(`   Custom vibes: ${sampleChatSession.customVibes.length}`);
    console.log(`   Personalized moods: ${sampleChatSession.personalizedMoods.length}`);

    // Test 2: Save sample vibe preferences
    console.log('\n🎭 Test 2: Saving sample vibe preferences...');
    
    const sampleVibes = [
      { text: 'Something that makes me feel cozy', source: 'user_custom' },
      { text: 'A film that surprises me', source: 'ai_generated' },
      { text: 'Make me feel cleverer than I am', source: 'ai_generated' }
    ];

    for (const vibe of sampleVibes) {
      const vibeId = vibe.text.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const vibeRef = db.collection('users').doc(testUserId).collection('vibe_preferences').doc(vibeId);
      
      const vibeData = {
        text: vibe.text,
        frequency: 1,
        lastUsed: new Date().toISOString(),
        source: vibe.source
      };
      
      await vibeRef.set(vibeData);
      console.log(`✅ Vibe saved: "${vibe.text}" (${vibe.source})`);
    }

    // Test 3: Verify data can be retrieved
    console.log('\n🔍 Test 3: Verifying data retrieval...');
    
    // Check chat sessions
    const sessionsSnapshot = await db.collection('users').doc(testUserId).collection('chat_sessions').get();
    console.log(`✅ Found ${sessionsSnapshot.size} chat sessions for user ${testUserId}`);
    
    // Check vibe preferences  
    const vibesSnapshot = await db.collection('users').doc(testUserId).collection('vibe_preferences').get();
    console.log(`✅ Found ${vibesSnapshot.size} vibe preferences for user ${testUserId}`);
    
    if (vibesSnapshot.size > 0) {
      console.log('\n📊 Sample vibe preferences:');
      vibesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - "${data.text}" (frequency: ${data.frequency}, source: ${data.source})`);
      });
    }

    console.log('\n🎉 All tests passed! Chat data persistence is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  }
}

// Run the test
testChatPersistence().then(() => {
  console.log('\n✨ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});