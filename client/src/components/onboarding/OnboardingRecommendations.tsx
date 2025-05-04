import { useState, useEffect } from "react";
import { type Film, type RecommendationRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import FilmCard from "../FilmCard";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

// Extended type for recommendation context with onboarding flag
interface OnboardingAwareRecommendationContext extends RecommendationRequest {
  isOnboarding?: boolean;
}

interface OnboardingRecommendationsProps {
  recommendations: Film[];
  isLoading: boolean;
  preferences: OnboardingAwareRecommendationContext;
  onReset: () => void;
  onDisliked?: (filmId: number) => void;
  onComplete?: () => void;
}

export default function OnboardingRecommendations({ 
  recommendations, 
  isLoading, 
  preferences, 
  onReset,
  onDisliked,
  onComplete
}: OnboardingRecommendationsProps) {
  const [isLongLoading, setIsLongLoading] = useState(false);
  
  // Set up a timer to change the loading message after 7 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLoading) {
      setIsLongLoading(false);
      timer = setTimeout(() => {
        setIsLongLoading(true);
      }, 7000); // 7 seconds
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  // Create an enhanced preferences object with the isOnboarding flag
  const onboardingContext = {
    ...preferences,
    isOnboarding: true
  };

  return (
    <section className="py-6 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your First Recommendations</h2>
          <p className="text-center text-gray-600 max-w-2xl">
            Let us know what you think about these films. Your feedback helps us learn your taste.
          </p>
        </div>

        {isLoading ? (
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white py-5 px-8 rounded-lg border shadow-md flex items-center space-x-3 z-10">
                <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                <p className="text-gray-800">
                  {isLongLoading
                    ? "Nearly there! Thanks for waiting..."
                    : "Creating your first personalized film recommendations..."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-8 filter blur-sm">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-96 bg-white rounded-lg overflow-hidden shadow-lg border border-blue-100">
                  <Skeleton className="w-full h-64 bg-blue-100" />
                  <div className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2 bg-blue-100" />
                    <Skeleton className="h-4 w-1/2 mb-4 bg-blue-100" />
                    <Skeleton className="h-16 w-full bg-blue-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white p-8 rounded-lg text-center border border-blue-100 shadow-md">
            <div className="text-primary opacity-40 text-5xl mb-4">¯\_(ツ)_/¯</div>
            <p className="text-xl text-gray-800 font-medium">No recommendations available yet.</p>
            <p className="mt-2 text-gray-600 mb-4">Let's try with different settings.</p>
            <Button onClick={onReset} variant="secondary" className="mt-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try different preferences
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-8">
              {recommendations.map((film) => (
                <FilmCard 
                  key={film.id} 
                  film={film} 
                  recommendationContext={onboardingContext}
                  onDisliked={onDisliked}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {!isLoading && recommendations.length > 0 && onComplete && (
            <Button
              onClick={onComplete}
              variant="default"
              size="lg"
              className="px-8 py-3 bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors"
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}