import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestoreCollections } from '@/hooks/use-firestore-collections';
import { useFilmRatings } from '@/hooks/use-film-ratings';
import { useWatchlist } from '@/hooks/use-watchlist';
import { useFriends } from '@/hooks/use-friends';
import { useSharedRecommendations } from '@/hooks/use-shared-recommendations';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { LogCategory } from '@/lib/firestore-test-logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * A test page to verify the Firestore schema migration
 */
export default function FirestoreTestPage() {
  const { user } = useAuth();
  const firestore = useFirestoreCollections();
  const [activeTab, setActiveTab] = useState('preferences');
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; data?: any }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'complete'>('idle');

  // Access all the hooks to test
  const { 
    loadPreferencesFromFirestore,
    savePreferences,
    updateStreamingServices,
    updateCountry,
    preferences
  } = useUserPreferences();
  
  const {
    loadRatingsFromFirestore,
    ratings
  } = useFilmRatings(true);
  
  const {
    loadWatchlistFromFirestore,
    watchlist
  } = useWatchlist();
  
  const {
    friends,
    pendingFriends,
    allFriends,
    refetchFriends
  } = useFriends();

  // Run all the integration tests
  const runAllTests = async () => {
    setIsLoading(true);
    setTestStatus('running');
    setTestResults({});
    
    try {
      // Test 1: User Preferences
      await testUserPreferences();
      
      // Test 2: Onboarding Ratings
      await testOnboardingRatings();
      
      // Test 3: Watchlist
      await testWatchlist();
      
      // Test 4: Friends
      await testFriends();
      
      // Test 5: Shared Recommendations
      await testSharedRecommendations();
      
      setTestStatus('complete');
    } catch (error) {
      console.error("Error running tests:", error);
      setTestResults(prev => ({
        ...prev,
        general: { 
          success: false, 
          message: `Testing error: ${(error as Error).message}` 
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test user preferences
  const testUserPreferences = async () => {
    try {
      // Load preferences from Firestore using the hook (should use new path)
      const firestorePrefs = await loadPreferencesFromFirestore();
      
      // Verify user preferences in the new schema location directly
      if (user) {
        // Check the new path via getUserPreferences method
        const newPathPrefs = await firestore.getUserPreferences(user.id);
        
        // Also check the legacy path for comparison
        const userData = await firestore.getUserData(user.id);
        const legacyPathPrefs = userData?.preferences;
        
        if (newPathPrefs) {
          setTestResults(prev => ({
            ...prev,
            preferences: { 
              success: true, 
              message: "Successfully loaded user preferences from new schema location (/users/{userId}/preferences/settings)", 
              data: {
                newPath: newPathPrefs,
                legacyPath: legacyPathPrefs || 'Not found in legacy path',
                hookResult: firestorePrefs
              }
            }
          }));
        } else if (legacyPathPrefs) {
          setTestResults(prev => ({
            ...prev,
            preferences: { 
              success: false, 
              message: "User preferences found in legacy path but not in new schema location", 
              data: {
                legacyPath: legacyPathPrefs,
                hookResult: firestorePrefs
              }
            }
          }));
        } else {
          setTestResults(prev => ({
            ...prev,
            preferences: { 
              success: false, 
              message: "User preferences not found in either legacy or new Firestore path"
            }
          }));
        }
      }
    } catch (error) {
      console.error("Error testing preferences:", error);
      setTestResults(prev => ({
        ...prev,
        preferences: { 
          success: false, 
          message: `Error testing preferences: ${(error as Error).message}`
        }
      }));
    }
  };
  
  // Test onboarding ratings
  const testOnboardingRatings = async () => {
    try {
      // Load ratings from Firestore through the hook (should use new path)
      const firestoreRatings = await loadRatingsFromFirestore();
      
      if (user) {
        // Query the new collection path directly using getOnboardingRatings 
        // which should now fetch from /users/{userId}/ratings/onboarding
        const newPathRatings = await firestore.getOnboardingRatings(user.id);
        
        // Also check the legacy path for comparison
        const legacyPathRatings = await firestore.queryCollection(
          `users/${user.id}/onboardingRatings`,
          [],
          [['timestamp', 'desc']],
          0,
          { logCategory: LogCategory.RATING }
        );
        
        // Check direct path using raw queryCollection to verify correct schema
        const directPathRatings = await firestore.queryCollection(
          `users/${user.id}/ratings/onboarding`,
          [],
          [['timestamp', 'desc']],
          0,
          { logCategory: LogCategory.RATING }
        );
        
        if (newPathRatings && newPathRatings.length > 0) {
          setTestResults(prev => ({
            ...prev,
            ratings: { 
              success: true, 
              message: `Found ${newPathRatings.length} onboarding ratings in the new schema location (/users/{userId}/ratings/onboarding)`, 
              data: {
                newPathRatings: newPathRatings.slice(0, 2), // First 2 for brevity
                legacyPathRatings: legacyPathRatings.length > 0 ? 
                  legacyPathRatings.slice(0, 2) : 
                  'No ratings in legacy path',
                directPathRatings: directPathRatings.length > 0 ? 
                  directPathRatings.slice(0, 2) : 
                  'No ratings in direct path',
                hookResults: firestoreRatings ? firestoreRatings.slice(0, 2) : 'No hook results'
              }
            }
          }));
        } else if (legacyPathRatings && legacyPathRatings.length > 0) {
          setTestResults(prev => ({
            ...prev,
            ratings: { 
              success: false, 
              message: `Found ${legacyPathRatings.length} ratings in legacy path but none in new schema location`, 
              data: {
                legacyPathRatings: legacyPathRatings.slice(0, 2),
                directPathRatings: directPathRatings.length > 0 ? 
                  directPathRatings.slice(0, 2) : 
                  'No ratings in direct path',
                hookResults: firestoreRatings ? firestoreRatings.slice(0, 2) : 'No hook results'
              }
            }
          }));
        } else {
          setTestResults(prev => ({
            ...prev,
            ratings: { 
              success: false, 
              message: "No onboarding ratings found in either legacy or new Firestore path",
              data: {
                directPathRatings: directPathRatings.length > 0 ? 
                  directPathRatings.slice(0, 2) : 
                  'No ratings in direct path',
                hookResults: firestoreRatings ? firestoreRatings.slice(0, 2) : 'No hook results'
              }
            }
          }));
        }
      }
    } catch (error) {
      console.error("Error testing ratings:", error);
      setTestResults(prev => ({
        ...prev,
        ratings: { 
          success: false, 
          message: `Error testing ratings: ${(error as Error).message}`
        }
      }));
    }
  };
  
  // Test watchlist
  const testWatchlist = async () => {
    try {
      // Load watchlist from Firestore
      const firestoreWatchlist = await loadWatchlistFromFirestore();
      
      if (user) {
        // Query the new collection path directly
        const watchlistItems = await firestore.getWatchlist(user.id);
        
        if (watchlistItems && watchlistItems.length > 0) {
          setTestResults(prev => ({
            ...prev,
            watchlist: { 
              success: true, 
              message: `Found ${watchlistItems.length} watchlist items in the new schema location`, 
              data: watchlistItems.slice(0, 3) // Just show first 3 for brevity
            }
          }));
        } else {
          setTestResults(prev => ({
            ...prev,
            watchlist: { 
              success: false, 
              message: "No watchlist items found in Firestore"
            }
          }));
        }
      }
    } catch (error) {
      console.error("Error testing watchlist:", error);
      setTestResults(prev => ({
        ...prev,
        watchlist: { 
          success: false, 
          message: `Error testing watchlist: ${(error as Error).message}`
        }
      }));
    }
  };
  
  // Test friends
  const testFriends = async () => {
    try {
      // Load friends from Firestore
      if (user) {
        // Try both hooks API and direct Firestore query
        const friendsList = await refetchFriends();
        const firestoreFriends = await firestore.queryCollection(
          `users/${user.id}/friends`,
          [],
          [],
          0,
          { logCategory: LogCategory.FRIENDS }
        );
        
        if (firestoreFriends && firestoreFriends.length > 0) {
          setTestResults(prev => ({
            ...prev,
            friends: { 
              success: true, 
              message: `Found ${firestoreFriends.length} friends in the new schema location`, 
              data: firestoreFriends.slice(0, 3) // Just show first 3 for brevity
            }
          }));
        } else {
          setTestResults(prev => ({
            ...prev,
            friends: { 
              success: false, 
              message: "No friends found in Firestore subcollection"
            }
          }));
        }
      }
    } catch (error) {
      console.error("Error testing friends:", error);
      setTestResults(prev => ({
        ...prev,
        friends: { 
          success: false, 
          message: `Error testing friends: ${(error as Error).message}`
        }
      }));
    }
  };
  
  // Test shared recommendations
  const testSharedRecommendations = async () => {
    try {
      if (user) {
        // Query both old and new shared recommendations
        const legacySharedRecs = await firestore.queryCollection(
          'shared_recommendations',
          [],
          [],
          0,
          { logCategory: LogCategory.RECOMMENDATIONS }
        );
        
        const newSharedRecs = await firestore.queryCollection(
          `users/${user.id}/sharedRecommendations`,
          [],
          [],
          0,
          { logCategory: LogCategory.RECOMMENDATIONS }
        );
        
        setTestResults(prev => ({
          ...prev,
          sharedRecs: { 
            success: true, 
            message: `Found ${legacySharedRecs.length} legacy and ${newSharedRecs.length} new shared recommendations`, 
            data: {
              legacy: legacySharedRecs.slice(0, 2),
              new: newSharedRecs.slice(0, 2)
            }
          }
        }));
      }
    } catch (error) {
      console.error("Error testing shared recommendations:", error);
      setTestResults(prev => ({
        ...prev,
        sharedRecs: { 
          success: false, 
          message: `Error testing shared recommendations: ${(error as Error).message}`
        }
      }));
    }
  };

  // Get overall test summary
  const getTestSummary = () => {
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(result => result.success).length;
    
    return {
      total: totalTests,
      passed: passedTests,
      allPassed: totalTests > 0 && passedTests === totalTests
    };
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Firestore Schema Migration Verification</h1>
      
      {!user ? (
        <Alert className="mb-6">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please log in to run the Firestore schema tests.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-6">
            <Button 
              onClick={runAllTests} 
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>
            
            {testStatus === 'complete' && (
              <Badge variant={getTestSummary().allPassed ? "default" : "destructive"} className="px-3 py-1 text-md">
                {getTestSummary().passed}/{getTestSummary().total} Tests Passed
              </Badge>
            )}
          </div>
          
          <Tabs defaultValue="preferences" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="preferences">User Preferences</TabsTrigger>
              <TabsTrigger value="ratings">Onboarding Ratings</TabsTrigger>
              <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="sharedRecs">Shared Recommendations</TabsTrigger>
            </TabsList>
            
            {['preferences', 'ratings', 'watchlist', 'friends', 'sharedRecs'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {tab.charAt(0).toUpperCase() + tab.slice(1)} Test
                      {testResults[tab] && (
                        testResults[tab].success ? 
                          <CheckCircle className="ml-2 h-5 w-5 text-green-500" /> : 
                          <AlertTriangle className="ml-2 h-5 w-5 text-amber-500" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      Verifying {tab} data in the new Firestore schema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {testResults[tab] ? (
                      <div>
                        <Alert variant={testResults[tab].success ? "default" : "destructive"}>
                          <AlertTitle>{testResults[tab].success ? "Success" : "Issue Detected"}</AlertTitle>
                          <AlertDescription>{testResults[tab].message}</AlertDescription>
                        </Alert>
                        
                        {testResults[tab].data && (
                          <>
                            <Separator className="my-4" />
                            <ScrollArea className="h-[200px] rounded-md border p-4 mt-4">
                              <pre className="text-xs">
                                {JSON.stringify(testResults[tab].data, null, 2)}
                              </pre>
                            </ScrollArea>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {isLoading ? "Running test..." : "Run the tests to see results"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}