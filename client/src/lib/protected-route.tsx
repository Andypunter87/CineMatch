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
        console.log("Protected route check - user:", JSON.stringify({
          id: user.id,
          name: user.name,
          needsOnboarding: user.needsOnboarding
        }));
        
        // If URL includes 'just_completed_onboarding', we know they just finished onboarding
        // so we should never redirect back to onboarding
        const justCompletedOnboarding = window.location.search.includes('just_completed_onboarding');
        
        // To prevent redirection when users are in active recommendations experience,
        // we check for additional conditions
        const inActiveRecommendationsFlow = 
          // Checking URL paths that are part of the recommendations flow
          window.location.pathname.includes('/recommendations') ||
          // If user has interacted with recommendations (liked/disliked/watchlisted)
          window.location.pathname === '/' && 
          (sessionStorage.getItem('hasInteractedWithRecommendations') === 'true');
          
        // Set a flag in sessionStorage when user interacts with recommendation cards
        if (window.location.pathname === '/' && !sessionStorage.getItem('hasInteractedWithRecommendations')) {
          // This will prevent future redirects to onboarding during this session
          sessionStorage.setItem('hasInteractedWithRecommendations', 'true');
        }
        
        if (
          !justCompletedOnboarding && // Skip redirect check if user just completed onboarding
          !inActiveRecommendationsFlow && // Skip redirect if user is in active recommendations flow
          user.needsOnboarding !== false && 
          path !== "/onboarding" && 
          !path.startsWith("/auth") && 
          !path.startsWith("/terms") && 
          !path.startsWith("/privacy")
        ) {
          console.log("Redirecting to onboarding");
          return <Redirect to="/onboarding" />;
        }
        
        return <Component />;
      }}
    </Route>
  );
}