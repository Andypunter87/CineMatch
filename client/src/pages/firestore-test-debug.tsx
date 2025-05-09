import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, db } from '@/lib/firebase';
import { setDoc, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useFirebaseAuthStatus } from '@/components/FirebaseAuthProvider';
import { useAuth } from '@/hooks/use-auth';

export default function FirestoreTestDebugPage() {
  const { user } = useAuth();
  const { isFirebaseAuthenticated, isInitializing, error } = useFirebaseAuthStatus();
  const [testResult, setTestResult] = useState<string>('No test run yet');
  const [testLog, setTestLog] = useState<string[]>([]);
  const [writeResult, setWriteResult] = useState<string>('');
  const [readResult, setReadResult] = useState<string>('');
  const [legacyReadResult, setLegacyReadResult] = useState<string>('');
  
  // Clear the logs when component mounts
  useEffect(() => {
    setTestLog(['Initializing Firestore test page...']);
  }, []);

  // Log messages with timestamps
  const log = (message: string) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setTestLog(prev => [...prev, `${timestamp} - ${message}`]);
  };

  const runFirestoreTest = async () => {
    setTestResult('Running test...');
    log('Starting Firestore connectivity test');
    
    try {
      // Check auth status
      const currentUser = auth.currentUser;
      log(`Firebase auth status: ${currentUser ? 'authenticated' : 'not authenticated'}`);
      
      if (!currentUser) {
        log('ERROR: Not authenticated with Firebase, test will likely fail');
        log(`Express auth status: ${user ? 'authenticated' : 'not authenticated'}`);
        if (user) {
          log(`Express user ID: ${user.id}`);
          log(`Firebase token present: ${user.firebaseToken ? 'yes' : 'no'}`);
        }
        setTestResult('Failed - Not authenticated');
        return;
      }
      
      log(`Firebase User ID: ${currentUser.uid}`);
      log(`Express User ID: ${user?.id}`);
      
      // Verify if the Firebase uid matches our user ID
      if (currentUser.uid !== user?.id.toString()) {
        log('WARNING: Firebase UID does not match Express user ID');
      }
      
      setTestResult('Passed - Authentication verified');
    } catch (error) {
      log(`Error during test: ${error instanceof Error ? error.message : String(error)}`);
      setTestResult(`Failed - Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testFirestoreWrite = async () => {
    setWriteResult('Attempting write...');
    log('Starting Firestore write test');
    
    try {
      if (!auth.currentUser) {
        log('ERROR: Not authenticated with Firebase');
        setWriteResult('Failed - Not authenticated');
        return;
      }
      
      const userId = auth.currentUser.uid;
      log(`Writing to /users/${userId}/test/write-test`);
      
      // Attempt to write to the user's test document
      await setDoc(doc(db, 'users', userId, 'test', 'write-test'), {
        timestamp: new Date().toISOString(),
        testValue: 'This is a test write operation',
        testNumber: 42
      });
      
      log('Firestore write successful!');
      setWriteResult('Success - Document written');
    } catch (error) {
      log(`Firestore write error: ${error instanceof Error ? error.message : String(error)}`);
      setWriteResult(`Failed - Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testFirestoreRead = async () => {
    setReadResult('Attempting read...');
    log('Starting Firestore read test');
    
    try {
      if (!auth.currentUser) {
        log('ERROR: Not authenticated with Firebase');
        setReadResult('Failed - Not authenticated');
        return;
      }
      
      const userId = auth.currentUser.uid;
      log(`Reading from /users/${userId}/test/write-test`);
      
      // Attempt to read the test document
      const docSnap = await getDoc(doc(db, 'users', userId, 'test', 'write-test'));
      
      if (docSnap.exists()) {
        log(`Document data: ${JSON.stringify(docSnap.data())}`);
        setReadResult('Success - Document read');
      } else {
        log('No such document exists!');
        setReadResult('Failed - Document not found');
      }
    } catch (error) {
      log(`Firestore read error: ${error instanceof Error ? error.message : String(error)}`);
      setReadResult(`Failed - Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testLegacyRead = async () => {
    setLegacyReadResult('Attempting legacy read...');
    log('Starting legacy schema read test');
    
    try {
      if (!auth.currentUser) {
        log('ERROR: Not authenticated with Firebase');
        setLegacyReadResult('Failed - Not authenticated');
        return;
      }
      
      const userId = auth.currentUser.uid;
      
      // Try to read from legacy collections to see if we have access
      log('Checking legacy user_preferences collection');
      const prefDoc = await getDoc(doc(db, 'user_preferences', `user-${userId}`));
      
      if (prefDoc.exists()) {
        log(`Found user_preferences: ${JSON.stringify(prefDoc.data())}`);
      } else {
        log('No legacy user_preferences document found');
      }
      
      // Check if we can query the onboarding_ratings collection
      log('Checking legacy onboarding_ratings collection');
      const ratingsSnapshot = await getDocs(collection(db, 'onboarding_ratings'));
      log(`Found ${ratingsSnapshot.size} documents in onboarding_ratings`);
      
      setLegacyReadResult('Success - Legacy tests completed');
    } catch (error) {
      log(`Legacy read error: ${error instanceof Error ? error.message : String(error)}`);
      setLegacyReadResult(`Failed - Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Firestore Test Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2"><strong>Express Auth:</strong> {user ? 'Authenticated ✓' : 'Not Authenticated ✗'}</p>
            <p className="mb-2"><strong>Express User ID:</strong> {user?.id || 'N/A'}</p>
            <p className="mb-2"><strong>Firebase Auth:</strong> {isFirebaseAuthenticated ? 'Authenticated ✓' : 'Not Authenticated ✗'}</p>
            <p className="mb-2"><strong>Firebase Auth Initializing:</strong> {isInitializing ? 'Yes' : 'No'}</p>
            <p className="mb-2"><strong>Firebase Auth Error:</strong> {error ? error.message : 'None'}</p>
            <p className="mb-2"><strong>Firebase Token Present:</strong> {user?.firebaseToken ? 'Yes ✓' : 'No ✗'}</p>
            <p className="mb-2"><strong>Auth.currentUser UID:</strong> {auth.currentUser?.uid || 'Not logged in'}</p>
            
            <Button 
              onClick={runFirestoreTest}
              className="mt-4"
              disabled={isInitializing}
            >
              Verify Authentication
            </Button>
            <p className="mt-2 font-medium">Result: {testResult}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Firestore Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Button 
                  onClick={testFirestoreWrite}
                  disabled={!isFirebaseAuthenticated || isInitializing}
                  className="w-full"
                >
                  Test Write Operation
                </Button>
                <p className="mt-1">{writeResult}</p>
              </div>
              
              <div>
                <Button 
                  onClick={testFirestoreRead}
                  disabled={!isFirebaseAuthenticated || isInitializing}
                  className="w-full"
                >
                  Test Read Operation
                </Button>
                <p className="mt-1">{readResult}</p>
              </div>
              
              <div>
                <Button 
                  onClick={testLegacyRead}
                  disabled={!isFirebaseAuthenticated || isInitializing}
                  className="w-full"
                >
                  Test Legacy Schema Access
                </Button>
                <p className="mt-1">{legacyReadResult}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded-md h-[300px] overflow-y-auto font-mono text-sm">
            {testLog.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}