import { useFirebaseAuthStatus } from '@/components/FirebaseAuthProvider';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

/**
 * Component to display the current Firebase authentication status
 * Useful for debugging and monitoring the auth sync process
 */
export function FirebaseAuthStatus() {
  const { isFirebaseAuthenticated, isInitializing, error } = useFirebaseAuthStatus();
  const { user } = useAuth();

  // Don't show anything if user is not logged in with Express
  if (!user) {
    return null;
  }

  if (isInitializing) {
    return (
      <Alert className="mb-4">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <AlertTitle>Initializing Firebase Authentication</AlertTitle>
        <AlertDescription>
          Synchronizing your session with Firebase...
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <XCircle className="h-4 w-4 mr-2" />
        <AlertTitle>Firebase Authentication Error</AlertTitle>
        <AlertDescription>
          {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isFirebaseAuthenticated) {
    return (
      <Alert variant="default" className="bg-green-50 border-green-200 mb-4">
        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
        <AlertTitle>Firebase Authentication Active</AlertTitle>
        <AlertDescription>
          Your session is synchronized with Firebase.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="default" className="bg-yellow-50 border-yellow-200 mb-4">
      <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
      <AlertTitle>Firebase Authentication Inactive</AlertTitle>
      <AlertDescription>
        You're logged in but not authenticated with Firebase.
      </AlertDescription>
    </Alert>
  );
}