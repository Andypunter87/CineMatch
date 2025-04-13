import { useState, useEffect } from "react";
import { useNavigate } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LucideSmile, Award, Users, Star } from "lucide-react";
import { FilmRatingGrid } from "@/components/onboarding/FilmRatingGrid";
import { OnboardingStepIndicator } from "@/components/onboarding/OnboardingStepIndicator";
import { WelcomeComplete } from "@/components/onboarding/WelcomeComplete";
import { useToast } from "@/hooks/use-toast";

// Step content for the onboarding process
const steps = [
  {
    title: "Mood-based magic",
    description: "Get great movie recommendations that match how you're feeling—right now.",
    icon: <LucideSmile className="h-20 w-20 text-primary mb-4" />,
    key: "mood"
  },
  {
    title: "Hidden gems, uncovered",
    description: "Discover brilliant films you might have missed—from cult classics to indie darlings.",
    icon: <Award className="h-20 w-20 text-primary mb-4" />,
    key: "hidden"
  },
  {
    title: "Harmony for group nights",
    description: "Watching together? We'll suggest films that work for everyone in the room.",
    icon: <Users className="h-20 w-20 text-primary mb-4" />,
    key: "group"
  },
  {
    title: "Rate some movies",
    description: "Tap to tell us what you've watched and enjoyed.",
    icon: <Star className="h-20 w-20 text-primary mb-4" />,
    key: "rate"
  }
];

const OnboardingPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedRating, setCompletedRating] = useState(false);
  const [showMoreRatings, setShowMoreRatings] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // If user is not logged in, redirect to auth page
    if (user === null) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Data fetching for popular films to rate
  const { data: popularFilms, isLoading: filmsLoading } = useQuery({
    queryKey: ["/api/onboarding/popular-films"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/onboarding/popular-films");
      return await res.json();
    },
    enabled: currentStep === 3 // Only fetch when on the rating step
  });

  // Handle submission of ratings
  const ratingMutation = useMutation({
    mutationFn: async (ratings: any[]) => {
      const res = await apiRequest("POST", "/api/onboarding/save-ratings", { ratings });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Ratings saved!",
        description: "Your preferences have been recorded successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      
      if (!showMoreRatings) {
        setShowMoreRatings(true);
      } else {
        setCompletedRating(true);
        // Move to completion step
        setCurrentStep(4);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to save ratings",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  });

  // Track onboarding progress
  const trackProgressMutation = useMutation({
    mutationFn: async (step: string) => {
      await apiRequest("POST", "/api/onboarding/track-progress", { step });
    }
  });

  const handleNext = () => {
    if (currentStep < steps.length) {
      // Track the completion of the current step
      trackProgressMutation.mutate(steps[currentStep].key);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    // If on the rating step, mark as completed
    if (currentStep === 3) {
      setCompletedRating(true);
      setCurrentStep(4); // Move to completion
    } else if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Skip the whole onboarding
      navigate("/");
    }
  };

  const handleComplete = () => {
    navigate("/");
  };

  // Handle ratings submission
  const handleRatingsSubmitted = (ratings: any[]) => {
    if (ratings.length > 0) {
      ratingMutation.mutate(ratings);
    } else {
      toast({
        title: "No ratings provided",
        description: "Please rate at least one film to continue",
        variant: "default"
      });
    }
  };

  if (user === null) {
    return null; // Don't render anything while redirecting
  }

  // Show the completion screen
  if (currentStep === 4 || completedRating) {
    return (
      <WelcomeComplete 
        userName={user.name || user.username} 
        onComplete={handleComplete} 
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{steps[currentStep].title}</CardTitle>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center text-center pb-6">
          {currentStep < 3 ? (
            // Feature explanation steps
            <>
              {steps[currentStep].icon}
              <p className="text-muted-foreground">{steps[currentStep].description}</p>
            </>
          ) : (
            // Rating step
            <>
              <p className="text-muted-foreground mb-6">{steps[currentStep].description}</p>
              {filmsLoading ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading films...</p>
                </div>
              ) : (
                <FilmRatingGrid 
                  films={popularFilms || []} 
                  onSubmit={handleRatingsSubmitted}
                  isSubmitting={ratingMutation.isPending}
                  showMorePrompt={showMoreRatings}
                />
              )}
            </>
          )}
          
          <OnboardingStepIndicator 
            currentStep={currentStep} 
            totalSteps={4} 
          />
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          {currentStep < 3 && (
            <Button 
              className="w-full" 
              onClick={handleNext}
            >
              Next
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={handleSkip}
          >
            {currentStep === 3 ? "I'll do this later" : "Skip"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OnboardingPage;