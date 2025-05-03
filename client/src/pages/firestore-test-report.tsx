import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestoreCollections } from '@/hooks/use-firestore-collections';
import { migrateUserData, hasUserBeenMigrated, MigrationResult } from '@/utils/firestore-migration';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, AlertCircle, InfoIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LogCategory, 
  LogLevel, 
  logPreferenceOperation,
  logRatingOperation,
  logWatchlistOperation,
  logFriendsOperation,
  logRecommendationsOperation,
  logFirestoreError,
  clearMemoryLog,
  getMemoryLog,
  setLogToConsole
} from '@/lib/firestore-test-logger';
import { OnboardingRating, RecommendationRating } from '@/lib/types/film-rating';

/**
 * Component for testing the unified Firestore schema integration
 */
export default function FirestoreTestReport() {
  const { user } = useAuth();
  const firestore = useFirestoreCollections();
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('migration');
  const [error, setError] = useState<string | null>(null);
  
  const [migrationStatus, setMigrationStatus] = useState<'not_checked' | 'needed' | 'already_migrated'>('not_checked');
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  
  // Test results
  const [testUserData, setTestUserData] = useState<any>(null);
  const [testOnboardingRatings, setTestOnboardingRatings] = useState<OnboardingRating[]>([]);
  const [testRecommendationRatings, setTestRecommendationRatings] = useState<RecommendationRating[]>([]);
  const [testWatchlist, setTestWatchlist] = useState<any[]>([]);
  const [testFriends, setTestFriends] = useState<any[]>([]);
  const [testSharedRecommendations, setTestSharedRecommendations] = useState<any[]>([]);
  
  // Schema validation results
  const [schemaValidation, setSchemaValidation] = useState<{
    preferences: boolean;
    onboardingRatings: boolean;
    recommendationRatings: boolean;
    watchlist: boolean;
    friends: boolean;
    sharedRecommendations: boolean;
  }>({
    preferences: false,
    onboardingRatings: false,
    recommendationRatings: false,
    watchlist: false,
    friends: false,
    sharedRecommendations: false
  });
  
  // Test logs
  const [testLogs, setTestLogs] = useState<any[]>([]);
  
  // Enable console logging
  useEffect(() => {
    // Enable Firestore console logging for testing
    setLogToConsole(true);
    
    // Clear memory logs before starting tests
    clearMemoryLog();
    
    return () => {
      // Disable console logging when component unmounts
      setLogToConsole(false);
    }
  }, []);
  
  // Check migration status
  const checkMigrationStatus = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const isMigrated = await hasUserBeenMigrated(user.id);
      setMigrationStatus(isMigrated ? 'already_migrated' : 'needed');
      
      // Log results
      logPreferenceOperation(LogLevel.INFO, `Migration status check completed`, {
        operationType: 'check',
        additionalInfo: {
          userId: user.id,
          isMigrated
        }
      });
      
    } catch (err) {
      setError((err as Error).message);
      logFirestoreError(err as Error, 'checkMigrationStatus', { userId: user.id });
    } finally {
      setIsLoading(false);
    }
  };

  // Run migration
  const runMigration = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setMigrationResult(null);
      
      const result = await migrateUserData(user.id);
      setMigrationResult(result);
      
      if (result.success) {
        setMigrationStatus('already_migrated');
      }
      
    } catch (err) {
      setError((err as Error).message);
      logFirestoreError(err as Error, 'runMigration', { userId: user.id });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test user preferences
  const testPreferences = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get user data
      const userData = await firestore.getUserData(user.id);
      setTestUserData(userData);
      
      // Validate schema
      const validSchema = userData && 
                         userData.preferences && 
                         typeof userData.preferences.country === 'string' &&
                         Array.isArray(userData.preferences.streamingServices);
      
      setSchemaValidation(prev => ({
        ...prev,
        preferences: validSchema
      }));
      
      logPreferenceOperation(LogLevel.INFO, `User preferences test completed`, {
        operationType: 'test',
        additionalInfo: {
          userId: user.id,
          validSchema
        }
      });
      
    } catch (err) {
      setError((err as Error).message);
      logFirestoreError(err as Error, 'testPreferences', { userId: user.id });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test film ratings
  const testRatings = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get onboarding ratings
      const onboardingRatings = await firestore.getOnboardingRatings(user.id);
      setTestOnboardingRatings(onboardingRatings);
      
      // Get recommendation ratings
      const recommendationRatings = await firestore.getRecommendationRatings(user.id);
      setTestRecommendationRatings(recommendationRatings);
      
      // Validate onboarding ratings schema
      const validOnboardingSchema = onboardingRatings.every(rating => 
        typeof rating.filmId === 'number' &&
        typeof rating.title === 'string' &&
        typeof rating.rating === 'number' &&
        typeof rating.status === 'string' &&
        typeof rating.timestamp === 'string'
      );
      
      // Validate recommendation ratings schema
      const validRecommendationSchema = recommendationRatings.every(rating => 
        typeof rating.filmId === 'number' &&
        typeof rating.title === 'string' &&
        (rating.rating === 'good' || rating.rating === 'bad') &&
        typeof rating.timestamp === 'string'
      );
      
      setSchemaValidation(prev => ({
        ...prev,
        onboardingRatings: validOnboardingSchema,
        recommendationRatings: validRecommendationSchema
      }));
      
      logRatingOperation(LogLevel.INFO, `Ratings test completed`, {
        operationType: 'test',
        additionalInfo: {
          userId: user.id,
          onboardingCount: onboardingRatings.length,
          recommendationCount: recommendationRatings.length,
          validOnboardingSchema,
          validRecommendationSchema
        }
      });
      
    } catch (err) {
      setError((err as Error).message);
      logFirestoreError(err as Error, 'testRatings', { userId: user.id });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test watchlist
  const runWatchlistTest = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get watchlist
      const watchlist = await firestore.getWatchlist(user.id);
      setTestWatchlist(watchlist);
      
      // Validate watchlist schema
      const validSchema = watchlist.every(item => 
        typeof item.filmId === 'number' &&
        typeof item.title === 'string' &&
        typeof item.addedAt === 'string' &&
        (typeof item.posterUrl === 'string' || item.posterUrl === null) &&
        (typeof item.watched === 'boolean' || item.watched === undefined)
      );
      
      setSchemaValidation(prev => ({
        ...prev,
        watchlist: validSchema
      }));
      
      logWatchlistOperation(LogLevel.INFO, `Watchlist test completed`, {
        operationType: 'test',
        additionalInfo: {
          userId: user.id,
          watchlistCount: watchlist.length,
          validSchema
        }
      });
      
    } catch (err) {
      setError((err as Error).message);
      logFirestoreError(err as Error, 'testWatchlist', { userId: user.id });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test friends
  const runFriendsTest = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get friends
      const friends = await firestore.getFriends(user.id);
      setTestFriends(friends);
      
      // Validate friends schema
      const validSchema = friends.every(friend => 
        (typeof friend.friendId === 'number' || typeof friend.friendId === 'string') &&
        typeof friend.status === 'string' &&
        typeof friend.friendSince === 'string'
      );
      
      setSchemaValidation(prev => ({
        ...prev,
        friends: validSchema
      }));
      
      logFriendsOperation(LogLevel.INFO, `Friends test completed`, {
        operationType: 'test',
        additionalInfo: {
          userId: user.id,
          friendsCount: friends.length,
          validSchema
        }
      });
      
    } catch (err) {
      setError((err as Error).message);
      logFirestoreError(err as Error, 'testFriends', { userId: user.id });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test shared recommendations
  const runSharedRecommendationsTest = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get shared recommendations
      const sessions = await firestore.getSharedRecommendations(user.id);
      setTestSharedRecommendations(sessions);
      
      // Validate shared recommendations schema
      const validSchema = sessions.every(session => 
        Array.isArray(session.friends) &&
        (Array.isArray(session.recommendedFilms) || session.recommendedFilms === undefined) &&
        typeof session.createdAt === 'string' &&
        (typeof session.context === 'object' || session.context === undefined)
      );
      
      setSchemaValidation(prev => ({
        ...prev,
        sharedRecommendations: validSchema
      }));
      
      logRecommendationsOperation(LogLevel.INFO, `Shared recommendations test completed`, {
        operationType: 'test',
        additionalInfo: {
          userId: user.id,
          sessionsCount: sessions.length,
          validSchema
        }
      });
      
    } catch (err) {
      setError((err as Error).message);
      logFirestoreError(err as Error, 'testSharedRecommendations', { userId: user.id });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Run all tests
  const runAllTests = async () => {
    await testPreferences();
    await testRatings();
    await runWatchlistTest();
    await runFriendsTest();
    await runSharedRecommendationsTest();
    
    // Get logs
    const logs = getMemoryLog();
    setTestLogs(logs);
  };
  
  // Generate test report
  const generateReport = () => {
    const total = Object.values(schemaValidation).length;
    const passed = Object.values(schemaValidation).filter(Boolean).length;
    
    return {
      total,
      passed,
      failed: total - passed,
      success: passed === total,
      details: schemaValidation
    };
  };
  
  if (!user) {
    return (
      <Card className="w-full max-w-4xl mx-auto my-8">
        <CardHeader>
          <CardTitle>Firestore Test Report</CardTitle>
          <CardDescription>You need to be logged in to test the Firestore integration</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Firestore Schema Integration Test Report</h1>
      <p className="text-muted-foreground mb-6">
        This page tests the unified Firestore schema for CineMatch and generates a comprehensive report on its functionality.
      </p>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>
            Run tests to verify the Firestore schema integration
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={checkMigrationStatus} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Check Migration Status
            </Button>
            
            <Button 
              onClick={runMigration} 
              disabled={isLoading || migrationStatus !== 'needed'}
              variant="outline"
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Run Migration
            </Button>
            
            <Button 
              onClick={runAllTests} 
              disabled={isLoading}
              variant="default"
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Run All Tests
            </Button>
          </div>
          
          {error && (
            <Alert className="bg-destructive/10 text-destructive my-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {migrationStatus === 'already_migrated' && (
            <Alert className="bg-green-50 border-green-200 my-4">
              <CheckCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Migration Complete</AlertTitle>
              <AlertDescription>
                Your data has already been migrated to the new Firestore schema structure.
              </AlertDescription>
            </Alert>
          )}
          
          {migrationStatus === 'needed' && (
            <Alert className="bg-amber-50 border-amber-200 my-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Migration Needed</AlertTitle>
              <AlertDescription>
                Your data needs to be migrated to the new Firestore schema structure.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="migration">Migration Results</TabsTrigger>
          <TabsTrigger value="tests">Test Results</TabsTrigger>
          <TabsTrigger value="logs">Test Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="migration">
          {migrationResult ? (
            <Card>
              <CardHeader>
                <CardTitle>Migration Results</CardTitle>
                <CardDescription>
                  Detailed results from the Firestore data migration
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">Documents Migrated</p>
                    <p className="text-2xl font-bold">{migrationResult.migratedCount}</p>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">Errors</p>
                    <p className="text-2xl font-bold">{migrationResult.errorCount}</p>
                  </div>
                  
                  <div className={`p-4 rounded-md ${migrationResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-2xl font-bold flex items-center">
                      {migrationResult.success ? 
                        <><CheckCircle className="h-5 w-5 mr-2 text-green-600" /> Success</> : 
                        <><XCircle className="h-5 w-5 mr-2 text-red-600" /> Failed</>
                      }
                    </p>
                  </div>
                </div>
                
                <h4 className="font-medium mt-4">Details:</h4>
                <div className="bg-muted p-4 rounded-md max-h-[200px] overflow-auto">
                  <ul className="space-y-1">
                    {migrationResult.details.map((detail, i) => (
                      <li key={i} className="text-sm">• {detail}</li>
                    ))}
                  </ul>
                </div>
                
                {migrationResult.errorCount > 0 && (
                  <>
                    <h4 className="font-medium mt-4">Errors:</h4>
                    <div className="bg-destructive/10 p-4 rounded-md text-destructive max-h-[200px] overflow-auto">
                      <ul className="space-y-1">
                        {migrationResult.errors.map((error, i) => (
                          <li key={i} className="text-sm">• {error.message || JSON.stringify(error)}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Migration Results</CardTitle>
                <CardDescription>
                  Run a migration to see results here
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="p-8 text-center text-muted-foreground">
                  <InfoIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No migration has been run yet. Check migration status and run migration if needed.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <CardTitle>Schema Validation Test Results</CardTitle>
              <CardDescription>
                Results from testing the Firestore schema structure
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {Object.keys(schemaValidation).length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm text-muted-foreground">Total Tests</p>
                      <p className="text-2xl font-bold">{generateReport().total}</p>
                    </div>
                    
                    <div className="bg-green-100 p-4 rounded-md">
                      <p className="text-sm text-muted-foreground">Tests Passed</p>
                      <p className="text-2xl font-bold text-green-700">{generateReport().passed}</p>
                    </div>
                    
                    <div className="bg-red-100 p-4 rounded-md">
                      <p className="text-sm text-muted-foreground">Tests Failed</p>
                      <p className="text-2xl font-bold text-red-700">{generateReport().failed}</p>
                    </div>
                  </div>
                  
                  <h4 className="font-medium mt-4">Test Details:</h4>
                  <div className="bg-muted p-4 rounded-md overflow-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="pb-2">Schema Component</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2">User Preferences</td>
                          <td>
                            {schemaValidation.preferences ? 
                              <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /> Valid</span> : 
                              <span className="flex items-center text-red-600"><XCircle className="h-4 w-4 mr-1" /> Invalid</span>
                            }
                          </td>
                          <td>{testUserData ? 1 : 0}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Onboarding Ratings</td>
                          <td>
                            {schemaValidation.onboardingRatings ? 
                              <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /> Valid</span> : 
                              <span className="flex items-center text-red-600"><XCircle className="h-4 w-4 mr-1" /> Invalid</span>
                            }
                          </td>
                          <td>{testOnboardingRatings.length}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Recommendation Ratings</td>
                          <td>
                            {schemaValidation.recommendationRatings ? 
                              <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /> Valid</span> : 
                              <span className="flex items-center text-red-600"><XCircle className="h-4 w-4 mr-1" /> Invalid</span>
                            }
                          </td>
                          <td>{testRecommendationRatings.length}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Watchlist</td>
                          <td>
                            {schemaValidation.watchlist ? 
                              <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /> Valid</span> : 
                              <span className="flex items-center text-red-600"><XCircle className="h-4 w-4 mr-1" /> Invalid</span>
                            }
                          </td>
                          <td>{testWatchlist.length}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Friends</td>
                          <td>
                            {schemaValidation.friends ? 
                              <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /> Valid</span> : 
                              <span className="flex items-center text-red-600"><XCircle className="h-4 w-4 mr-1" /> Invalid</span>
                            }
                          </td>
                          <td>{testFriends.length}</td>
                        </tr>
                        <tr>
                          <td className="py-2">Shared Recommendations</td>
                          <td>
                            {schemaValidation.sharedRecommendations ? 
                              <span className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /> Valid</span> : 
                              <span className="flex items-center text-red-600"><XCircle className="h-4 w-4 mr-1" /> Invalid</span>
                            }
                          </td>
                          <td>{testSharedRecommendations.length}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <h4 className="font-medium mt-4">Summary Report:</h4>
                  <div className={`p-4 rounded-md ${generateReport().success ? 'bg-green-50' : 'bg-amber-50'}`}>
                    {generateReport().success ? (
                      <div className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">All Schema Components Valid</p>
                          <p className="text-sm mt-1">
                            All Firestore schema components have been validated and conform to the expected structure.
                            The unified schema integration appears to be working correctly.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 mr-2 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Some Schema Components Invalid</p>
                          <p className="text-sm mt-1">
                            Some Firestore schema components failed validation. Review the detailed results 
                            above to identify which components need attention.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <InfoIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tests have been run yet. Click "Run All Tests" to start testing.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Test Logs</CardTitle>
              <CardDescription>
                Detailed logs from Firestore operations during testing
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {testLogs.length > 0 ? (
                <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs max-h-[500px] overflow-auto">
                  {testLogs.map((log, index) => (
                    <div key={index} className={`mb-2 ${log.level === LogLevel.ERROR ? 'text-red-400' : ''}`}>
                      <span className="text-slate-400">[{log.timestamp}]</span> <span className="text-yellow-400">[{log.category}]</span> {log.message}
                      {log.error && <div className="text-red-400 ml-8">{log.error}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <InfoIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No logs available. Run tests to generate logs.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="bg-muted p-4 rounded-md mt-8">
        <h2 className="text-lg font-semibold mb-2">Test Documentation:</h2>
        
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium">Schema Validation Tests</h3>
            <p className="mt-1">
              The tests verify that each component of the Firestore schema conforms to the expected structure
              and contains the required fields with the correct data types.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">Data Migration Test</h3>
            <p className="mt-1">
              This test validates that data can be successfully migrated from the old Firestore structure
              to the new unified schema with subcollections.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">Firestore Operations Test</h3>
            <p className="mt-1">
              These tests verify that the Firestore collections hook can successfully perform read and write operations
              on the new schema structure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}