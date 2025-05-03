import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckIcon, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { useSafeFirestore } from '@/hooks/use-safe-firestore';

// Same streaming services and countries arrays as in profile-page
const streamingServices = [
  "Netflix",
  "Amazon Prime",
  "Disney+",
  "Hulu",
  "HBO Max",
  "Apple TV+",
  "Peacock",
  "Paramount+",
  "Crunchyroll",
  "MUBI",
  "Criterion Channel",
  "BBC iPlayer",
  "ITVx",
  "Channel 4",
];

const countries = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Egypt",
  "France",
  "Germany",
  "Japan",
  "Brazil",
  "Mexico",
  "India",
  "South Korea",
  "Italy",
  "Spain",
  "Netherlands",
  "Sweden",
];

// Map country names to country codes for the API
const countryCodeMap: Record<string, string> = {
  "United States": "us",
  "United Kingdom": "uk",
  "Canada": "ca",
  "Australia": "au",
  "Egypt": "eg",
  "France": "fr",
  "Germany": "de",
  "Japan": "jp",
  "Brazil": "br",
  "Mexico": "mx",
  "India": "in",
  "South Korea": "kr",
  "Italy": "it",
  "Spain": "es",
  "Netherlands": "nl",
  "Sweden": "se",
};

interface UserPreferencesFormProps {
  onComplete: () => void;
}

const UserPreferencesForm: React.FC<UserPreferencesFormProps> = ({ onComplete }) => {
  const { user, updateStreamingMutation, updateCountryMutation } = useAuth();
  const { toast } = useToast();
  const safeFirestore = useSafeFirestore();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    // Initialize with user's existing preferences if available
    if (user?.streamingServices) {
      setSelectedServices(user.streamingServices);
    }
    if (user?.country) {
      // Find the full country name
      const countryEntry = Object.entries(countryCodeMap).find(
        ([_, code]) => code === user.country
      );
      if (countryEntry) {
        setSelectedCountry(countryEntry[0]);
      }
    }
  }, [user]);

  const toggleService = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service) 
        : [...prev, service]
    );
    setValidationError('');
  };

  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setValidationError('');
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedCountry) {
      setValidationError('Please select your country');
      return;
    }
    
    if (selectedServices.length === 0) {
      setValidationError('Please select at least one streaming service');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Map the full country name to country code
      const countryCode = countryCodeMap[selectedCountry];
      
      // Convert streaming service names to lowercase codes (as used in the API)
      const servicesCodes = selectedServices.map(service => {
        return service.toLowerCase().replace(/\+/g, 'plus').replace(/\s/g, '');
      });
      
      // Log what we're trying to save
      console.log('Saving preferences:', {
        country: countryCode,
        streamingServices: servicesCodes
      });
      
      // For onboarding, use a different approach than the profile page
      // to ensure compatibility with the server schema validation
      if (window.location.pathname.includes('/onboarding')) {
        // Use /api/onboarding/preferences endpoint directly
        const response = await fetch('/api/onboarding/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            country: countryCode,
            streamingServices: servicesCodes,
            lastUpdated: new Date().toISOString()
          }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save preferences');
        }
        
        // Continue with onboarding flow immediately after API call succeeds
        // This ensures we don't delay the user experience due to Firebase issues
        
        // Proceed to next step immediately after server confirms 
        // the preferences have been saved
        console.log('Preferences saved successfully, continuing to next step');
        // This ensures we move to the next step regardless of what happens with Firestore
        onComplete();
        
        // Show informative message about cloud sync status
        toast({
          title: "Preferences saved",
          description: "Your preferences have been saved to the server",
          variant: "default"
        });
        
        // Try to save to Firestore in the background without awaiting
        // This ensures the UI flow is not blocked by any Firestore errors
        try {
          if (user?.id) {
            // Log user is attempting to save preferences
            console.log('Attempting to save preferences to Firestore for user ID:', user.id);
            
            // Create a document reference using the helper
            const prefsDocRef = safeFirestore.createDocRef('user_preferences', user.id);
            
            // Prepare data for Firestore
            const firestoreData = {
              userId: user.id,
              country: countryCode,
              streamingServices: servicesCodes,
              lastUpdated: new Date().toISOString()
            };
            
            // Save to Firestore in the background (don't await)
            safeFirestore.safeSetDoc(prefsDocRef, firestoreData, {
              retryWithAnonymousAuth: true,
              // Don't suppress errors so user gets feedback if cloud sync fails
              suppressErrors: false,
              userFacingErrorMessage: 'Cloud sync unavailable. Your preferences are saved on the server, but may not sync across devices.'
            }).then((success: boolean) => {
              if (success) {
                console.log('Preferences successfully saved to Firestore');
                // Optionally show a success toast for cloud sync
                toast({
                  title: "Cloud sync complete",
                  description: "Your preferences are now synced to the cloud",
                  variant: "default"
                });
              } else {
                console.warn('Failed to save preferences to Firestore, but this is non-blocking');
              }
            }).catch((error: Error) => {
              console.error('Firestore error (non-blocking):', error);
            });
          }
        } catch (firestoreError) {
          // Completely isolate any Firestore errors
          console.error('Error setting up Firestore save (non-blocking):', firestoreError);
        }
      } else {
        // For non-onboarding pages, use the mutations from useAuth
        await Promise.all([
          updateCountryMutation.mutateAsync(countryCode),
          updateStreamingMutation.mutateAsync(servicesCodes)
        ]);
      }
      
      // Track event
      trackEvent(AnalyticsEvents.ONBOARDING_PREFERENCES_SET, {
        user_id: user?.id,
        country: countryCode,
        streaming_services_count: servicesCodes.length,
        streaming_services: servicesCodes
      });
      
      // If we're not in onboarding, then call onComplete here
      // (for onboarding we call it immediately after the API success)
      if (!window.location.pathname.includes('/onboarding')) {
        onComplete();
      }
    } catch (error: unknown) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Error saving preferences',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Your Movie Preferences</h2>
      
      {/* Country Selection */}
      <div className="mb-8">
        <Label className="block mb-2 font-medium">Where are you watching from?</Label>
        <p className="text-sm text-muted-foreground mb-3">
          This helps us show you movies available in your country
        </p>
        <Select value={selectedCountry} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select your country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Streaming Services */}
      <div className="mb-8">
        <Label className="block mb-2 font-medium">Which streaming services do you use?</Label>
        <p className="text-sm text-muted-foreground mb-3">
          We'll only recommend films available on your services
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {streamingServices.map((service) => (
            <Badge
              key={service}
              variant={selectedServices.includes(service) ? "default" : "outline"}
              className={`cursor-pointer ${
                selectedServices.includes(service) ? "bg-primary" : ""
              }`}
              onClick={() => toggleService(service)}
            >
              {selectedServices.includes(service) && (
                <CheckIcon className="mr-1 h-3 w-3" />
              )}
              {service}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Validation Error */}
      {validationError && (
        <p className="text-destructive text-sm mb-4">{validationError}</p>
      )}
      
      {/* Submit Button */}
      <Button 
        className="w-full mt-2" 
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Continue'}
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

export default UserPreferencesForm;