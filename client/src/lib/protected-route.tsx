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
        
        return <Component />;
      }}
    </Route>
  );
}