import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { auth, db } from '@/lib/firebase';
import { 
  setDoc, 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  limit, 
  getFirestore, 
  updateDoc
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { useFirebaseAuthStatus } from '@/components/FirebaseAuthProvider';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Download, Database } from 'lucide-react';

// Extended user type to include Firebase token
interface ExtendedUser {
  id: number;
  username: string | null;
  name: string | null;
  email: string;
  firebaseToken?: string;
  [key: string]: any;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: string;
  path?: string;
  data?: any;
  error?: any;
}

interface TestStatus {
  preferences: TestResult | null;
  onboardingRatings: TestResult | null;
  recommendationRatings: TestResult | null;
  watchlist: TestResult | null;
}

export default function FirestoreTestDebugPage() {
  const { user } = useAuth() as { user: ExtendedUser | null };
  const { isFirebaseAuthenticated, isInitializing, error } = useFirebaseAuthStatus();
  
  // Authentication test state
  const [testResult, setTestResult] = useState<string>('No test run yet');
  const [testLog, setTestLog] = useState<string[]>([]);
  
  // Operation test states
  const [writeStatus, setWriteStatus] = useState<TestStatus>({
    preferences: null,
    onboardingRatings: null,
    recommendationRatings: null,
    watchlist: null
  });
  
  const [readStatus, setReadStatus] = useState<TestStatus>({
    preferences: null,
    onboardingRatings: null,
    recommendationRatings: null,
    watchlist: null
  });
  
  const [legacyReadResult, setLegacyReadResult] = useState<string>('');
  
  // Firebase project info
  const [projectInfo, setProjectInfo] = useState<{id: string, name: string} | null>(null);
  
  // Active test tab
  const [activeTab, setActiveTab] = useState('authenticate');
  
  // Is operation in progress flag
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);
  
  // Clear the logs when component mounts
  useEffect(() => {
    setTestLog(['Initializing Firestore test page...']);
    
    // Try to get Firebase project info
    try {
      const app = getApp();
      if (app) {
        setProjectInfo({
          id: app.options.projectId || 'unknown',
          name: app.name || 'default'
        });
        log(`Connected to Firebase project: ${app.options.projectId || 'unknown'}`);
      }
    } catch (error) {
      log(`Could not determine Firebase project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  // Log messages with timestamps
  const log = (message: string) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setTestLog(prev => [...prev, `${timestamp} - ${message}`]);
  };

  const runFirestoreTest = async () => {
    setTestResult('Running test...');
    setIsOperationInProgress(true);
    log('---------------------------------------------');
    log('Starting Firestore Authentication Test');
    log('---------------------------------------------');
    
    try {
      // Check Firebase project info
      if (projectInfo) {
        log(`🔍 Testing against Firebase project: ${projectInfo.id}`);
      } else {
        log('⚠️ WARNING: Could not determine Firebase project ID');
      }
      
      // Check auth status
      const currentUser = auth.currentUser;
      log(`Firebase auth status: ${currentUser ? '✓ AUTHENTICATED' : '✗ NOT AUTHENTICATED'}`);
      
      if (!currentUser) {
        log('⛔ ERROR: Not authenticated with Firebase, tests will likely fail');
        log(`Express auth status: ${user ? '✓ AUTHENTICATED' : '✗ NOT AUTHENTICATED'}`);
        
        if (user) {
          log(`Express user ID: ${user.id}`);
          log(`Firebase token present: ${user.firebaseToken ? '✓ YES' : '✗ NO'}`);
          
          // Even if Firebase auth is not ready, we can check if the token is valid
          try {
            const tokenString = user.firebaseToken || '';
            log(`Firebase token: ${tokenString.substring(0, 20)}...${tokenString.substring(tokenString.length - 20)}`);
            
            // Decode the base64 token
            let decodedToken = '';
            try {
              decodedToken = Buffer.from(tokenString, 'base64').toString();
            } catch (e) {
              decodedToken = atob(tokenString);
            }
            
            const tokenData = JSON.parse(decodedToken);
            log(`Token decoded: ${JSON.stringify(tokenData)}`);
            log(`Token expiration: ${new Date(tokenData.exp).toLocaleString()}`);
            
            // Check if the token is valid
            const now = Date.now();
            if (tokenData.exp < now) {
              log('⚠️ WARNING: Token is expired!');
            } else {
              log('✓ Token is valid and not expired');
              
              // Check if the token UID matches the user ID
              if (tokenData.uid && tokenData.uid === user.id.toString()) {
                log('✓ Token UID matches Express user ID');
              } else {
                log(`⚠️ WARNING: Token UID (${tokenData.uid}) does not match Express user ID (${user.id})`);
              }
            }
            
            // Check localStorage for custom auth ID
            const localStorageUid = localStorage.getItem('customAuthUserId');
            if (localStorageUid) {
              log(`localStorage customAuthUserId: ${localStorageUid}`);
              if (localStorageUid !== user.id.toString()) {
                log('⚠️ WARNING: localStorage UID does not match Express user ID');
              }
            } else {
              log('⚠️ WARNING: No customAuthUserId found in localStorage');
            }
          } catch (tokenError) {
            log(`⛔ Error decoding token: ${tokenError instanceof Error ? tokenError.message : String(tokenError)}`);
          }
        }
        setTestResult('Failed - Not authenticated with Firebase');
        setIsOperationInProgress(false);
        return;
      }
      
      log(`Firebase User ID: ${currentUser.uid}`);
      log(`Express User ID: ${user?.id}`);
      
      // Verify if the Firebase uid matches our user ID
      if (currentUser.uid === user?.id.toString()) {
        log('✓ Firebase UID matches Express user ID');
      } else {
        log(`⚠️ WARNING: Firebase UID (${currentUser.uid}) does not match Express user ID (${user?.id})`);
      }
      
      // Check Firebase user attributes
      log(`Firebase user provider: ${currentUser.providerId || 'none'}`);
      log(`Firebase user email: ${currentUser.email || 'none'}`);
      log(`Firebase user is anonymous: ${currentUser.isAnonymous ? 'yes' : 'no'}`);
      
      // Verify Firestore connection
      try {
        log('Testing Firestore database connection...');
        // Try to read a known path that should be accessible
        const testReadPath = `users/${currentUser.uid}/test-connection`;
        log(`Testing read access to: ${testReadPath}`);
        
        const connectionRef = doc(db, testReadPath);
        await setDoc(connectionRef, { 
          timestamp: new Date().toISOString(),
          testMessage: 'Connection test'
        });
        log('✓ Successfully wrote to Firestore test path');
        
        const docSnapshot = await getDoc(connectionRef);
        if (docSnapshot.exists()) {
          log('✓ Successfully read from Firestore test path');
          log('✓ Firestore connection verified');
        } else {
          log('⚠️ Write succeeded but document not found on read-back');
        }
      } catch (firestoreError) {
        log(`⛔ Firestore connection error: ${firestoreError instanceof Error ? firestoreError.message : String(firestoreError)}`);
        // Analyze the error for security rules issues
        const errorMsg = String(firestoreError);
        if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
          log('⛔ SECURITY RULES ERROR: User lacks permission to access Firestore');
          log('   This likely indicates an issue with Firestore security rules');
        }
      }
      
      setTestResult('Authentication verified');
      setIsOperationInProgress(false);
    } catch (error) {
      log(`⛔ Error during test: ${error instanceof Error ? error.message : String(error)}`);
      setTestResult(`Failed - Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsOperationInProgress(false);
    }
  };

  /**
   * Tests writing to all Firestore paths used in the application
   */
  const testAllWrites = async () => {
    setIsOperationInProgress(true);
    log('---------------------------------------------');
    log('Starting Firestore Write Tests to All Paths');
    log('---------------------------------------------');
    
    // Reset all results first
    setWriteStatus({
      preferences: null,
      onboardingRatings: null,
      recommendationRatings: null,
      watchlist: null
    });
    
    if (!auth.currentUser) {
      log('⛔ ERROR: Not authenticated with Firebase, write tests will fail');
      setIsOperationInProgress(false);
      return;
    }
    
    const userId = auth.currentUser.uid;
    log(`📝 Running write tests for user ID: ${userId}`);
    
    // Test writing to preferences
    await writeToFirestore(
      'preferences',
      `users/${userId}/preferences/settings`,
      {
        country: 'uk',
        streamingServices: ['netflix', 'amazonprime', 'disneyplus'],
        timestamp: new Date().toISOString(),
        testId: `test-${Date.now()}`
      }
    );
    
    // Test writing to onboarding ratings
    await writeToFirestore(
      'onboardingRatings',
      `users/${userId}/ratings/onboarding`,
      {
        ratings: [
          { filmId: 101, rating: 5, title: 'Test Film 1', timestamp: new Date().toISOString() },
          { filmId: 102, rating: 3, title: 'Test Film 2', timestamp: new Date().toISOString() }
        ],
        completed: true,
        timestamp: new Date().toISOString(),
        testId: `test-${Date.now()}`
      }
    );
    
    // Test writing to recommendation ratings
    await writeToFirestore(
      'recommendationRatings',
      `users/${userId}/ratings/recommendations`,
      {
        ratings: [
          { filmId: 201, rating: 4, title: 'Recommended Film 1', timestamp: new Date().toISOString() },
          { filmId: 202, rating: 2, title: 'Recommended Film 2', timestamp: new Date().toISOString() }
        ],
        mood: 'relaxed',
        timestamp: new Date().toISOString(),
        testId: `test-${Date.now()}`
      }
    );
    
    // Test writing to watchlist (collection)
    await writeToFirestore(
      'watchlist',
      `users/${userId}/watchlist/test-item-${Date.now()}`,
      {
        filmId: 301,
        title: 'Watchlist Test Film',
        posterUrl: 'https://example.com/poster.jpg',
        added: new Date().toISOString(),
        status: 'want-to-watch',
        testId: `test-${Date.now()}`
      }
    );
    
    log('---------------------------------------------');
    log('Write tests completed');
    log('---------------------------------------------');
    setIsOperationInProgress(false);
  };
  
  /**
   * Helper function to write to a specific Firestore path and update the status
   */
  const writeToFirestore = async (
    statusKey: keyof TestStatus,
    path: string,
    data: any
  ) => {
    try {
      log(`📝 Writing to ${path}`);
      log(`📄 Data payload: ${JSON.stringify(data, null, 2)}`);
      
      const segments = path.split('/');
      
      // Check if the last segment is dynamic (test-item-timestamp)
      let docRef;
      if (segments[segments.length - 1].startsWith('test-item-')) {
        // For collection writes (like watchlist items)
        docRef = doc(db, ...segments);
        await setDoc(docRef, data);
      } else {
        // For document writes
        docRef = doc(db, path);
        await setDoc(docRef, data);
      }
      
      log(`✅ Successfully wrote to ${path}`);
      
      // Update the status with success
      setWriteStatus(prev => ({
        ...prev,
        [statusKey]: {
          success: true,
          message: 'Write successful',
          path: path,
          data: data
        }
      }));
      
    } catch (error) {
      // Extract error details
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`❌ Error writing to ${path}: ${errorMsg}`);
      
      // Analyze the error for security rules issues
      let errorDetails = 'Unknown error occurred';
      
      if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
        errorDetails = 'SECURITY RULES ERROR: User lacks permission to write to this path';
        log('⛔ This likely indicates an issue with Firestore security rules');
      } else if (errorMsg.includes('not-found')) {
        errorDetails = 'Path not found. This document or collection may not exist.';
      } else if (errorMsg.includes('unavailable')) {
        errorDetails = 'Firestore service unavailable. Check your internet connection.';
      }
      
      // Update the status with error
      setWriteStatus(prev => ({
        ...prev,
        [statusKey]: {
          success: false,
          message: 'Write failed',
          details: errorDetails,
          path: path,
          data: data,
          error: errorMsg
        }
      }));
    }
  };

  /**
   * Tests reading from all Firestore paths used in the application
   */
  const testAllReads = async () => {
    setIsOperationInProgress(true);
    log('---------------------------------------------');
    log('Starting Firestore Read Tests from All Paths');
    log('---------------------------------------------');
    
    // Reset all results first
    setReadStatus({
      preferences: null,
      onboardingRatings: null,
      recommendationRatings: null,
      watchlist: null
    });
    
    if (!auth.currentUser) {
      log('⛔ ERROR: Not authenticated with Firebase, read tests will fail');
      setIsOperationInProgress(false);
      return;
    }
    
    const userId = auth.currentUser.uid;
    log(`🔍 Running read tests for user ID: ${userId}`);
    
    // Test reading from preferences
    await readFromFirestore(
      'preferences',
      `users/${userId}/preferences/settings`
    );
    
    // Test reading from onboarding ratings
    await readFromFirestore(
      'onboardingRatings',
      `users/${userId}/ratings/onboarding`
    );
    
    // Test reading from recommendation ratings
    await readFromFirestore(
      'recommendationRatings',
      `users/${userId}/ratings/recommendations`
    );
    
    // Test reading from watchlist (collection)
    await readFromWatchlistCollection(userId);
    
    log('---------------------------------------------');
    log('Read tests completed');
    log('---------------------------------------------');
    setIsOperationInProgress(false);
  };
  
  /**
   * Helper function to read from a specific Firestore path and update the status
   */
  const readFromFirestore = async (
    statusKey: keyof TestStatus,
    path: string
  ) => {
    try {
      log(`🔍 Reading from ${path}`);
      
      const docRef = doc(db, path);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        log(`✅ Successfully read from ${path}`);
        log(`📄 Document data: ${JSON.stringify(data, null, 2)}`);
        
        // Update the status with success
        setReadStatus(prev => ({
          ...prev,
          [statusKey]: {
            success: true,
            message: 'Read successful',
            path: path,
            data: data
          }
        }));
      } else {
        log(`⚠️ No document exists at ${path}`);
        
        // Update the status with "not found" message
        setReadStatus(prev => ({
          ...prev,
          [statusKey]: {
            success: false,
            message: 'Document not found',
            path: path
          }
        }));
      }
    } catch (error) {
      // Extract error details
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`❌ Error reading from ${path}: ${errorMsg}`);
      
      // Analyze the error for security rules issues
      let errorDetails = 'Unknown error occurred';
      
      if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
        errorDetails = 'SECURITY RULES ERROR: User lacks permission to read from this path';
        log('⛔ This likely indicates an issue with Firestore security rules');
      } else if (errorMsg.includes('not-found')) {
        errorDetails = 'Path not found. This document or collection may not exist.';
      } else if (errorMsg.includes('unavailable')) {
        errorDetails = 'Firestore service unavailable. Check your internet connection.';
      }
      
      // Update the status with error
      setReadStatus(prev => ({
        ...prev,
        [statusKey]: {
          success: false,
          message: 'Read failed',
          details: errorDetails,
          path: path,
          error: errorMsg
        }
      }));
    }
  };
  
  /**
   * Special function to read from the watchlist collection
   */
  const readFromWatchlistCollection = async (userId: string) => {
    try {
      const collectionPath = `users/${userId}/watchlist`;
      log(`🔍 Reading from collection: ${collectionPath}`);
      
      const collectionRef = collection(db, collectionPath);
      const querySnapshot = await getDocs(query(collectionRef, limit(10)));
      
      if (!querySnapshot.empty) {
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        log(`✅ Successfully read ${items.length} items from watchlist collection`);
        log(`📄 First item: ${JSON.stringify(items[0], null, 2)}`);
        
        // Update the status with success
        setReadStatus(prev => ({
          ...prev,
          watchlist: {
            success: true,
            message: `Read successful - ${items.length} items found`,
            path: collectionPath,
            data: items
          }
        }));
      } else {
        log(`⚠️ No items found in collection: ${collectionPath}`);
        
        // Update the status with "not found" message
        setReadStatus(prev => ({
          ...prev,
          watchlist: {
            success: false,
            message: 'No items found in collection',
            path: collectionPath
          }
        }));
      }
    } catch (error) {
      // Extract error details
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`❌ Error reading from watchlist: ${errorMsg}`);
      
      // Analyze the error for security rules issues
      let errorDetails = 'Unknown error occurred';
      
      if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
        errorDetails = 'SECURITY RULES ERROR: User lacks permission to read from this collection';
        log('⛔ This likely indicates an issue with Firestore security rules');
      } else if (errorMsg.includes('not-found')) {
        errorDetails = 'Collection path not found.';
      }
      
      // Update the status with error
      setReadStatus(prev => ({
        ...prev,
        watchlist: {
          success: false,
          message: 'Read failed',
          details: errorDetails,
          path: `users/${userId}/watchlist`,
          error: errorMsg
        }
      }));
    }
  };

  /**
   * Test legacy Firestore structure
   */
  const testLegacyStructure = async () => {
    setIsOperationInProgress(true);
    log('---------------------------------------------');
    log('Starting Legacy Firestore Structure Tests');
    log('---------------------------------------------');
    
    try {
      if (!auth.currentUser) {
        log('⛔ ERROR: Not authenticated with Firebase, legacy tests will fail');
        setLegacyReadResult('Failed - Not authenticated');
        setIsOperationInProgress(false);
        return;
      }
      
      const userId = auth.currentUser.uid;
      log(`🔍 Testing legacy structure for user ID: ${userId}`);
      
      // Try to read from legacy collections
      log('Checking legacy user_preferences collection');
      try {
        const legacyPrefDoc = await getDoc(doc(db, 'user_preferences', `user-${userId}`));
        
        if (legacyPrefDoc.exists()) {
          log(`✅ Found legacy user_preferences: ${JSON.stringify(legacyPrefDoc.data(), null, 2)}`);
        } else {
          log('⚠️ No legacy user_preferences document found');
        }
      } catch (error) {
        log(`❌ Error reading legacy user_preferences: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Check if we can query the legacy onboarding_ratings collection
      log('Checking legacy onboarding_ratings collection');
      try {
        const legacyRatingsQuery = query(collection(db, 'onboarding_ratings'), limit(5));
        const legacyRatingsSnapshot = await getDocs(legacyRatingsQuery);
        
        if (!legacyRatingsSnapshot.empty) {
          log(`✅ Found ${legacyRatingsSnapshot.size} documents in legacy onboarding_ratings collection`);
          
          // Try to find specific user's ratings
          const userRatings = legacyRatingsSnapshot.docs
            .filter(doc => doc.id.includes(userId) || doc.data().userId === userId);
          
          if (userRatings.length > 0) {
            log(`✅ Found ${userRatings.length} ratings for current user`);
            log(`📄 First rating: ${JSON.stringify(userRatings[0].data(), null, 2)}`);
          } else {
            log('⚠️ No specific ratings found for current user');
          }
        } else {
          log('⚠️ No documents found in legacy onboarding_ratings collection');
        }
      } catch (error) {
        log(`❌ Error reading legacy onboarding_ratings: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Check legacy watchlist collection
      log('Checking legacy watchlist collection');
      try {
        // Try with direct query first
        const legacyWatchlistQuery = query(collection(db, 'watchlist'), limit(5));
        const legacyWatchlistSnapshot = await getDocs(legacyWatchlistQuery);
        
        if (!legacyWatchlistSnapshot.empty) {
          log(`✅ Found ${legacyWatchlistSnapshot.size} documents in legacy watchlist collection`);
          
          // Try to find specific user's watchlist items
          const userItems = legacyWatchlistSnapshot.docs
            .filter(doc => doc.id.includes(userId) || doc.data().userId === userId);
          
          if (userItems.length > 0) {
            log(`✅ Found ${userItems.length} watchlist items for current user`);
            log(`📄 First item: ${JSON.stringify(userItems[0].data(), null, 2)}`);
          } else {
            log('⚠️ No specific watchlist items found for current user');
          }
        } else {
          log('⚠️ No documents found in legacy watchlist collection');
        }
      } catch (error) {
        log(`❌ Error reading legacy watchlist: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      log('---------------------------------------------');
      log('Legacy structure tests completed');
      log('---------------------------------------------');
      setLegacyReadResult('Legacy tests completed');
      setIsOperationInProgress(false);
    } catch (error) {
      log(`⛔ Error during legacy tests: ${error instanceof Error ? error.message : String(error)}`);
      setLegacyReadResult(`Failed - Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsOperationInProgress(false);
    }
  };

  // Helper to render result status badges
  const renderStatusBadge = (status: boolean | null) => {
    if (status === null) return <Badge variant="outline">Not Tested</Badge>;
    return status 
      ? <Badge variant="success" className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Success</Badge>
      : <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>;
  };
  
  // Helper to render detailed test results
  const renderTestResults = (status: TestStatus, type: 'write' | 'read') => {
    return (
      <div className="grid grid-cols-1 gap-4">
        {Object.entries(status).map(([key, result]) => (
          <Card key={key} className={result?.success ? 'border-green-200' : result?.success === false ? 'border-red-200' : ''}>
            <CardHeader className="py-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base capitalize">{key}</CardTitle>
                {renderStatusBadge(result?.success ?? null)}
              </div>
              <CardDescription>
                Path: {result?.path || 'Not tested'}
              </CardDescription>
            </CardHeader>
            {result && (
              <CardContent className="pt-0">
                <div className="text-sm">
                  {result.message}
                  {result.details && (
                    <p className="text-red-600 mt-1">{result.details}</p>
                  )}
                </div>
                
                {result.success && result.data && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Data Preview:</p>
                    <div className="bg-gray-100 p-2 rounded text-xs font-mono overflow-auto max-h-24">
                      {typeof result.data === 'string' 
                        ? result.data
                        : JSON.stringify(result.data, null, 2)}
                    </div>
                  </div>
                )}
                
                {!result.success && result.error && (
                  <div className="mt-2">
                    <p className="text-xs text-red-600 mb-1">Error:</p>
                    <div className="bg-red-50 border border-red-200 p-2 rounded text-xs font-mono overflow-auto max-h-24">
                      {result.error}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Firestore Debug & Test Tool
              </CardTitle>
              <CardDescription className="mt-1.5">
                Diagnose and test Firestore operations and paths
              </CardDescription>
            </div>
            {projectInfo && (
              <Badge variant="outline" className="px-2 py-1 h-auto">
                Project: {projectInfo.id}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <Alert className="mb-4">
            <AlertTitle className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Authentication Status
            </AlertTitle>
            <AlertDescription className="mt-2">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p><strong>Express Auth:</strong> {user ? 'Authenticated ✓' : 'Not Authenticated ✗'}</p>
                  <p><strong>Express User ID:</strong> {user?.id || 'N/A'}</p>
                  <p><strong>Token Present:</strong> {user?.firebaseToken ? 'Yes ✓' : 'No ✗'}</p>
                </div>
                <div>
                  <p><strong>Firebase Auth:</strong> {isFirebaseAuthenticated ? 'Authenticated ✓' : 'Not Authenticated ✗'}</p>
                  <p><strong>Firebase UID:</strong> {auth.currentUser?.uid || 'Not logged in'}</p>
                  <p><strong>Auth Error:</strong> {error ? error.message : 'None'}</p>
                </div>
              </div>
              
              <Button 
                onClick={runFirestoreTest}
                size="sm"
                className="mt-1"
                disabled={isInitializing || isOperationInProgress}
              >
                {isOperationInProgress ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>Verify Authentication</>
                )}
              </Button>
              {testResult !== 'No test run yet' && (
                <p className="mt-2 text-sm font-medium">{testResult}</p>
              )}
            </AlertDescription>
          </Alert>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="authenticate">Authentication</TabsTrigger>
              <TabsTrigger value="write">Write Tests</TabsTrigger>
              <TabsTrigger value="read">Read Tests</TabsTrigger>
              <TabsTrigger value="legacy">Legacy Structure</TabsTrigger>
            </TabsList>
            
            <TabsContent value="authenticate">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Authentication Verification</h3>
                <p className="text-muted-foreground mb-4">
                  Verify that the Firebase authentication is working correctly and check the token validity.
                </p>
                
                <Button
                  onClick={runFirestoreTest}
                  disabled={isInitializing || isOperationInProgress}
                  className="mr-2"
                >
                  {isOperationInProgress ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>Run Authentication Test</>
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="write">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Firestore Write Tests</h3>
                <p className="text-muted-foreground mb-4">
                  Test writing to all critical Firestore paths: preferences, onboarding ratings, recommendation ratings, and watchlist.
                </p>
                
                <Button
                  onClick={testAllWrites}
                  disabled={!isFirebaseAuthenticated || isInitializing || isOperationInProgress}
                  className="mr-2"
                >
                  {isOperationInProgress ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>Run Write Tests</>
                  )}
                </Button>
              </div>
              
              <Separator className="my-4" />
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-4">Write Test Results</h3>
                {renderTestResults(writeStatus, 'write')}
              </div>
            </TabsContent>
            
            <TabsContent value="read">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Firestore Read Tests</h3>
                <p className="text-muted-foreground mb-4">
                  Test reading from all critical Firestore paths: preferences, onboarding ratings, recommendation ratings, and watchlist.
                </p>
                
                <Button
                  onClick={testAllReads}
                  disabled={!isFirebaseAuthenticated || isInitializing || isOperationInProgress}
                  className="mr-2"
                >
                  {isOperationInProgress ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>Run Read Tests</>
                  )}
                </Button>
              </div>
              
              <Separator className="my-4" />
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-4">Read Test Results</h3>
                {renderTestResults(readStatus, 'read')}
              </div>
            </TabsContent>
            
            <TabsContent value="legacy">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Legacy Structure Tests</h3>
                <p className="text-muted-foreground mb-4">
                  Test reading from legacy Firestore structure to check for backwards compatibility issues.
                </p>
                
                <Button
                  onClick={testLegacyStructure}
                  disabled={!isFirebaseAuthenticated || isInitializing || isOperationInProgress}
                  className="mr-2"
                >
                  {isOperationInProgress ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>Test Legacy Structure</>
                  )}
                </Button>
                
                {legacyReadResult !== '' && (
                  <p className="mt-2 text-sm font-medium">{legacyReadResult}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Test Logs</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setTestLog([])}
            className="h-8 px-2 lg:px-3"
          >
            Clear
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-3 rounded-md h-[300px] overflow-y-auto font-mono text-xs">
            {testLog.length === 0 ? (
              <p className="text-muted-foreground p-2">No log entries yet. Run tests to see results here.</p>
            ) : (
              testLog.map((log, index) => (
                <div key={index} className="mb-1 leading-relaxed whitespace-pre-wrap break-all">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}