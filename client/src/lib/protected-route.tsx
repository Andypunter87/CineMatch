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
        
        // Several ways to bypass the onboarding redirect:
        // 1. URL explicitly includes 'just_completed_onboarding'
        // 2. URL includes 'bypass_onboarding=true' (for direct navigation like watchlist links)
        // 3. User is in an active recommendation flow
        // 4. User has explicitly completed onboarding according to their user record
        
        const urlParams = new URLSearchParams(window.location.search);
        const justCompletedOnboarding = urlParams.has('just_completed_onboarding');
        const bypassOnboarding = urlParams.has('bypass_onboarding');
        
        // Permanently complete onboarding if bypassing through watchlist
        // This will update the database on the next server interaction
        if (bypassOnboarding) {
          // Set local storage flag to remember this decision
          localStorage.setItem('onboardingCompleted', 'true');
        }
        
        // For active recommendation flows - detect if user is in the middle of using recommendations
        const inActiveRecommendationsFlow = 
          // Check URL paths that are part of the recommendations flow
          window.location.pathname.includes('/recommendations') ||
          // If user has interacted with recommendations (liked/disliked/watchlisted)
          window.location.pathname === '/' && 
          (sessionStorage.getItem('hasInteractedWithRecommendations') === 'true');
          
        // Set a flag in sessionStorage when user is on recommendations page
        if (window.location.pathname === '/' && !sessionStorage.getItem('hasInteractedWithRecommendations')) {
          sessionStorage.setItem('hasInteractedWithRecommendations', 'true');
        }
        
        // Check if user needs onboarding using onboardingState rather than needsOnboarding field
        const needsOnboarding = typeof user.onboardingState === 'string' 
          ? user.onboardingState !== 'completed'
          : true; // Default to true if field is missing
        
        // For debugging
        console.log("Onboarding check:", {
          needsOnboarding,
          justCompletedOnboarding,
          bypassOnboarding,
          inActiveRecommendationsFlow,
          localStorage: localStorage.getItem('onboardingCompleted'),
          sessionStorage: sessionStorage.getItem('hasInteractedWithRecommendations')
        });
        
        if (
          !justCompletedOnboarding && // Skip if just completed
          !bypassOnboarding && // Skip if explicitly bypassing (watchlist link)
          !inActiveRecommendationsFlow && // Skip if in active recommendations flow
          localStorage.getItem('onboardingCompleted') !== 'true' && // Skip if previously marked complete
          needsOnboarding && // Only redirect if still needs onboarding
          path !== "/onboarding" && // Don't redirect if already on onboarding page
          !path.startsWith("/auth") && // Don't redirect on auth pages
          !path.startsWith("/terms") && // Don't redirect on terms
          !path.startsWith("/privacy") // Don't redirect on privacy
        ) {
          console.log("Redirecting to onboarding");
          return <Redirect to="/onboarding" />;
        }
        
        return <Component />;
      }}
    </Route>
  );
}