import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

/**
 * Component for manually testing Firebase authentication
 * This is useful for debugging auth/configuration-not-found errors
 */
export function ManualFirebaseTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    error?: any;
    user?: any;
  } | null>(null);
  
  const [token, setToken] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  
  const logRef = useRef<HTMLDivElement>(null);
  
  // Helper function to log messages
  const log = (message: string) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setLogs(prev => [...prev, `${timestamp} - ${message}`]);
    
    // Auto-scroll to bottom of logs
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight;
      }
    }, 100);
  };
  
  const testDirectAuth = async () => {
    setLoading(true);
    setResult(null);
    log('---------------------------------------------');
    log('Starting direct Firebase authentication test');
    log('---------------------------------------------');
    
    if (!token || token.trim() === '') {
      log('ERROR: Token cannot be empty');
      setResult({
        success: false,
        message: 'Token is required'
      });
      setLoading(false);
      return;
    }
    
    try {
      log(`Using token: ${token.substring(0, 20)}...${token.substring(token.length - 20)}`);
      log(`Token length: ${token.length}`);
      
      // Get Firebase Auth instance
      const auth = getAuth();
      log('Got Firebase Auth instance');
      
      // Log Firebase auth config
      try {
        // @ts-ignore - Access internal Firebase config for debugging
        const authConfig = auth.config;
        const appConfig = auth.app.options;
        
        log('Firebase Auth Config:');
        log(JSON.stringify({
          apiKey: appConfig.apiKey ? 'present' : 'missing',
          projectId: appConfig.projectId,
          authDomain: appConfig.authDomain,
          appId: appConfig.appId ? 'present' : 'missing',
        }, null, 2));
      } catch (configError) {
        log(`Could not access Firebase config: ${configError}`);
      }
      
      // Attempt to sign in
      log('Attempting to sign in with custom token...');
      const userCredential = await signInWithCustomToken(auth, token);
      
      log('SUCCESS: Authentication successful!');
      log(`User ID: ${userCredential.user.uid}`);
      log(`Is Anonymous: ${userCredential.user.isAnonymous}`);
      
      setResult({
        success: true,
        message: 'Successfully authenticated with Firebase',
        user: {
          uid: userCredential.user.uid,
          isAnonymous: userCredential.user.isAnonymous,
          refreshToken: userCredential.user.refreshToken,
        }
      });
    } catch (error: any) {
      log(`ERROR: Authentication failed: ${error.message}`);
      
      // Enhanced error logging
      log('Error details:');
      if (error.code) log(`Code: ${error.code}`);
      if (error.name) log(`Name: ${error.name}`);
      if (error.stack) log(`Stack: ${error.stack}`);
      
      // Check for specific configuration issues
      if (error.code === 'auth/configuration-not-found') {
        log('DIAGNOSIS: The "auth/configuration-not-found" error typically means:');
        log('1. The Firebase Web App config is incorrect');
        log('2. The API key does not match the project');
        log('3. The Firebase project may not have Authentication enabled');
        log('4. There may be a network issue preventing API access');
      }
      
      setResult({
        success: false,
        message: `Authentication failed: ${error.message}`,
        error: {
          code: error.code,
          message: error.message,
          name: error.name
        }
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Firebase Authentication Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Firebase Custom Token</label>
          <Textarea 
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your Firebase custom token here"
            className="h-24"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-1 block">Debug Logs</label>
          <div 
            ref={logRef}
            className="h-48 border rounded-md p-2 overflow-y-auto bg-slate-50 text-xs font-mono whitespace-pre-wrap"
          >
            {logs.map((log, i) => (
              <div key={i} className="py-0.5">{log}</div>
            ))}
          </div>
        </div>
        
        {result && (
          <div className={`p-3 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <div className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </div>
            </div>
            
            {result.error && (
              <div className="mt-2 text-sm text-red-600">
                <div><strong>Code:</strong> {result.error.code}</div>
                <div><strong>Name:</strong> {result.error.name}</div>
              </div>
            )}
            
            {result.user && (
              <div className="mt-2 text-sm text-green-600">
                <div><strong>User ID:</strong> {result.user.uid}</div>
                <div><strong>Anonymous:</strong> {result.user.isAnonymous ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={testDirectAuth} 
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Test Firebase Auth Directly
        </Button>
      </CardFooter>
    </Card>
  );
}