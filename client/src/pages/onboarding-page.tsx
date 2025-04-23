import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import FilmRatingGrid from '../components/onboarding/FilmRatingGrid';
import OnboardingStepIndicator from '../components/onboarding/OnboardingStepIndicator';
import WelcomeComplete from '../components/onboarding/WelcomeComplete';
import UserPreferencesForm from '../components/onboarding/UserPreferencesForm';
import { SmilePlus, Award, Users, ChevronRight, X } from 'lucide-react';

interface ExplainerScreenData {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface Film {
  id: number;
  title: string;
  posterUrl: string;
  year: number;
  genres: string[];
  type: 'mainstream' | 'indie';
}

interface FilmRating {
  filmId: number;
  status: 'not_seen' | 'not_interested' | 'loved' | 'liked' | 'meh' | 'hated';
  rating?: number;
}

const OnboardingPage = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [filmsRated, setFilmsRated] = useState<FilmRating[]>([]);
  const [showMoreFilms, setShowMoreFilms] = useState(false);

  // Redirect to home if user is not logged in
  useEffect(() => {
    if (!user) {
      setLocation('/auth');
    }
  }, [user, setLocation]);

  // Track onboarding progress
  const trackProgressMutation = useMutation({
    mutationFn: async (step: string) => {
      await apiRequest('POST', '/api/onboarding/track-progress', { step });
    }
  });

  // Save ratings
  const saveRatingsMutation = useMutation({
    mutationFn: async (ratings: FilmRating[]) => {
      const response = await apiRequest('POST', '/api/onboarding/save-ratings', { ratings });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Preferences saved',
        description: "We'll use these to find great films for you",
      });
    },
    onError: (error) => {
      console.error('Error saving ratings:', error);
      toast({
        title: 'Failed to save preferences',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  });

  // Fetch popular films
  const { data: popularFilms, isLoading: isLoadingFilms } = useQuery<Film[]>({
    queryKey: ['/api/onboarding/popular-films'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/onboarding/popular-films', { signal });
      if (!response.ok) throw new Error('Failed to fetch popular films');
      return response.json();
    },
    enabled: currentStep === 4 || showMoreFilms, // Only fetch when we need films (step 4 after preferences)
  });

  // Explainer screens data
  const explainerScreens: ExplainerScreenData[] = [
    {
      title: 'Mood-based magic',
      description: "Get great movie recommendations that match how you're feeling - right now.",
      icon: <SmilePlus className="h-16 w-16 text-primary" />
    },
    {
      title: 'Hidden gems, uncovered',
      description: "Discover brilliant films you might have missed - from cult classics to indie darlings.",
      icon: <Award className="h-16 w-16 text-primary" />
    },
    {
      title: 'Harmony for group nights',
      description: "Watching together? We'll suggest films that work for everyone in the room.",
      icon: <Users className="h-16 w-16 text-primary" />
    }
  ];

  // Handle skip button
  const handleSkip = () => {
    // If we're on the film rating step, still save any ratings the user has made
    if (currentStep === 4 && filmsRated.length > 0) {
      saveRatingsMutation.mutate(filmsRated);
    }
    
    // Skip to completion
    setCurrentStep(5);
    trackProgressMutation.mutate('skipped');
  };

  // Handle next button
  const handleNext = () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    // Track progress for analytics
    trackProgressMutation.mutate(`step_${nextStep}`);
  };

  // Handle rating completion
  const handleRatingComplete = (ratings: FilmRating[]) => {
    setFilmsRated([...filmsRated, ...ratings]);
    saveRatingsMutation.mutate(ratings);
    
    // Ask if they want to rate more films
    if (!showMoreFilms) {
      setShowMoreFilms(true);
    } else {
      // If they've already done a second batch, go to completion
      setCurrentStep(5);
    }
  };

  // Handle completion
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/onboarding/complete');
      return await response.json();
    },
    onSuccess: () => {
      // Update the user data in the cache to reflect onboarding completion
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      // Go to recommendations
      setLocation('/');
      
      // Show welcome toast
      toast({
        title: 'Welcome to CineMatch!',
        description: 'Your personalized film recommendations are ready',
      });
    },
    onError: (error) => {
      console.error('Error completing onboarding:', error);
      // Still redirect the user to the main page even if there's an error
      setLocation('/');
      
      toast({
        title: 'Welcome to CineMatch!',
        description: 'Your personalized film recommendations are ready',
        variant: 'default',
      });
    }
  });

  const handleComplete = () => {
    // Mark onboarding as complete in the database
    completeOnboardingMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 relative">
          {/* Explainer Screens */}
          {currentStep < 3 && (
            <>
              <div className="absolute top-2 right-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSkip}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Skip</span>
                </Button>
              </div>
              
              <div className="flex flex-col items-center text-center py-6">
                <div className="mb-6 bg-primary/10 p-4 rounded-full">
                  {explainerScreens[currentStep].icon}
                </div>
                <h2 className="text-2xl font-bold mb-3">
                  {explainerScreens[currentStep].title}
                </h2>
                <p className="text-muted-foreground mb-10">
                  {explainerScreens[currentStep].description}
                </p>
                
                <OnboardingStepIndicator 
                  currentStep={currentStep} 
                  totalSteps={3}
                />
                
                <div className="w-full space-y-3 mt-6">
                  <Button 
                    className="w-full"
                    onClick={handleNext}
                    size="lg"
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleSkip}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* User Preferences Form */}
          {currentStep === 3 && (
            <div className="py-4">
              <UserPreferencesForm 
                onComplete={handleNext}
              />
            </div>
          )}

          {/* Film Rating Grid */}
          {currentStep === 4 && !showMoreFilms && (
            <div className="py-4">
              <div className="absolute top-2 right-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSkip}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Skip</span>
                </Button>
              </div>
              
              <FilmRatingGrid 
                films={popularFilms || []}
                onRatingComplete={handleRatingComplete}
                isLoading={isLoadingFilms}
              />
            </div>
          )}

          {/* Ask for More Ratings */}
          {currentStep === 4 && showMoreFilms && (
            <>
              {saveRatingsMutation.isPending ? (
                <div className="py-8 text-center">
                  <p>Saving your preferences...</p>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <h2 className="text-xl font-bold mb-4">
                    Want even better recommendations?
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Rate 10 more films to further improve your personalized picks
                  </p>
                  
                  <div className="space-y-3">
                    <Button 
                      className="w-full"
                      onClick={() => {
                        // Reset to fetch new films
                        queryClient.invalidateQueries({ queryKey: ['/api/onboarding/popular-films'] });
                        setShowMoreFilms(true);
                      }}
                    >
                      Yes, rate more films
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => setCurrentStep(5)}
                    >
                      No, I'm done
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Completion Screen */}
          {currentStep === 5 && (
            <WelcomeComplete 
              userName={user?.name || 'there'} 
              onComplete={handleComplete} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;