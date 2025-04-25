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
import { SmilePlus, Award, Users, ChevronRight, X, Loader2 } from 'lucide-react';

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

  // Define state variables for different stages within the onboarding flow
  const [isRatingMore, setIsRatingMore] = useState(false);
  
  // Track which film IDs we've already shown to the user
  const [shownFilmIds, setShownFilmIds] = useState<number[]>([]);
  
  // Track how many batches we've seen
  const [batchOffset, setBatchOffset] = useState(0);

  // Fetch a large batch of films once
  const { data: allPopularFilms, isLoading: isLoadingAllFilms } = useQuery<Film[]>({
    queryKey: ['/api/onboarding/popular-films'],
    queryFn: async ({ signal }) => {
      // Request a large batch (100) of films that we can filter on the client side
      // We'll avoid using offset on server-side since it's not working as expected
      const url = `/api/onboarding/popular-films?count=100&seed=${Date.now()}`;
      console.log(`Fetching large batch of films`);
      
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error('Failed to fetch popular films');
      return response.json();
    },
    enabled: currentStep === 4, // Only fetch once when we reach the rating step
    staleTime: Infinity, // Cache permanently for this session
  });
  
  // Process films to get only the ones we haven't shown yet
  const [currentBatchFilms, setCurrentBatchFilms] = useState<Film[]>([]);
  const [isLoadingFilms, setIsLoadingFilms] = useState(true);
  
  // Ref to track if we've already processed this batch
  const processedBatchRef = React.useRef<number | null>(null);
  
  // Effect to process films when available or when batch offset changes
  useEffect(() => {
    // If we don't have films yet, wait for them
    if (!allPopularFilms || allPopularFilms.length === 0) {
      return;
    }
    
    // Skip if we've already processed this batch (prevents loop)
    if (processedBatchRef.current === batchOffset) {
      return;
    }
    
    // Mark this batch as being processed
    processedBatchRef.current = batchOffset;
    
    setIsLoadingFilms(true);
    
    // Create a function to select the next batch
    const selectNextBatch = () => {
      // Filter out any films we've already shown
      const unseenFilms = allPopularFilms.filter(film => !shownFilmIds.includes(film.id));
      console.log(`Found ${unseenFilms.length} unseen films out of ${allPopularFilms.length} total`);
      
      // Take the next batch (up to 12 films)
      const batchSize = 12;
      const nextBatch = unseenFilms.slice(0, batchSize);
      
      if (nextBatch.length > 0) {
        console.log(`Selected ${nextBatch.length} films for this batch. First film: ${nextBatch[0].title}`);
        
        // Update the list of shown film IDs (outside of render)
        const newShownIds = [...shownFilmIds, ...nextBatch.map(film => film.id)];
        setShownFilmIds(newShownIds);
        
        // Set the current batch
        return nextBatch;
      } else {
        console.warn("No more unseen films available!");
        // If we've shown all films, reset and start from the beginning
        setShownFilmIds([]);
        return allPopularFilms.slice(0, batchSize);
      }
    };
    
    // Execute the batch selection
    const selectedBatch = selectNextBatch();
    setCurrentBatchFilms(selectedBatch);
    
    // Complete the loading process
    setIsLoadingFilms(false);
  }, [allPopularFilms, batchOffset]);

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

  // Track how many batches of films the user has rated
  const [batchesRated, setBatchesRated] = useState(0);
  
  // Handle rating completion
  const handleRatingComplete = (ratings: FilmRating[]) => {
    setFilmsRated([...filmsRated, ...ratings]);
    
    // Add save ratings mutation
    saveRatingsMutation.mutate(ratings, {
      onSuccess: () => {
        // Increment the number of batches rated
        const newBatchCount = batchesRated + 1;
        setBatchesRated(newBatchCount);
        
        console.log("Rating batch completed:", newBatchCount);
        
        // Always show the "want to rate more" screen between batches, regardless of current stage
        // This ensures the user always gets a choice after completing a batch
        setIsRatingMore(false); // Reset this flag to show choice screen
        setShowMoreFilms(true); // Show the "want to rate more?" screen
      }
    });
  };

  // Handle completion
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/onboarding/complete');
      return await response.json();
    },
    onSuccess: (data) => {
      // Update the user data in the cache to reflect onboarding completion
      if (data.user) {
        // Directly update the cache with the user data from the response
        queryClient.setQueryData(['/api/user'], data.user);
      } else {
        // Fall back to invalidating the cache if user data isn't provided
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      }
      
      // Go to home page with a flag to indicate onboarding completion
      // Add show_questionnaire=true to ensure the questionnaire appears immediately
      // This gives users a chance to pick their current mood right away
      window.location.href = '/?just_completed_onboarding=true&show_questionnaire=true';
      
      // Don't need toast here as the redirect will cause a page refresh
      // and we'll lose the toast notification anyway
    },
    onError: (error) => {
      console.error('Error completing onboarding:', error);
      
      // Even if the API call fails, consider onboarding complete
      // Create a modified user object with needsOnboarding set to false
      if (user) {
        const updatedUser = {
          ...user,
          needsOnboarding: false
        };
        queryClient.setQueryData(['/api/user'], updatedUser);
      }
      
      // Still redirect the user to the main page with flag even if there's an error
      // Use the same consistent approach as in the success handler
      window.location.href = '/?just_completed_onboarding=true&show_questionnaire=true';
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
                films={currentBatchFilms || []}
                onRatingComplete={handleRatingComplete}
                isLoading={isLoadingFilms || isLoadingAllFilms}
              />
            </div>
          )}

          {/* Ask for More Ratings */}
          {currentStep === 4 && showMoreFilms && isRatingMore && !isLoadingFilms && !saveRatingsMutation.isPending && currentBatchFilms && currentBatchFilms.length > 0 ? (
            // When films are loaded and user chose to rate more, show the rating grid
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
                films={currentBatchFilms}
                onRatingComplete={handleRatingComplete}
                isLoading={isLoadingFilms || isLoadingAllFilms}
              />
            </div>
          ) : currentStep === 4 && showMoreFilms && (saveRatingsMutation.isPending || isLoadingFilms || isLoadingAllFilms) ? (
            // Show loading state when rating more films
            <div className="py-8 text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Loading more films to rate...</p>
              </div>
            </div>
          ) : currentStep === 4 && showMoreFilms ? (
            // Show the option to rate more films after completing first batch
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
                    // Clear current ratings for the next batch
                    setFilmsRated([]);
                    
                    // Increment the batch offset to get different films
                    // Each batch has 12 films, so offset increases by 12 each time
                    const newOffset = (batchOffset || 0) + 12;
                    setBatchOffset(newOffset);
                    
                    // Set flag to indicate we're rating more films, 
                    // which enables fetching new films
                    setIsRatingMore(true);
                    
                    console.log("Requesting more films with offset:", newOffset);
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
          ) : null}

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