import { useAuth } from '@/hooks/use-auth';
import { FirebaseAuthDebug } from '@/components/FirebaseAuthDebug';
import { FirestoreClientTest } from '@/components/FirestoreClientTest';
import { TestFirebaseTokenButton } from '@/components/TestFirebaseTokenButton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

/**
 * A dedicated page for testing Firebase/Firestore integration
 */
export default function FirebaseTestPage() {
  const { user } = useAuth();
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Firebase/Firestore Integration Tests</h1>
      
      <Alert variant="warning" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Configuration Required</AlertTitle>
        <AlertDescription>
          This page requires valid Firebase project configuration. Make sure all Firebase environment 
          variables are set correctly (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID).
        </AlertDescription>
      </Alert>
      
      {!user ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-6">
          <div className="font-medium text-yellow-800 mb-2">Not Authenticated</div>
          <p className="text-yellow-700">
            You need to be logged in to perform these tests. Please log in first.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Firebase Custom Token Test</h2>
            <p className="text-sm text-gray-600 mb-4">
              This test verifies that the server can generate valid Firebase custom tokens
              and displays detailed information about the token.
            </p>
            <TestFirebaseTokenButton />
          </div>
        
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Firebase Authentication Status</h2>
            <p className="text-sm text-gray-600 mb-4">
              This test shows the current authentication state and allows testing
              Firebase Auth functionality.
            </p>
            <FirebaseAuthDebug />
          </div>
          
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Firestore Client Test</h2>
            <p className="text-sm text-gray-600 mb-4">
              This test verifies connectivity to Firestore and the ability to read/write data.
              Make sure you are authenticated with Firebase first.
            </p>
            <FirestoreClientTest />
          </div>
        </>
      )}
    </div>
  );
}