import { useAuth } from '@/hooks/use-auth';
import { FirebaseAuthDebug } from '@/components/FirebaseAuthDebug';
import { FirestoreClientTest } from '@/components/FirestoreClientTest';
import { TestFirebaseTokenButton } from '@/components/TestFirebaseTokenButton';
import { ManualFirebaseTest } from '@/components/ManualFirebaseTest';
import { FirebaseApiTest } from '@/components/FirebaseApiTest';
import { FirebaseConfigRefresh } from '@/components/FirebaseConfigRefresh';
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
      
      <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-800">
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
            <h2 className="text-xl font-bold mb-4">Firebase Configuration</h2>
            <p className="text-sm text-gray-600 mb-4">
              This section shows the current Firebase configuration and allows you to reset it if needed.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <FirebaseConfigRefresh />
              <FirebaseApiTest />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Manual Firebase Authentication Test</h2>
            <p className="text-sm text-gray-600 mb-4">
              This test allows you to manually sign in with a Firebase custom token and provides
              detailed diagnostic information about any errors encountered.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <ManualFirebaseTest />
              </div>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-md">
                  <h3 className="font-medium text-blue-700 mb-2">Troubleshooting Configuration Errors</h3>
                  <ul className="list-disc pl-5 space-y-1 text-blue-600 text-sm">
                    <li>Verify that Authentication is enabled in the Firebase console</li>
                    <li>Check that the API key matches the Firebase project</li>
                    <li>Ensure the web app is registered in the Firebase console</li>
                    <li>Verify all Firebase environment variables are loaded correctly</li>
                    <li>Try accessing the Firebase Auth REST API directly</li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-4 rounded-md">
                  <h3 className="font-medium text-slate-700 mb-2">How to Obtain a Token</h3>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-600 text-sm">
                    <li>Click "Get Test Token" in the token test section above</li>
                    <li>Copy the full token</li>
                    <li>Paste it in the input field in this section</li>
                    <li>Click "Test Firebase Auth Directly"</li>
                  </ol>
                </div>
              </div>
            </div>
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