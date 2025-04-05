import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteProps } from "wouter";

export function ProtectedRoute({ 
  component: Component, 
  ...rest
}: RouteProps & { component: React.FC }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route {...rest}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  return (
    <Route
      {...rest}
      component={(params) => {
        if (!user) {
          return <Redirect to="/auth" />;
        }
        return <Component {...params} />;
      }}
    />
  );
}