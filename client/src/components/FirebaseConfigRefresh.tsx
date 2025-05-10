import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { initializeApp, getApps, deleteApp } from 'firebase/app';

/**
 * Component to forcefully refresh the Firebase configuration
 * This can help when there are issues with Firebase initialization
 */
export function FirebaseConfigRefresh() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refreshFirebaseConfig = async () => {
    setLoading(true);
    setStatus('Checking current Firebase instances...');
    
    try {
      // Check existing Firebase apps
      const existingApps = getApps();
      setStatus(`Found ${existingApps.length} Firebase app instances`);
      
      // Delete all existing Firebase apps
      if (existingApps.length > 0) {
        setStatus('Deleting existing Firebase app instances...');
        
        for (const app of existingApps) {
          await deleteApp(app);
        }
        
        setStatus('Successfully deleted existing Firebase instances');
      }
      
      // Create a new Firebase config with required fields
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        databaseURL: `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`
      };
      
      // Initialize a new Firebase app
      setStatus('Initializing new Firebase app instance...');
      initializeApp(firebaseConfig);
      
      // Force reload the page to apply changes
      setStatus('Configuration refreshed. Reloading page...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setStatus(`Error refreshing Firebase configuration: ${error instanceof Error ? error.message : String(error)}`);
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Firebase Configuration</span>
          {getApps().length > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              Initialized
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Environment Variables</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded">
              <span className="font-bold">API Key:</span>
              <span className="ml-1">
                {import.meta.env.VITE_FIREBASE_API_KEY 
                  ? `${import.meta.env.VITE_FIREBASE_API_KEY.substring(0, 6)}...` 
                  : 'Missing'}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <span className="font-bold">Project ID:</span>
              <span className="ml-1">
                {import.meta.env.VITE_FIREBASE_PROJECT_ID || 'Missing'}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <span className="font-bold">App ID:</span>
              <span className="ml-1">
                {import.meta.env.VITE_FIREBASE_APP_ID 
                  ? `${import.meta.env.VITE_FIREBASE_APP_ID.split(':')[0]}:...` 
                  : 'Missing'}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <span className="font-bold">Messaging Sender ID:</span>
              <span className="ml-1">
                {import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'Missing'}
              </span>
            </div>
          </div>
        </div>
        
        {status && (
          <div className="text-sm p-2 bg-blue-50 text-blue-700 rounded mb-4">
            {status}
          </div>
        )}
        
        <p className="text-sm text-slate-600">
          If you're experiencing authentication issues, try refreshing the Firebase configuration.
          This will delete any existing Firebase instances and reinitialize with the current environment variables.
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={refreshFirebaseConfig} 
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Firebase Configuration
        </Button>
      </CardFooter>
    </Card>
  );
}