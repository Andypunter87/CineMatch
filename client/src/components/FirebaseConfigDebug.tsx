import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

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

type ConfigStatusItem = {
  value: any;
  present: boolean;
  display: string;
  fixed?: string;
};

export function FirebaseConfigDebug() {
  const [configStatus, setConfigStatus] = useState<Record<string, ConfigStatusItem>>({});

  useEffect(() => {
    const env = import.meta.env;
    
    // Collect Firebase config variables
    const configs: Record<string, { 
      value: any; 
      display: string;
      fixed?: string;
    }> = {
      'API Key': {
        value: env.VITE_FIREBASE_API_KEY,
        display: env.VITE_FIREBASE_API_KEY ? 
          `${env.VITE_FIREBASE_API_KEY.substring(0, 5)}...` : 'missing'
      },
      'Auth Domain': {
        value: env.VITE_FIREBASE_AUTH_DOMAIN,
        display: env.VITE_FIREBASE_AUTH_DOMAIN || 'missing'
      },
      'Project ID': {
        value: env.VITE_FIREBASE_PROJECT_ID,
        display: env.VITE_FIREBASE_PROJECT_ID || 'missing'
      },
      'Storage Bucket': {
        value: env.VITE_FIREBASE_STORAGE_BUCKET,
        display: env.VITE_FIREBASE_STORAGE_BUCKET || 'missing',
        fixed: fixStorageBucket(env.VITE_FIREBASE_STORAGE_BUCKET) || 'missing'
      },
      'Messaging Sender ID': {
        value: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        display: env.VITE_FIREBASE_MESSAGING_SENDER_ID ? 'present' : 'missing'
      },
      'App ID': {
        value: env.VITE_FIREBASE_APP_ID,
        display: env.VITE_FIREBASE_APP_ID ? 
          `${env.VITE_FIREBASE_APP_ID.split(':')[0]}:...` : 'missing'
      }
    };

    // Build the status object
    const status: Record<string, ConfigStatusItem> = {};
    for (const [key, config] of Object.entries(configs)) {
      status[key] = {
        value: config.value,
        present: !!config.value,
        display: config.display,
        fixed: config.fixed
      };
    }

    setConfigStatus(status);
  }, []);

  const allConfigPresent = Object.values(configStatus).every(item => item.present);

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Firebase Configuration
          {allConfigPresent ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Incomplete
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Firebase environment variables and configuration status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!allConfigPresent && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Missing Configuration</AlertTitle>
            <AlertDescription>
              Some Firebase configuration values are missing. This can cause authentication and 
              database connection issues.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(configStatus).map(([key, status]) => (
            <div key={key} className="flex items-center justify-between p-2 border rounded-md">
              <div>
                <div className="text-sm font-medium">{key}</div>
                <div className="text-xs text-gray-500">{status.display}</div>
                {key === 'Storage Bucket' && status.fixed && status.fixed !== status.display && (
                  <div className="text-xs text-green-600 mt-0.5">
                    Fixed value: {status.fixed}
                  </div>
                )}
              </div>
              {status.present ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-2 bg-gray-50 rounded border text-xs font-mono">
          <div className="flex items-center mb-1">
            <Info className="h-3.5 w-3.5 mr-1 text-blue-500" />
            <span className="font-semibold">Current Loaded Configuration</span>
          </div>
          <pre className="whitespace-pre-wrap break-all">
            {`{
  apiKey: "${configStatus['API Key']?.display || ''}",
  authDomain: "${configStatus['Auth Domain']?.display || ''}",
  projectId: "${configStatus['Project ID']?.display || ''}",
  storageBucket: "${configStatus['Storage Bucket']?.fixed || configStatus['Storage Bucket']?.display || ''}",
  messagingSenderId: "${configStatus['Messaging Sender ID']?.display || ''}",
  appId: "${configStatus['App ID']?.display || ''}"
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}