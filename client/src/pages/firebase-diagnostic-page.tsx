import React from 'react';
import { FirebaseEnvDiagnostic } from '@/components/FirebaseEnvDiagnostic';
import { FirebaseConfigDebug } from '@/components/FirebaseConfigDebug';
import { FirebaseAuthStatus } from '@/components/FirebaseAuthStatus';
import { FirebaseAuthDebug } from '@/components/FirebaseAuthDebug';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export default function FirebaseDiagnosticPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Firebase Diagnostic Tool</h1>
        <p className="text-gray-600">
          Comprehensive diagnostics for Firebase integration and authentication
        </p>
      </div>

      <FirebaseEnvDiagnostic />

      <Tabs defaultValue="config" className="w-full max-w-3xl mx-auto">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="info">Information</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config">
          <FirebaseConfigDebug />
        </TabsContent>
        
        <TabsContent value="auth">
          <div className="space-y-4">
            <FirebaseAuthStatus />
            <FirebaseAuthDebug />
          </div>
        </TabsContent>
        
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Firebase Integration Info</CardTitle>
              <CardDescription>
                Information about Firebase services and integration points
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="p-3 border rounded-md bg-blue-50">
                  <div className="font-medium mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-blue-500" />
                    Authentication
                  </div>
                  <p className="text-sm text-gray-600">
                    CineMatch uses Firebase Authentication for user authentication. On the server side, we use 
                    Firebase Admin SDK to generate custom tokens which are then used by the client to authenticate 
                    with Firebase directly.
                  </p>
                </div>
                
                <div className="p-3 border rounded-md bg-blue-50">
                  <div className="font-medium mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-blue-500" />
                    Firestore
                  </div>
                  <p className="text-sm text-gray-600">
                    User preferences, ratings, and other real-time data are stored in Firestore. The application 
                    implements a fallback mechanism that can use the server as a proxy if direct Firestore access 
                    fails.
                  </p>
                </div>
                
                <div className="p-3 border rounded-md bg-blue-50">
                  <div className="font-medium mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-blue-500" />
                    Troubleshooting Tips
                  </div>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>Ensure all Firebase environment variables are correctly set</li>
                    <li>Check that the Firebase project has been properly set up in the Firebase Console</li>
                    <li>Verify that the authentication methods are enabled in the Firebase Console</li>
                    <li>Check the Firestore security rules to ensure proper permissions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}