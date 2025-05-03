import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { FirebaseAuthStatus } from "@/components/FirebaseAuthStatus";
import { useFirebaseAuthStatus } from "@/components/FirebaseAuthProvider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Key } from "lucide-react";

/**
 * A debug page for Firebase authentication
 * This is useful for development and testing to see the current state
 * of the Firebase authentication system
 */
export default function FirebaseAuthDebug() {
  const { user } = useAuth();
  const { isFirebaseAuthenticated, isInitializing, error } = useFirebaseAuthStatus();
  const [showToken, setShowToken] = useState(false);
  
  // Check if a token is stored in localStorage (our custom approach)
  const customAuthUserId = localStorage.getItem('customAuthUserId');
  
  const refreshPage = () => {
    window.location.reload();
  };
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Firebase Authentication Debug</h1>
      
      <div className="grid gap-6 max-w-4xl mx-auto">
        <FirebaseAuthStatus />
        
        <Card>
          <CardHeader>
            <CardTitle>Express Authentication Status</CardTitle>
            <CardDescription>
              Current user session status in the Express backend
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant="default" className="bg-green-500">Authenticated</Badge>
                </div>
                <div className="flex items-start justify-between">
                  <span className="font-medium">User ID:</span>
                  <span className="text-right">{user.id}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="font-medium">Username:</span>
                  <span className="text-right">{user.username || "N/A"}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="font-medium">Email:</span>
                  <span className="text-right">{user.email}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="font-medium">Auth Provider:</span>
                  <span className="text-right">{user.authProvider || "local"}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="font-medium">Firebase Token:</span>
                  <div className="text-right flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowToken(!showToken)}>
                      <Key className="h-4 w-4 mr-2" />
                      {showToken ? "Hide" : "Show"}
                    </Button>
                  </div>
                </div>
                {showToken && (
                  <div className="bg-gray-100 p-3 rounded-md text-xs overflow-auto max-h-40">
                    {(user as any).firebaseToken || "No Firebase token found"}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2">
                <Badge variant="destructive">Not Authenticated</Badge>
                <p className="mt-2 text-sm text-gray-500">
                  You are not currently logged in to the Express backend.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Firebase Authentication</CardTitle>
            <CardDescription>
              Current Firebase authentication bridge status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                {isInitializing ? (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-500">Initializing</Badge>
                ) : isFirebaseAuthenticated ? (
                  <Badge variant="default" className="bg-green-500">Authenticated</Badge>
                ) : (
                  <Badge variant="destructive">Not Authenticated</Badge>
                )}
              </div>
              
              <div className="flex items-start justify-between">
                <span className="font-medium">Custom Auth User ID:</span>
                <span className="text-right">{customAuthUserId || "Not set"}</span>
              </div>
              
              {error && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-500 mb-1">Error:</h4>
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                    {error.message}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Debug Actions</CardTitle>
            <CardDescription>
              Helpful actions for debugging authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={refreshPage} 
              variant="secondary" 
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
          <CardFooter className="text-xs text-gray-500 border-t pt-4">
            Note: This page is for development and debugging purposes only.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}