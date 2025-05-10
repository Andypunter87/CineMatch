import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * A component for testing direct client-to-Firestore communication
 * This bypasses the server and uses the Firebase SDK directly
 */
export function FirestoreClientTest() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Log helper function
  const log = (message: string) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setLogs(prev => [...prev, `${timestamp} - ${message}`]);
  };
  
  /**
   * Test direct client write to Firestore - bypassing server
   */
  const testClientWrite = async () => {
    setLoading(true);
    setResult('');
    log('---------------------------------------------');
    log('Testing Direct Client Firestore Write');
    log('---------------------------------------------');
    
    try {
      // First, check if we have a userId in localStorage (set by token processing)
      const userId = localStorage.getItem('customAuthUserId');
      
      if (!userId) {
        const errorMsg = '⛔ ERROR: No userId found in localStorage. Authentication required.';
        log(errorMsg);
        setResult(errorMsg);
        setLoading(false);
        return;
      }
      
      // For this test we'll write to a special debug collection
      const debugPath = `users/${userId}/debug_tests/connection_test`;
      log(`📝 Writing to ${debugPath}`);
      
      const testData = {
        timestamp: new Date().toISOString(),
        testId: `client-test-${Date.now()}`,
        message: 'Client direct write test',
        browser: navigator.userAgent,
        clientTime: new Date().toLocaleString()
      };
      
      log(`📄 Test data: ${JSON.stringify(testData, null, 2)}`);
      
      // Write the document
      const debugDocRef = doc(db, debugPath);
      await setDoc(debugDocRef, testData);
      
      log('✅ Successfully wrote test document to Firestore');
      setResult(
        `SUCCESS: Wrote test document to Firestore\n` +
        `Path: ${debugPath}\n` +
        `Data: ${JSON.stringify(testData, null, 2)}`
      );
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`⛔ Error during client write test: ${errorMsg}`);
      
      // Analyze security rules errors
      if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
        log('⛔ SECURITY RULES ERROR: Check Firestore security rules');
        setResult(
          `ERROR: Permission denied. This indicates a security rules issue.\n` +
          `Make sure your Firestore security rules allow write access to /users/{userId}/debug_tests/*\n\n` +
          `Full error: ${errorMsg}`
        );
      } else {
        setResult(`ERROR: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Test direct client read from Firestore - bypassing server
   */
  const testClientRead = async () => {
    setLoading(true);
    setResult('');
    log('---------------------------------------------');
    log('Testing Direct Client Firestore Read');
    log('---------------------------------------------');
    
    try {
      // First, check if we have a userId in localStorage (set by token processing)
      const userId = localStorage.getItem('customAuthUserId');
      
      if (!userId) {
        const errorMsg = '⛔ ERROR: No userId found in localStorage. Authentication required.';
        log(errorMsg);
        setResult(errorMsg);
        setLoading(false);
        return;
      }
      
      // Read from the debug collection
      const debugPath = `users/${userId}/debug_tests/connection_test`;
      log(`🔍 Reading from ${debugPath}`);
      
      const debugDocRef = doc(db, debugPath);
      const docSnap = await getDoc(debugDocRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        log('✅ Successfully read test document from Firestore');
        setResult(
          `SUCCESS: Document exists\n` +
          `Path: ${debugPath}\n` +
          `Data: ${JSON.stringify(data, null, 2)}`
        );
      } else {
        log('⚠️ Document not found. You may need to run the write test first.');
        setResult(
          `Document not found at ${debugPath}.\n` +
          `You should run the write test first to create this document.`
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`⛔ Error during client read test: ${errorMsg}`);
      
      // Analyze security rules errors
      if (errorMsg.includes('permission-denied') || errorMsg.includes('Missing or insufficient permissions')) {
        log('⛔ SECURITY RULES ERROR: Check Firestore security rules');
        setResult(
          `ERROR: Permission denied. This indicates a security rules issue.\n` +
          `Make sure your Firestore security rules allow read access to /users/{userId}/debug_tests/*\n\n` +
          `Full error: ${errorMsg}`
        );
      } else {
        setResult(`ERROR: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Check if Firebase authentication seems to be working
  const userId = localStorage.getItem('customAuthUserId');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Direct Client Firestore Test</CardTitle>
        <CardDescription>
          This test bypasses the server and uses the Firebase SDK to communicate directly with Firestore.
          {!userId && (
            <Alert variant="destructive" className="mt-2">
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                No user ID found in localStorage. You must be authenticated with Firebase first.
              </AlertDescription>
            </Alert>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Button
            onClick={testClientWrite}
            variant="default"
            className="mb-2"
            disabled={loading || !userId}
          >
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Write Test Document
          </Button>
          
          <Button
            onClick={testClientRead}
            variant="outline"
            className="mb-2"
            disabled={loading || !userId}
          >
            <Download className="mr-2 h-4 w-4" />
            Read Test Document
          </Button>
        </div>
        
        {result && (
          <Alert className="mt-4">
            <AlertTitle>Test Result</AlertTitle>
            <AlertDescription>
              <div className="whitespace-pre-wrap font-mono text-xs">{result}</div>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Log Output</h4>
          <div className="bg-muted p-2 rounded-md h-40 overflow-y-auto text-xs font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}