import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestoreCollections } from '@/hooks/use-firestore-collections';
import { useFilmRatings } from '@/hooks/use-film-ratings';
import { useWatchlist } from '@/hooks/use-watchlist';
import { useFriends } from '@/hooks/use-friends';
import { useSharedRecommendations } from '@/hooks/use-shared-recommendations';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

/**
 * Component for testing the unified Firestore schema integration
 */
export function FirestoreDemo() {
  const { user } = useAuth();
  const firestore = useFirestoreCollections();
  const [activeTab, setActiveTab] = useState('preferences');
  const [testData, setTestData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize all the hooks
  const { 
    preferences, savePreferences, updateOnboardingStatus, 
    onboardingStatus, isLoadingPreferences 
  } = useUserPreferences();
  
  const { 
    ratings, rateFilm, loadRatingsFromFirestore,
    isLoadingRatings 
  } = useFilmRatings(true); // onboarding ratings
  
  const { 
    watchlist, addToWatchlist, removeFromWatchlist,
    isLoadingWatchlist 
  } = useWatchlist();
  
  const { 
    friends, addFriend, updateFriendStatus,
    removeFriend, isLoadingFriends
  } = useFriends();
  
  const { 
    sessions, saveSession,
    isLoadingSessions
  } = useSharedRecommendations();

  // Random test data for each type
  const testPreferences = {
    country: 'us',
    streamingServices: ['netflix', 'hulu', 'amazonprime']
  };

  const testRating: FilmRating = {
    filmId: Math.floor(Math.random() * 1000000),
    title: `Test Film ${Math.floor(Math.random() * 100)}`,
    rating: Math.floor(Math.random() * 5) + 1,
    status: 'completed',
    timestamp: new Date().toISOString()
  };

  const testWatchlistItem = {
    filmId: Math.floor(Math.random() * 1000000),
    title: `Watchlist Film ${Math.floor(Math.random() * 100)}`,
    posterUrl: 'https://via.placeholder.com/300x450',
    year: 2023,
    genres: ['Action', 'Drama'],
    addedAt: new Date().toISOString()
  };

  const testFriend = {
    friendId: Math.floor(Math.random() * 1000),
    status: 'pending' as const,
    username: `testuser${Math.floor(Math.random() * 100)}`,
    name: `Test User ${Math.floor(Math.random() * 100)}`,
    email: `test${Math.floor(Math.random() * 100)}@example.com`
  };

  const testSession = {
    friends: [1, 2, 3],
    recommendedFilms: [101, 102, 103],
    context: {
      mood: 'happy',
      duration: '2h',
      audience: 'family'
    }
  };

  // Test functions for each type
  const testUserPreferences = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await savePreferences(testPreferences);
      await updateOnboardingStatus({
        step: 2,
        progress: 50,
        completed: false
      });
      
      // Load the current data
      const userData = await firestore.getUserData(user?.id || 0);
      setTestData(userData);
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const testOnboardingRatings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await rateFilm(testRating);
      
      // Load the current data
      const ratings = await loadRatingsFromFirestore();
      setTestData(ratings);
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const testWatchlistOperations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await addToWatchlist(testWatchlistItem);
      
      // Load the current data
      const watchlistItems = await firestore.getWatchlist(user?.id || 0);
      setTestData(watchlistItems);
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const testFriendOperations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await addFriend(testFriend);
      
      // Load the current data
      const friendsList = await firestore.getFriends(user?.id || 0);
      setTestData(friendsList);
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const testSharedRecommendations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await saveSession({ session: testSession });
      
      // Load the current data
      const sessionsList = await firestore.getSharedRecommendations(user?.id || 0);
      setTestData(sessionsList);
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data for the current tab on mount and tab change
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        switch (activeTab) {
          case 'preferences':
            const userData = await firestore.getUserData(user.id);
            setTestData(userData);
            break;
            
          case 'ratings':
            const ratings = await firestore.getOnboardingRatings(user.id);
            setTestData(ratings);
            break;
            
          case 'watchlist':
            const watchlistItems = await firestore.getWatchlist(user.id);
            setTestData(watchlistItems);
            break;
            
          case 'friends':
            const friendsList = await firestore.getFriends(user.id);
            setTestData(friendsList);
            break;
            
          case 'recommendations':
            const sessionsList = await firestore.getSharedRecommendations(user.id);
            setTestData(sessionsList);
            break;
            
          default:
            setTestData(null);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [activeTab, user, firestore]);

  // Combined loading state
  const combinedLoading = 
    isLoadingPreferences || 
    isLoadingRatings || 
    isLoadingWatchlist || 
    isLoadingFriends || 
    isLoadingSessions ||
    isLoading;

  if (!user) {
    return (
      <Card className="w-full max-w-4xl mx-auto my-8">
        <CardHeader>
          <CardTitle>Firestore Integration Demo</CardTitle>
          <CardDescription>You need to be logged in to test the Firestore integration</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Firestore Integration Demo</CardTitle>
        <CardDescription>
          Test the unified Firestore schema integration with various data types
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-8">
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preferences">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Test User Preferences</h3>
              <p>Save test preferences and onboarding status to Firestore</p>
              <Button onClick={testUserPreferences} disabled={combinedLoading}>
                Save Test Preferences
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="ratings">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Test Onboarding Ratings</h3>
              <p>Save a test film rating to the onboarding subcollection</p>
              <Button onClick={testOnboardingRatings} disabled={combinedLoading}>
                Rate Test Film
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="watchlist">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Test Watchlist</h3>
              <p>Add a test film to your watchlist</p>
              <Button onClick={testWatchlistOperations} disabled={combinedLoading}>
                Add To Watchlist
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="friends">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Test Friends</h3>
              <p>Add a test friend connection</p>
              <Button onClick={testFriendOperations} disabled={combinedLoading}>
                Add Test Friend
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="recommendations">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Test Shared Recommendations</h3>
              <p>Create a test shared recommendation session</p>
              <Button onClick={testSharedRecommendations} disabled={combinedLoading}>
                Create Test Session
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator className="my-6" />
        
        {combinedLoading && (
          <div className="flex justify-center my-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md my-4">
            <h4 className="font-semibold">Error:</h4>
            <p>{error}</p>
          </div>
        )}
        
        {testData && !combinedLoading && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Data from Firestore:</h3>
            <div className="bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
              <pre className="text-sm">
                {JSON.stringify(testData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          User ID: {user.id} | Username: {user.username}
        </p>
      </CardFooter>
    </Card>
  );
}