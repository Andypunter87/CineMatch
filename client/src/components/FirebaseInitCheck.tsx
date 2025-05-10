import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getApps } from 'firebase/app';

/**
 * A component to check Firebase initialization status and display environment variables
 */
export function FirebaseInitCheck() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Get all environment variables that start with VITE_FIREBASE
    const firebaseVars: Record<string, string> = {};
    
    // Collect Firebase environment variables without exposing sensitive values
    const collectVar = (name: string, full?: boolean) => {
      const value = import.meta.env[name];
      if (value) {
        if (full) {
          firebaseVars[name] = value;
        } else {
          // Mask sensitive values
          if (name.includes('KEY') || name.includes('SECRET') || name.includes('TOKEN') || name.includes('APP_ID')) {
            firebaseVars[name] = value.substring(0, 5) + '...' + value.substring(value.length - 5);
          } else {
            firebaseVars[name] = value;
          }
        }
      } else {
        firebaseVars[name] = 'Not set';
      }
    };
    
    // Check specific environment variables
    collectVar('VITE_FIREBASE_API_KEY');
    collectVar('VITE_FIREBASE_AUTH_DOMAIN', true);
    collectVar('VITE_FIREBASE_PROJECT_ID', true);
    collectVar('VITE_FIREBASE_STORAGE_BUCKET', true);
    collectVar('VITE_FIREBASE_MESSAGING_SENDER_ID', true);
    collectVar('VITE_FIREBASE_APP_ID');
    
    setEnvVars(firebaseVars);
  }, []);
  
  const copyToClipboard = () => {
    // Format environment variables for easy debugging
    const formatted = Object.entries(envVars)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
      
    navigator.clipboard.writeText(formatted);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Firebase Initialization Status</span>
          <Badge 
            variant={getApps().length > 0 ? 'default' : 'destructive'}
            className="ml-2"
          >
            {getApps().length > 0 ? 'Initialized' : 'Not Initialized'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium mb-2">Environment Variables</h3>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="bg-slate-50 p-2 rounded flex justify-between">
                  <span className="font-mono">{key}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
              onClick={copyToClipboard}
            >
              Copy Environment Variables
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}