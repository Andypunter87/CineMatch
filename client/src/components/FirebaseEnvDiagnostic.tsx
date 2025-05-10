import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper to fix storage bucket value if it has a prefix
const fixStorageBucket = (value: string | undefined) => {
  if (!value) return undefined;
  // First check for the double prefix issue
  if (value.startsWith('VITE_FIREBASE_STORAGE_BUCKET=')) {
    let fixed = value.replace('VITE_FIREBASE_STORAGE_BUCKET=', '');
    // Check for a second instance of the prefix
    if (fixed.startsWith('VITE_FIREBASE_STORAGE_BUCKET=')) {
      fixed = fixed.replace('VITE_FIREBASE_STORAGE_BUCKET=', '');
    }
    return fixed;
  }
  return value;
};

// List of expected environment variables
const EXPECTED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

// Corresponding human-readable names
const ENV_VAR_NAMES: Record<string, string> = {
  'VITE_FIREBASE_API_KEY': 'API Key',
  'VITE_FIREBASE_AUTH_DOMAIN': 'Auth Domain',
  'VITE_FIREBASE_PROJECT_ID': 'Project ID',
  'VITE_FIREBASE_STORAGE_BUCKET': 'Storage Bucket',
  'VITE_FIREBASE_MESSAGING_SENDER_ID': 'Messaging Sender ID',
  'VITE_FIREBASE_APP_ID': 'App ID'
};

type EnvVarStatus = {
  name: string;
  value: string | undefined;
  display: string;
  present: boolean;
  fixed?: string;
  issues: string[];
};

export function FirebaseEnvDiagnostic() {
  const [envVars, setEnvVars] = useState<EnvVarStatus[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const { toast } = useToast();

  const checkEnvironmentVariables = () => {
    setIsChecking(true);
    const env = import.meta.env;
    const results: EnvVarStatus[] = [];

    for (const varName of EXPECTED_ENV_VARS) {
      const value = (env as any)[varName];
      const displayName = ENV_VAR_NAMES[varName] || varName;
      const issues: string[] = [];
      
      // Check for presence
      if (!value) {
        issues.push('Missing environment variable');
      }
      
      let display = value ? 'present' : 'missing';
      let fixed: string | undefined = undefined;
      
      // Special handling for specific variables
      if (varName === 'VITE_FIREBASE_API_KEY' && value) {
        display = `${value.substring(0, 5)}...`;
        if (value.length < 20) {
          issues.push('API key appears too short');
        }
      } else if (varName === 'VITE_FIREBASE_AUTH_DOMAIN' && value) {
        display = value;
        if (!value.includes('.firebaseapp.com')) {
          issues.push('Auth domain should end with .firebaseapp.com');
        }
      } else if (varName === 'VITE_FIREBASE_PROJECT_ID' && value) {
        display = value;
        if (value.length < 5) {
          issues.push('Project ID appears too short');
        }
      } else if (varName === 'VITE_FIREBASE_STORAGE_BUCKET' && value) {
        display = value;
        if (value.startsWith('VITE_FIREBASE_STORAGE_BUCKET=')) {
          issues.push('Storage bucket contains prefix in value');
          fixed = fixStorageBucket(value);
        }
        if (!value.includes('.appspot.com') && 
            !(fixed && fixed.includes('.appspot.com'))) {
          issues.push('Storage bucket should end with .appspot.com');
        }
      } else if (varName === 'VITE_FIREBASE_APP_ID' && value) {
        display = value.split(':')[0] + ':...';
        if (!value.includes(':')) {
          issues.push('App ID should contain colons');
        }
      }
      
      results.push({
        name: displayName,
        value,
        display,
        present: !!value,
        fixed,
        issues
      });
    }
    
    setEnvVars(results);
    setIsChecking(false);
    
    // Log detailed results to console for troubleshooting
    console.log('[Firebase Environment Diagnostic]', results);
    
    // Show summary toast
    const missingCount = results.filter(v => !v.present).length;
    const issuesCount = results.filter(v => v.issues.length > 0).length;
    
    if (missingCount > 0 || issuesCount > 0) {
      toast({
        title: 'Firebase Environment Issues Detected',
        description: `${missingCount} missing variables, ${issuesCount} variables with issues`,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Firebase Environment Check',
        description: 'All environment variables present and valid',
        variant: 'default'
      });
    }
  };

  useEffect(() => {
    checkEnvironmentVariables();
  }, []);

  const allPresent = envVars.every(v => v.present);
  const anyIssues = envVars.some(v => v.issues.length > 0);

  return (
    <Card className="w-full max-w-3xl mx-auto mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Firebase Environment Variables</CardTitle>
          <div className="flex gap-2">
            {allPresent && !anyIssues ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                All Valid
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Issues Detected
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkEnvironmentVariables}
              disabled={isChecking}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <CardDescription>
          Diagnostic tool for Firebase configuration variables
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(!allPresent || anyIssues) && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Issues Detected</AlertTitle>
            <AlertDescription>
              {!allPresent && (
                <div>Some Firebase environment variables are missing.</div>
              )}
              {anyIssues && (
                <div>Some Firebase environment variables have validation issues.</div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          {envVars.map((variable) => (
            <div 
              key={variable.name} 
              className={`p-3 border rounded-md ${
                variable.issues.length > 0 ? 'border-amber-300 bg-amber-50' : 
                variable.present ? 'border-green-200 bg-green-50' : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex justify-between mb-1">
                <div className="font-medium flex items-center">
                  {variable.name}
                  {variable.present ? (
                    variable.issues.length > 0 ? (
                      <AlertTriangle className="h-4 w-4 ml-2 text-amber-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                    )
                  ) : (
                    <AlertTriangle className="h-4 w-4 ml-2 text-red-500" />
                  )}
                </div>
                <Badge variant="outline" className={
                  !variable.present ? 'bg-red-50 text-red-700 border-red-200' :
                  variable.issues.length > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-green-50 text-green-700 border-green-200'
                }>
                  {!variable.present ? 'Missing' : 
                   variable.issues.length > 0 ? 'Issues' : 'Valid'}
                </Badge>
              </div>
              
              {variable.present && (
                <div className="text-sm text-gray-600 font-mono mb-1">
                  Value: {variable.display}
                </div>
              )}
              
              {variable.fixed && (
                <div className="text-sm text-green-600 font-mono mb-1">
                  Fixed: {variable.fixed}
                </div>
              )}
              
              {variable.issues.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="font-medium text-amber-700 mb-1">Issues:</div>
                  <ul className="list-disc list-inside space-y-1 text-amber-800">
                    {variable.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}