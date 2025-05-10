import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Copy } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';

/**
 * Component for testing Firebase custom token generation
 */
export function TestFirebaseTokenButton() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    token?: string;
    tokenLength?: number;
    error?: string;
    uid?: string;
  } | null>(null);
  
  const testToken = async () => {
    if (!user) {
      setResult({
        success: false,
        error: 'You must be logged in to test the token'
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await apiRequest('GET', '/api/firebase/token-test');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error testing Firebase token:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const copyToken = () => {
    if (result?.token) {
      navigator.clipboard.writeText(result.token);
    }
  };
  
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Firebase Custom Token Test</h3>
          <Button 
            onClick={testToken} 
            disabled={loading || !user}
            variant="outline"
            size="sm"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Get Test Token
          </Button>
        </div>
        
        {!user && (
          <div className="flex items-center text-amber-500 bg-amber-50 p-3 rounded-md">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span className="text-sm">You must be logged in to test Firebase tokens</span>
          </div>
        )}
        
        {result && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
              <div className="font-medium mr-2">Status:</div>
              {result.success ? (
                <span className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Success
                </span>
              ) : (
                <span className="flex items-center text-red-600">
                  <XCircle className="h-4 w-4 mr-1" />
                  Failed
                </span>
              )}
            </div>
            
            {result.uid && (
              <div className="flex items-center">
                <div className="font-medium mr-2">User ID:</div>
                <code className="px-1 py-0.5 bg-slate-100 rounded">{result.uid}</code>
              </div>
            )}
            
            {result.tokenLength && (
              <div className="flex items-center">
                <div className="font-medium mr-2">Token Length:</div>
                <code className="px-1 py-0.5 bg-slate-100 rounded">{result.tokenLength} chars</code>
              </div>
            )}
            
            {result.token && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Firebase Custom Token:</div>
                  <Button 
                    onClick={copyToken} 
                    variant="outline" 
                    size="sm"
                    className="h-7 px-2"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="bg-slate-100 p-2 rounded-md overflow-x-auto">
                  <code className="text-xs break-all whitespace-pre-wrap">{result.token}</code>
                </div>
                <div className="text-xs text-slate-500">
                  Use this token with <code className="text-xs">firebase.auth().signInWithCustomToken(token)</code>
                </div>
              </div>
            )}
            
            {result.error && (
              <div className="bg-red-50 p-3 rounded-md">
                <div className="font-medium text-red-700 mb-1">Error:</div>
                <div className="text-red-600">{result.error}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}