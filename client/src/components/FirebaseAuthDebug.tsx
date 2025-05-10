import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInAnonymously, signOut } from 'firebase/auth';
import { useAuth } from '@/hooks/use-auth';
import { useFirebaseAuthStatus } from '@/components/FirebaseAuthProvider';

interface ExtendedUser {
  id: number;
  username: string | null;
  name: string | null;
  email: string;
  firebaseToken?: string;
  [key: string]: any;
}

/**
 * A component for debugging Firebase authentication status
 * This shows token status and allows testing Firebase auth
 */
export function FirebaseAuthDebug() {
  const { user } = useAuth() as { user: ExtendedUser | null };
  const { isFirebaseAuthenticated, isInitializing, error } = useFirebaseAuthStatus();
  
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [tokenInfo, setTokenInfo] = useState<{
    valid: boolean;
    data: any;
    error?: string;
  } | null>(null);
  
  // Log helper function
  const log = (message: string) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setLogs(prev => [...prev, `${timestamp} - ${message}`]);
  };
  
  // Initialize logs
  useEffect(() => {
    setLogs(['Initializing Firebase Auth debug component...']);
  }, []);
  
  /**
   * Analyze the token provided by the server
   */
  const analyzeToken = () => {
    setLoading(true);
    log('---------------------------------------------');
    log('Analyzing Firebase token');
    log('---------------------------------------------');
    
    try {
      if (!user) {
        log('⛔ ERROR: Not authenticated with server');
        setTokenInfo({
          valid: false,
          data: null,
          error: 'Not authenticated with server'
        });
        return;
      }
      
      const firebaseToken = user.firebaseToken;
      
      if (!firebaseToken) {
        log('⛔ ERROR: No Firebase token in user data');
        setTokenInfo({
          valid: false,
          data: null,
          error: 'No Firebase token provided by server'
        });
        return;
      }
      
      log(`Token received from server: ${firebaseToken.substring(0, 20)}...`);
      
      // Decode the base64 token
      try {
        let decodedToken = '';
        try {
          // For Node.js environment
          decodedToken = Buffer.from(firebaseToken, 'base64').toString();
        } catch (e) {
          // For browser environment
          decodedToken = atob(firebaseToken);
        }
        
        const tokenData = JSON.parse(decodedToken);
        log(`Token decoded: ${JSON.stringify(tokenData, null, 2)}`);
        
        // Check if the token is valid
        const now = Date.now();
        if (tokenData.exp < now) {
          log('⚠️ WARNING: Token is expired!');
          setTokenInfo({
            valid: false,
            data: tokenData,
            error: 'Token is expired'
          });
        } else {
          log('✅ Token is valid and not expired');
          log(`Token expiration: ${new Date(tokenData.exp).toLocaleString()}`);
          
          // Check if the token UID matches the user ID
          if (tokenData.uid && tokenData.uid === user.id.toString()) {
            log('✅ Token UID matches server user ID');
          } else {
            log(`⚠️ WARNING: Token UID (${tokenData.uid}) does not match server user ID (${user.id})`);
          }
          
          setTokenInfo({
            valid: true,
            data: tokenData
          });
        }
      } catch (parseError) {
        log(`⛔ Error decoding token: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        setTokenInfo({
          valid: false,
          data: null,
          error: `Failed to decode token: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        });
      }
    } catch (error) {
      log(`⛔ Error analyzing token: ${error instanceof Error ? error.message : String(error)}`);
      setTokenInfo({
        valid: false,
        data: null,
        error: String(error)
      });
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Try to sign in with Firebase anonymously
   */
  const attemptFirebaseSignIn = async () => {
    setLoading(true);
    log('---------------------------------------------');
    log('Attempting Firebase sign in');
    log('---------------------------------------------');
    
    try {
      // First check localStorage
      const storedUserId = localStorage.getItem('customAuthUserId');
      log(`User ID in localStorage: ${storedUserId || 'none'}`);
      
      log('Attempting anonymous sign-in with Firebase...');
      const result = await signInAnonymously(auth);
      
      if (result.user) {
        log(`✅ Successfully signed in anonymously as UID: ${result.user.uid}`);
        log(`This UID is different from the server user ID, but we can still use Firestore`);
        log(`Firestore security rules should check against customAuthUserId: ${storedUserId}`);
      }
    } catch (error) {
      log(`⛔ Error signing in: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Sign out of Firebase
   */
  const signOutOfFirebase = async () => {
    setLoading(true);
    log('---------------------------------------------');
    log('Signing out of Firebase');
    log('---------------------------------------------');
    
    try {
      await signOut(auth);
      log('✅ Successfully signed out of Firebase');
    } catch (error) {
      log(`⛔ Error signing out: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Firebase Authentication Debug</CardTitle>
        <CardDescription>
          Verify Firebase authentication status and token details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Status</h3>
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium">Server Auth:</div>
            {user ? (
              <div className="flex items-center text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Authenticated as {user.username} (ID: {user.id})
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="h-4 w-4 mr-1" />
                Not authenticated
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium">Firebase Auth:</div>
            {isInitializing ? (
              <div className="flex items-center text-orange-600">
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Initializing...
              </div>
            ) : isFirebaseAuthenticated ? (
              <div className="flex items-center text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Authenticated {auth.currentUser && `as ${auth.currentUser.uid}`}
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="h-4 w-4 mr-1" />
                Not authenticated
              </div>
            )}
          </div>
          
          {error && (
            <div className="flex items-center gap-2 mb-1 text-red-600">
              <div className="font-medium">Error:</div>
              <div>{error.message}</div>
            </div>
          )}
          
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium">LocalStorage:</div>
            {localStorage.getItem('customAuthUserId') ? (
              <div className="flex items-center text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                User ID: {localStorage.getItem('customAuthUserId')}
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="h-4 w-4 mr-1" />
                No user ID stored
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Button
            onClick={analyzeToken}
            variant="outline"
            className="mb-2"
            disabled={loading || !user}
          >
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            Analyze Token
          </Button>
          
          <Button
            onClick={attemptFirebaseSignIn}
            variant="default"
            className="mb-2"
            disabled={loading || isFirebaseAuthenticated}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Sign In
          </Button>
          
          <Button
            onClick={signOutOfFirebase}
            variant="destructive"
            className="mb-2"
            disabled={loading || !auth.currentUser}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
        
        {tokenInfo && (
          <Alert className={`mt-4 ${tokenInfo.valid ? 'bg-green-50' : 'bg-red-50'}`}>
            <AlertTitle>
              {tokenInfo.valid ? 'Valid Token' : 'Invalid Token'}
            </AlertTitle>
            <AlertDescription>
              {tokenInfo.error ? (
                <div className="text-red-600 font-medium mb-2">{tokenInfo.error}</div>
              ) : null}
              
              {tokenInfo.data && (
                <div className="whitespace-pre-wrap font-mono text-xs">
                  {JSON.stringify(tokenInfo.data, null, 2)}
                </div>
              )}
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