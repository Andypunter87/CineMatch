import React from 'react';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function OnboardingTest() {
  const {
    onboardingState,
    isLoadingState,
    updateState,
    completeOnboarding,
    isCompletingOnboarding,
  } = useOnboarding();

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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Onboarding Test</CardTitle>
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
  );
}