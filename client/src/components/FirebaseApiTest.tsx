import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * Component to test Firebase API keys directly against the Auth REST API
 * This will help diagnose if there are issues with the API key itself
 */
export function FirebaseApiTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details: string;
  } | null>(null);

  const testFirebaseApiKey = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Get the Firebase API key from environment
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      
      if (!apiKey) {
        setResult({
          success: false,
          message: "Firebase API key is missing",
          details: "The VITE_FIREBASE_API_KEY environment variable is not set."
        });
        return;
      }
      
      // Test a simple Firebase Auth REST API call 
      // We'll try to get the providers for a non-existent email which should return
      // a valid response even though the email doesn't exist
      const testEmail = 'test@example.com';
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: testEmail,
          continueUri: 'http://localhost',
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: "Firebase API key is valid",
          details: `Successfully called Firebase Auth API. Response: ${JSON.stringify(data, null, 2)}`
        });
      } else {
        // If we get an error response from Firebase
        setResult({
          success: false,
          message: `Firebase API key is invalid or has insufficient permissions`,
          details: `Error: ${data.error?.message || JSON.stringify(data)}`
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to test Firebase API key",
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firebase API Key Test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          This test verifies if the Firebase API key is valid by making a direct call to the Firebase Auth REST API.
        </p>
        
        {result && (
          <div className={`p-4 rounded-md mb-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
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
            <div className="mt-2 text-xs font-mono whitespace-pre-wrap bg-slate-100 p-2 rounded max-h-48 overflow-auto">
              {result.details}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={testFirebaseApiKey} 
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Test Firebase API Key
        </Button>
      </CardFooter>
    </Card>
  );
}