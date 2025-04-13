import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.FC;
  adminOnly?: boolean;
}

export function ProtectedRoute({ 
  path,
  component: Component, 
  adminOnly = false,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  return (
    <Route
      path={path}
    >
      {(params) => {
        if (!user) {
          return <Redirect to="/auth" />;
        }
        
        // Check for admin access if route requires it
        if (adminOnly && !user.isAdmin) {
          return <Redirect to="/" />;
        }
        
        // Redirect to onboarding if the user needs it and isn't already there
        // Note: We check explicitly for false to handle older users who might not have the field set
        if (
          user.needsOnboarding !== false && 
          path !== "/onboarding" && 
          !path.startsWith("/auth") && 
          !path.startsWith("/terms") && 
          !path.startsWith("/privacy")
        ) {
          return <Redirect to="/onboarding" />;
        }
        
        return <Component />;
      }}
    </Route>
  );
}