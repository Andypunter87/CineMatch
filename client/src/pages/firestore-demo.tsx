import React from 'react';
import { FirestoreDemo } from '@/components/FirestoreDemo';
import { FirestoreMigration } from '@/components/FirestoreMigration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FirestoreDemoPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Firestore Integration Demo</h1>
      <p className="text-muted-foreground mb-6">
        This page demonstrates the unified Firestore schema with subcollections for CineMatch.
        It allows testing all the major data operations in the new schema.
      </p>
      
      <Tabs defaultValue="demo" className="w-full mb-8">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="demo">Test Operations</TabsTrigger>
          <TabsTrigger value="migration">Data Migration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="demo">
          <FirestoreDemo />
        </TabsContent>
        
        <TabsContent value="migration">
          <FirestoreMigration />
        </TabsContent>
      </Tabs>
      
      <div className="mt-8 p-4 bg-muted rounded-md">
        <h2 className="text-lg font-semibold mb-2">Schema Structure:</h2>
        <pre className="text-sm overflow-auto p-4 bg-background rounded">
{`Firestore Schema:
- Collection: users
  - Document: {userId}
    - Document fields:
      - preferences: { country, streamingServices }
      - onboardingStatus: { step, progress }
    - Subcollection: onboardingRatings
      - Document {filmId}: { filmId, title, rating (1–5), status, timestamp }
    - Subcollection: recommendationRatings
      - Document {filmId}: { filmId, title, rating (good/bad), timestamp }
    - Subcollection: watchlist
      - Document {filmId}: { filmId, title, posterUrl, addedAt }
    - Subcollection: friends
      - Document {friendUserId}: { friendSince, status ('accepted' | 'pending' | 'blocked') }
    - Subcollection: sharedRecommendations
      - Document {sessionId}: { friends: [userId], recommendedFilms: [filmId], createdAt, context }`}
        </pre>
      </div>
      
      <div className="mt-8 p-4 bg-muted rounded-md">
        <h2 className="text-lg font-semibold mb-2">Example Firestore Queries:</h2>
        <p className="mb-4">Here are some example queries you can run in the Firebase Console:</p>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Get user preferences:</h3>
            <pre className="text-sm bg-background p-2 rounded">
              {`db.collection('users').doc('user-40').get()`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium">Get all onboarding ratings for a user:</h3>
            <pre className="text-sm bg-background p-2 rounded">
              {`db.collection('users').doc('user-40').collection('onboardingRatings').get()`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium">Get a user's watchlist:</h3>
            <pre className="text-sm bg-background p-2 rounded">
              {`db.collection('users').doc('user-40').collection('watchlist').get()`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium">Get a user's friends:</h3>
            <pre className="text-sm bg-background p-2 rounded">
              {`db.collection('users').doc('user-40').collection('friends').where('status', '==', 'accepted').get()`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium">Get a user's shared recommendations:</h3>
            <pre className="text-sm bg-background p-2 rounded">
              {`db.collection('users').doc('user-40').collection('sharedRecommendations').orderBy('createdAt', 'desc').get()`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}