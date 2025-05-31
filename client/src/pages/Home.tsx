import { useState, useEffect } from "react";
import Questionnaire from "@/components/Questionnaire";
import Recommendations from "@/components/Recommendations";
import { type RecommendationRequest, type Film } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useRecommendationEngine } from "@/hooks/use-recommendation-engine";
import { useLocation } from "wouter";

// Local storage key is now managed in the recommendation engine hook

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Check if user needs onboarding and redirect if necessary
  useEffect(() => {
    if (user) {
      console.log("Home - DETAILED onboarding check for user:", {
        id: user.id,
        onboardingState: user.onboardingState,
        onboardingStateType: typeof user.onboardingState,
        onboardingStateString: JSON.stringify(user.onboardingState)
      });
      
      const onboardingState = user.onboardingState as any;
      const needsOnboarding = !onboardingState?.completed;
      
      // Skip onboarding redirect if URL contains bypass parameters
      const urlParams = new URLSearchParams(window.location.search);
      const justCompletedOnboarding = urlParams.has('just_completed_onboarding');
      const bypassOnboarding = urlParams.has('bypass_onboarding') || justCompletedOnboarding;
      
      // Check if onboarding was previously completed for THIS specific user
      const userOnboardingKey = `onboardingCompleted_${user.id}`;
      const previouslyCompleted = localStorage.getItem(userOnboardingKey) === 'true';
      
      console.log("Home - onboarding decision factors:", {
        needsOnboarding,
        bypassOnboarding,
        previouslyCompleted,
        urlParams: window.location.search,
        localStorage_onboardingCompleted: localStorage.getItem('onboardingCompleted')
      });
      
      // If user just completed onboarding, mark it as complete in localStorage for this user
      if (justCompletedOnboarding) {
        localStorage.setItem(userOnboardingKey, 'true');
        console.log("Home - onboarding just completed, marked in localStorage for user", user.id);
      }
      
      if (needsOnboarding && !bypassOnboarding && !previouslyCompleted) {
        console.log("Home - REDIRECTING to onboarding");
        setLocation('/onboarding');
        return;
      }
      
      console.log("Home - STAYING on home page, reason:", {
        needsOnboarding: !needsOnboarding ? "already completed" : "needs onboarding",
        bypassOnboarding: bypassOnboarding ? "bypassed" : "not bypassed", 
        previouslyCompleted: previouslyCompleted ? "previously completed" : "not previously completed"
      });
    }
  }, [user, setLocation]);
  
  // Use our new recommendation engine hook that integrates with Firestore
  const engine = useRecommendationEngine();
  
  // Check for a "just_completed_onboarding" flag in the URL
  const justCompletedOnboarding = () => {
    const params = new URLSearchParams(window.location.search);
    return params.has('just_completed_onboarding');
  };
  
  // Check for show_questionnaire parameter in the URL
  const shouldShowQuestionnaire = () => {
    const params = new URLSearchParams(window.location.search);
    return params.has('show_questionnaire');
  };
  
  // Initialize questionnaire state
  const [showQuestionnaire, setShowQuestionnaire] = useState(() => {
    // If URL explicitly requests showing the questionnaire, honor that request
    if (shouldShowQuestionnaire()) {
      return true; // Always show questionnaire when requested via URL
    }
    
    // If user just completed onboarding but didn't request questionnaire, don't show it
    if (justCompletedOnboarding() && !shouldShowQuestionnaire()) {
      return false;
    }
    
    // Show questionnaire if no preferences exist
    return !engine.currentPreferences;
  });
  
  // Clean up URL parameters after component mounts
  useEffect(() => {
    // Check if we need to clean up any URL parameters
    if (justCompletedOnboarding() || shouldShowQuestionnaire()) {
      // Clean up the URL by removing all parameters 
      // This prevents unwanted behavior if page is refreshed
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    
    // Make sure Firestore data is loaded on component mount
    engine.ensureFirestoreDataLoaded();
  }, [engine]);
  
  // Helper function to wrap the engine's submitQuestionnaire function
  const handleSubmitQuestionnaire = (data: RecommendationRequest) => {
    engine.submitQuestionnaire(data);
    setShowQuestionnaire(false);
  };
  
  // Helper function to wrap the engine's reset function
  const handleReset = () => {
    engine.reset();
    setShowQuestionnaire(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-white">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
          The Right Movie For Right Now
        </h1>
        <p className="text-center text-gray-600 max-w-2xl mx-auto">
          Tell us about your mood and preferences, and we'll recommend the perfect films for you to watch.
        </p>
      </div>
      
      {/* Firebase Auth Status component removed */}
      
      <div className="max-w-4xl mx-auto">
        {showQuestionnaire ? (
          <>
            <Questionnaire onSubmit={handleSubmitQuestionnaire} />
            
            {user && user.streamingServices && user.streamingServices.length > 0 && (
              <div className="mt-6 text-center text-sm bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-2xl mx-auto shadow-[0_4px_14px_0_rgba(59,130,246,0.2)]">
                <span className="font-medium text-blue-700">Streaming match:</span> We'll search for films available on your preferred platforms 
                ({user.streamingServices.join(", ")}) in {user.country || "your country"}.
              </div>
            )}
          </>
        ) : (
          <>
            {engine.isShowingHistory && (
              <div className="mb-4 text-center text-sm bg-indigo-50 border border-indigo-100 rounded-lg p-3 max-w-2xl mx-auto shadow-[0_4px_14px_0_rgba(79,70,229,0.2)]">
                <span className="font-medium text-indigo-700">Welcome back!</span> We've loaded your previous recommendations.
              </div>
            )}
            {/* Only show recommendations if we have preferences */}
            {engine.currentPreferences ? (
              <Recommendations 
                recommendations={engine.recommendations} 
                isLoading={engine.isLoading} 
                preferences={engine.currentPreferences} 
                onReset={handleReset}
                onGenerateMore={engine.getMoreSuggestions}
                hasMoreToGenerate={engine.hasMoreToGenerate}
                onDisliked={engine.handleFilmDisliked}
              />
            ) : (
              // If we don't have preferences yet, show a simple loading state
              <div className="text-center py-10">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin h-10 w-10 rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-lg text-primary">Preparing your recommendations...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
