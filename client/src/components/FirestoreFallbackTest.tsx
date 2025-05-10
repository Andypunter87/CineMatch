import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useFirestoreFallback } from '@/hooks/use-firestore-fallback';

/**
 * Component to test the Firestore fallback access
 * This component tries to access Firestore data even when Firebase auth fails
 */
export function FirestoreFallbackTest() {
  const { 
    isFirebaseAuth, 
    isLoading, 
    error, 
    getUserPreferences, 
    getUserOnboardingRatings 
  } = useFirestoreFallback();
  
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data: any;
  } | null>(null);
  
  const [queryLoading, setQueryLoading] = useState(false);

  const testDirectPreferencesAccess = async () => {
    setQueryLoading(true);
    try {
      const preferences = await getUserPreferences();
      setTestResult({
        success: !!preferences,
        message: preferences ? "Successfully retrieved user preferences" : "No preferences found",
        data: preferences
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Error retrieving preferences: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      });
    } finally {
      setQueryLoading(false);
    }
  };

  const testDirectRatingsAccess = async () => {
    setQueryLoading(true);
    try {
      const ratings = await getUserOnboardingRatings();
      setTestResult({
        success: true,
        message: `Successfully retrieved ${ratings.length} ratings`,
        data: ratings
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Error retrieving ratings: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      });
    } finally {
      setQueryLoading(false);
    }
  };

  // Format JSON data for display
  const formatData = (data: any): string => {
    if (!data) return 'No data';
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return 'Error formatting data';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3">Checking Firebase authentication status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firestore Fallback Access Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-md bg-slate-50">
          <div className="text-sm font-medium mb-2">Authentication Status</div>
          <div className="flex items-center">
            {isFirebaseAuth ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-700">Firebase Authentication working</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-amber-500 mr-2" />
                <span className="text-amber-700">Using Firestore direct access fallback</span>
              </>
            )}
          </div>
          {error && (
            <div className="mt-2 text-red-600 text-sm">
              Error: {error.message}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={testDirectPreferencesAccess} 
            disabled={queryLoading}
            variant="outline"
          >
            {queryLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Test User Preferences
          </Button>
          <Button 
            onClick={testDirectRatingsAccess}
            disabled={queryLoading}
            variant="outline"
          >
            {queryLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Test Onboarding Ratings
          </Button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center mb-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              <div className={`font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResult.message}
              </div>
            </div>
            <div className="bg-white p-3 rounded-md border text-xs font-mono whitespace-pre-wrap overflow-auto max-h-52">
              {formatData(testResult.data)}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-slate-600">
        When Firebase Authentication fails, this component attempts to access Firestore directly
        via the REST API to provide uninterrupted data access.
      </CardFooter>
    </Card>
  );
}