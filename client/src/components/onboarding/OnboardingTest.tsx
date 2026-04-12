import React, { useState } from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useFilmRating } from '@/hooks/use-film-rating';
import { usePreferences } from '@/hooks/use-preferences';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, SaveIcon, RefreshCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserPreferences } from '@/lib/types/preferences';

export function OnboardingTest() {
  const {
    onboardingState,
    isLoadingState,
    updateState,
    completeOnboarding,
    isCompletingOnboarding,
    userPreferences,
    savePreferences,
    isSavingPreferences,
  } = useOnboarding();
  
  const filmRating = useFilmRating(true);
  const preferences = usePreferences(true);
  
  // Local state for preference inputs
  const [country, setCountry] = useState(userPreferences.country || '');
  const [streamingServices, setStreamingServices] = useState<string[]>(userPreferences.streamingServices || []);
  
  // List of available streaming services
  const availableStreamingServices = [
    { id: 'netflix', name: 'Netflix' },
    { id: 'amazonprime', name: 'Amazon Prime Video' },
    { id: 'hulu', name: 'Hulu' },
    { id: 'disneyplus', name: 'Disney+' },
    { id: 'appletv', name: 'Apple TV+' },
    { id: 'hbomax', name: 'HBO Max' },
    { id: 'paramountplus', name: 'Paramount+' },
    { id: 'peacock', name: 'Peacock' },
    { id: 'criterionchannel', name: 'Criterion Channel' },
  ];
  
  // Function to handle streaming service checkbox changes
  const handleStreamingServiceChange = (serviceId: string, checked: boolean) => {
    if (checked) {
      setStreamingServices([...streamingServices, serviceId]);
    } else {
      setStreamingServices(streamingServices.filter(id => id !== serviceId));
    }
  };
  
  // Function to save preferences
  const handleSavePreferences = () => {
    const preferencesData: UserPreferences = {
      country,
      streamingServices,
      lastUpdated: new Date().toISOString(),
    };
    
    savePreferences(preferencesData);
  };

  // Function to test updating the onboarding state
  const handleNextStep = () => {
    if (!onboardingState) return;
    
    const currentStep = onboardingState.currentStep;
    let nextStep: "intro" | "preferences" | "ratings" | "completed";
    
    switch (currentStep) {
      case "intro":
        nextStep = "preferences";
        break;
      case "preferences":
        nextStep = "ratings";
        break;
      case "ratings":
      case "completed":
        nextStep = "completed";
        break;
      default:
        nextStep = "intro";
    }
    
    updateState({
      currentStep: nextStep,
      progress: nextStep === "preferences" ? 33 : nextStep === "ratings" ? 66 : nextStep === "completed" ? 100 : 0
    });
  };

  return (
    <Tabs defaultValue="onboarding-state" className="w-full max-w-3xl mx-auto">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="onboarding-state">Onboarding State</TabsTrigger>
        <TabsTrigger value="preferences">User Preferences</TabsTrigger>
        <TabsTrigger value="film-ratings">Film Ratings</TabsTrigger>
      </TabsList>
      
      <TabsContent value="onboarding-state">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding State Test</CardTitle>
            <CardDescription>View and update the onboarding state</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingState ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border rounded-md">
                  <h3 className="font-semibold mb-2">Current Onboarding State:</h3>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(onboardingState, null, 2)}
                  </pre>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={handleNextStep} 
                    className="w-full"
                  >
                    Advance to Next Step
                  </Button>
                  
                  <Button 
                    onClick={() => completeOnboarding()} 
                    variant="secondary"
                    className="w-full"
                    disabled={isCompletingOnboarding}
                  >
                    {isCompletingOnboarding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      "Complete Onboarding"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="preferences">
        <Card>
          <CardHeader>
            <CardTitle>User Preferences Test</CardTitle>
            <CardDescription>
              Update user country and streaming services with Firestore persistence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input 
                  id="country" 
                  placeholder="Enter country code (e.g., us, uk, ca)" 
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Use a 2-letter country code (e.g., us, uk, ca)</p>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-3">
                <Label>Streaming Services</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableStreamingServices.map(service => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`streaming-${service.id}`} 
                        checked={streamingServices.includes(service.id)}
                        onCheckedChange={(checked) => 
                          handleStreamingServiceChange(service.id, checked === true)
                        }
                      />
                      <Label htmlFor={`streaming-${service.id}`}>{service.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 border rounded-md mt-4">
                <h3 className="font-semibold mb-2">Current User Preferences:</h3>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(userPreferences, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => preferences.syncPreferences()}
              disabled={preferences.isSaving}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Sync
            </Button>
            <Button 
              onClick={handleSavePreferences}
              disabled={isSavingPreferences}
            >
              {isSavingPreferences ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="film-ratings">
        <Card>
          <CardHeader>
            <CardTitle>Film Ratings Test</CardTitle>
            <CardDescription>
              Manage film ratings with Firestore persistence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-md">
                <h3 className="font-semibold mb-2">Current Ratings:</h3>
                {filmRating.isLoadingRatings ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filmRating.ratings.length ? (
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(filmRating.ratings, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No ratings found yet.</p>
                )}
              </div>
              
              <p className="text-sm">
                Note: To rate films, navigate to the /onboarding page and proceed to the ratings step.
                This test page merely demonstrates that the ratings are being stored in Firestore.
              </p>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => console.log("Ratings loaded from API:", filmRating.ratings)}
              >
                Log Current Ratings
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}