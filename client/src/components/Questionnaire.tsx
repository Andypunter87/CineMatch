import { useState, useEffect } from "react";
import { type RecommendationRequest } from "@shared/schema";

// Type definition for time of day options
type TimeOfDay = "weekday" | "weekend" | "late" | "morning";
// Type definition for runtime options
type RuntimeOption = "short" | "medium" | "long";

import { 
  Home as HomeIcon, 
  Globe, 
  Heart, 
  Users, 
  Calendar, 
  Moon, 
  Sun,
  Clock,
  Mail,
  PlusCircle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface QuestionnaireProps {
  onSubmit: (data: RecommendationRequest) => void;
}

export default function Questionnaire({ onSubmit }: QuestionnaireProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [location, setLocation] = useState<RecommendationRequest["location"] | "">("");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay[]>([]);
  const [mood, setMood] = useState<RecommendationRequest["mood"] | "">("");
  const [runtime, setRuntime] = useState<RuntimeOption[]>([]);
  const [friendEmails, setFriendEmails] = useState<string[]>([]);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const { toast } = useToast();

  // Check if we should show the friend invitation step (for "friends" or "date" location)
  const shouldShowFriendStep = location === "friends" || location === "date";
  
  // Effect to run when location changes - if it's not a social option, clear friend emails
  useEffect(() => {
    if (!shouldShowFriendStep) {
      setFriendEmails([]);
    }
  }, [location, shouldShowFriendStep]);
  
  // Friend invitation response type
  interface FriendInviteResponse {
    id?: number;
    directAdd?: boolean;
    message?: string;
    emailSent?: boolean;
    friend?: {
      id: number;
      name: string;
      email: string;
    };
  }

  // Function to handle friend invitation
  const friendInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/friend-requests", { email });
      const data: FriendInviteResponse = await response.json();
      return data;
    },
    onSuccess: (data: FriendInviteResponse) => {
      toast({
        title: data.directAdd 
          ? "Friend added!" 
          : "Invitation sent!",
        description: data.directAdd 
          ? `${data.friend?.name || data.friend?.email} has been added to your friends.` 
          : `We'll notify you when they join.`,
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Handle adding a friend email
  const addFriendEmail = () => {
    if (!newFriendEmail || !newFriendEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    if (friendEmails.includes(newFriendEmail)) {
      toast({
        title: "Duplicate email",
        description: "This email is already in your invite list",
        variant: "destructive"
      });
      return;
    }
    
    setFriendEmails(prev => [...prev, newFriendEmail]);
    setNewFriendEmail("");
  };
  
  // Remove a friend email
  const removeFriendEmail = (email: string) => {
    setFriendEmails(prev => prev.filter(e => e !== email));
  };
  
  // Send invitations to all emails
  const sendInvitations = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "You need to be logged in to invite friends",
        variant: "destructive"
      });
      return;
    }
    
    if (friendEmails.length === 0) return;
    
    setIsSendingInvites(true);
    
    try {
      // Send invitations sequentially
      for (const email of friendEmails) {
        await friendInviteMutation.mutateAsync(email);
      }
      
      // Go to next step after sending invitations
      goToNextStep();
    } catch (error) {
      console.error("Error sending invitations:", error);
    } finally {
      setIsSendingInvites(false);
    }
  };

  const goToNextStep = () => {
    // Determine if we should show friend step
    if (currentStep === 2 && shouldShowFriendStep) {
      // If user selected "friends" or "date" location, add friend collection step
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 3 && shouldShowFriendStep) {
      // If we're on the standard step 3 (time selection) and coming from friend step
      setCurrentStep(currentStep + 2);
    } else if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      // If we're on step 5 and shouldShowFriendStep, go back to step 3 (skipping friend step when going backwards)
      if (currentStep === 5 && shouldShowFriendStep) {
        setCurrentStep(3);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const submitQuestionnaire = () => {
    if (!location || timeOfDay.length === 0 || !mood) {
      return;
    }

    setIsSubmitting(true);
    
    // Include the user's country for better localized recommendations
    const requestData: RecommendationRequest = {
      location,
      timeOfDay,
      mood,
      runtime: runtime.length > 0 ? runtime : undefined, // Only include if selected
      country: user?.country || undefined,
      // Streaming services are now handled in the Home component
      // to allow for more flexibility and automatic updates
    };
    
    // Track questionnaire completion event
    trackEvent(AnalyticsEvents.QUESTIONNAIRE_COMPLETED, {
      location: location,
      time_count: timeOfDay.length,
      time_options: timeOfDay,
      mood: mood,
      runtime: runtime.length > 0 ? runtime.join(',') : 'not_selected',
      runtime_count: runtime.length,
      is_logged_in: !!user,
      has_country: !!user?.country
    });
    
    // Simulate a slight delay for better user experience
    setTimeout(() => {
      onSubmit(requestData);
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <section className="flex flex-col justify-center items-center py-4 px-4 md:px-8 min-h-[75vh]">
      <div className="max-w-2xl w-full">
        <div className="mb-4 flex justify-center">
          <div className="flex space-x-2">
            <div className={`w-3 h-3 rounded-full ${currentStep >= 1 ? 'bg-primary' : 'bg-gray-600'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-600'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-600'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep >= 4 ? 'bg-primary' : 'bg-gray-600'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep >= 5 ? 'bg-primary' : 'bg-gray-600'}`}></div>
          </div>
        </div>

        <Card className="bg-white border border-blue-100 shadow-[0_4px_14px_0_rgba(59,130,246,0.2)]">
          <CardContent className="p-6">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div>
                <p className="text-lg text-center mb-8">Answer a few questions and we'll recommend films that match your current situation and mood.</p>
                <div className="flex justify-center">
                  <Button 
                    onClick={goToNextStep} 
                    className="px-5 py-4 sm:px-8 sm:py-6 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 rounded-lg font-medium text-white transition-all transform hover:scale-105"
                  >
                    Let's Begin
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Where are you watching?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="location-option">
                    <input 
                      type="radio" 
                      id="location-home" 
                      name="location" 
                      value="home" 
                      className="hidden" 
                      checked={location === "home"}
                      onChange={() => {
                        setLocation("home");
                        trackEvent(AnalyticsEvents.LOCATION_SELECTED, { location: "home" });
                      }}
                    />
                    <label 
                      htmlFor="location-home" 
                      className={`flex flex-col items-center p-4 border-2 ${location === "home" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setLocation("home");
                        trackEvent(AnalyticsEvents.LOCATION_SELECTED, { location: "home" });
                      }}
                    >
                      <HomeIcon className="w-8 h-8 mb-2 text-gray-600" />
                      <span>At Home</span>
                      <span className="text-xs text-gray-500 mt-1">Cozy movie night</span>
                    </label>
                  </div>

                  <div className="location-option">
                    <input 
                      type="radio" 
                      id="location-travel" 
                      name="location" 
                      value="travel" 
                      className="hidden" 
                      checked={location === "travel"}
                      onChange={() => {
                        setLocation("travel");
                        trackEvent(AnalyticsEvents.LOCATION_SELECTED, { location: "travel" });
                      }}
                    />
                    <label 
                      htmlFor="location-travel" 
                      className={`flex flex-col items-center p-4 border-2 ${location === "travel" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setLocation("travel");
                        trackEvent(AnalyticsEvents.LOCATION_SELECTED, { location: "travel" });
                      }}
                    >
                      <Globe className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Traveling</span>
                      <span className="text-xs text-gray-500 mt-1">On the go entertainment</span>
                    </label>
                  </div>

                  <div className="location-option">
                    <input 
                      type="radio" 
                      id="location-date" 
                      name="location" 
                      value="date" 
                      className="hidden" 
                      checked={location === "date"}
                      onChange={() => {
                        setLocation("date");
                        trackEvent(AnalyticsEvents.LOCATION_SELECTED, { location: "date" });
                      }}
                    />
                    <label 
                      htmlFor="location-date" 
                      className={`flex flex-col items-center p-4 border-2 ${location === "date" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setLocation("date");
                        trackEvent(AnalyticsEvents.LOCATION_SELECTED, { location: "date" });
                      }}
                    >
                      <Heart className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Date Night</span>
                      <span className="text-xs text-gray-500 mt-1">Romantic evening</span>
                    </label>
                  </div>

                  <div className="location-option">
                    <input 
                      type="radio" 
                      id="location-friends" 
                      name="location" 
                      value="friends" 
                      className="hidden" 
                      checked={location === "friends"}
                      onChange={() => {
                        setLocation("friends");
                        trackEvent(AnalyticsEvents.LOCATION_SELECTED, { location: "friends" });
                      }}
                    />
                    <label 
                      htmlFor="location-friends" 
                      className={`flex flex-col items-center p-4 border-2 ${location === "friends" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setLocation("friends");
                        trackEvent(AnalyticsEvents.LOCATION_SELECTED, { location: "friends" });
                      }}
                    >
                      <Users className="w-8 h-8 mb-2 text-gray-600" />
                      <span>With Friends</span>
                      <span className="text-xs text-gray-500 mt-1">Group viewing party</span>
                    </label>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button 
                    onClick={goToPrevStep} 
                    variant="outline"
                    className="px-4 py-1.5 sm:px-6 sm:py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm sm:text-base h-auto"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={goToNextStep} 
                    className="px-4 py-1.5 sm:px-6 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 rounded-lg transition-colors text-sm sm:text-base h-auto"
                    disabled={!location}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Friend Invitation Step (special step between location and time for social options) */}
            {currentStep === 3 && shouldShowFriendStep && (
              <div>
                <h2 className="text-2xl font-bold mb-2">Invite Friends to Watch</h2>
                <p className="text-gray-600 mb-6">
                  {location === "date" 
                    ? "Invite your date to join the movie selection process." 
                    : "Invite friends to get recommendations everyone will enjoy."}
                </p>
                
                {!user && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-700">
                      <strong>Login required:</strong> You need to be logged in to invite friends. 
                      You can continue without inviting or <a href="/auth" className="underline text-blue-600">login here</a>.
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Email input */}
                  <div className="flex items-center space-x-2">
                    <Input
                      type="email"
                      placeholder="Enter friend's email address"
                      value={newFriendEmail}
                      onChange={(e) => setNewFriendEmail(e.target.value)}
                      className="flex-1"
                      disabled={!user || isSendingInvites}
                    />
                    <Button
                      onClick={addFriendEmail}
                      disabled={!user || !newFriendEmail || isSendingInvites}
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  {/* Friend email list */}
                  {friendEmails.length > 0 && (
                    <div className="border border-blue-100 rounded-lg p-4 bg-blue-50">
                      <h3 className="text-sm font-medium mb-2 text-blue-800">Friends to invite:</h3>
                      <ul className="space-y-2">
                        {friendEmails.map((email) => (
                          <li key={email} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
                            <span className="text-sm flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-blue-500" /> 
                              {email}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFriendEmail(email)}
                              disabled={isSendingInvites}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="mt-8 flex justify-between">
                  <Button 
                    onClick={goToPrevStep} 
                    variant="outline"
                    className="px-4 py-1.5 sm:px-6 sm:py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm sm:text-base h-auto"
                    disabled={isSendingInvites}
                  >
                    Back
                  </Button>
                  
                  {friendEmails.length > 0 && user ? (
                    <Button 
                      onClick={sendInvitations} 
                      className="px-4 py-1.5 sm:px-6 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 rounded-lg transition-colors text-sm sm:text-base h-auto"
                      disabled={isSendingInvites}
                    >
                      {isSendingInvites ? (
                        <span className="flex items-center">
                          <Loader2 className="animate-spin mr-2 h-4 w-4" />
                          <span className="whitespace-nowrap">Sending Invites...</span>
                        </span>
                      ) : (
                        <span>Send Invitations &amp; Continue</span>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={goToNextStep} 
                      className="px-4 py-1.5 sm:px-6 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 rounded-lg transition-colors text-sm sm:text-base h-auto"
                      disabled={isSendingInvites}
                    >
                      Skip &amp; Continue
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 3: Time */}
            {currentStep === 3 && !shouldShowFriendStep && (
              <div>
                <h2 className="text-2xl font-bold mb-6">When are you watching?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="time-option">
                    <input 
                      type="checkbox" 
                      id="time-weekday" 
                      name="time" 
                      value="weekday" 
                      className="hidden" 
                      checked={timeOfDay.includes("weekday")}
                      onChange={() => {
                        const newTimeOfDay = timeOfDay.includes("weekday") 
                          ? timeOfDay.filter(t => t !== "weekday")
                          : [...timeOfDay, "weekday"] as TimeOfDay[];
                        
                        setTimeOfDay(newTimeOfDay);
                        trackEvent(AnalyticsEvents.TIME_SELECTED, { 
                          time: "weekday", 
                          action: timeOfDay.includes("weekday") ? "removed" : "added",
                          count: newTimeOfDay.length
                        });
                      }}
                    />
                    <label 
                      htmlFor="time-weekday" 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("weekday") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Calendar className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Weekday Evening</span>
                      <span className="text-xs text-gray-500 mt-1">After work unwinding</span>
                    </label>
                  </div>

                  <div className="time-option">
                    <input 
                      type="checkbox" 
                      id="time-weekend" 
                      name="time" 
                      value="weekend" 
                      className="hidden" 
                      checked={timeOfDay.includes("weekend")}
                      onChange={() => {
                        const newTimeOfDay = timeOfDay.includes("weekend") 
                          ? timeOfDay.filter(t => t !== "weekend")
                          : [...timeOfDay, "weekend"] as TimeOfDay[];
                        
                        setTimeOfDay(newTimeOfDay);
                        trackEvent(AnalyticsEvents.TIME_SELECTED, { 
                          time: "weekend", 
                          action: timeOfDay.includes("weekend") ? "removed" : "added",
                          count: newTimeOfDay.length
                        });
                      }}
                    />
                    <label 
                      htmlFor="time-weekend" 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("weekend") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Calendar className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Weekend</span>
                      <span className="text-xs text-gray-500 mt-1">Relaxed leisure time</span>
                    </label>
                  </div>

                  <div className="time-option">
                    <input 
                      type="checkbox" 
                      id="time-late" 
                      name="time" 
                      value="late" 
                      className="hidden" 
                      checked={timeOfDay.includes("late")}
                      onChange={() => {
                        const newTimeOfDay = timeOfDay.includes("late") 
                          ? timeOfDay.filter(t => t !== "late")
                          : [...timeOfDay, "late"] as TimeOfDay[];
                        
                        setTimeOfDay(newTimeOfDay);
                        trackEvent(AnalyticsEvents.TIME_SELECTED, { 
                          time: "late", 
                          action: timeOfDay.includes("late") ? "removed" : "added",
                          count: newTimeOfDay.length
                        });
                      }}
                    />
                    <label 
                      htmlFor="time-late" 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("late") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Moon className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Late Night</span>
                      <span className="text-xs text-gray-500 mt-1">Midnight viewing</span>
                    </label>
                  </div>

                  <div className="time-option">
                    <input 
                      type="checkbox" 
                      id="time-morning" 
                      name="time" 
                      value="morning" 
                      className="hidden" 
                      checked={timeOfDay.includes("morning")}
                      onChange={() => {
                        const newTimeOfDay = timeOfDay.includes("morning") 
                          ? timeOfDay.filter(t => t !== "morning")
                          : [...timeOfDay, "morning"] as TimeOfDay[];
                        
                        setTimeOfDay(newTimeOfDay);
                        trackEvent(AnalyticsEvents.TIME_SELECTED, { 
                          time: "morning", 
                          action: timeOfDay.includes("morning") ? "removed" : "added",
                          count: newTimeOfDay.length
                        });
                      }}
                    />
                    <label 
                      htmlFor="time-morning" 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("morning") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Sun className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Morning/Daytime</span>
                      <span className="text-xs text-gray-500 mt-1">Bright hours watch</span>
                    </label>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button 
                    onClick={goToPrevStep} 
                    variant="outline"
                    className="px-4 py-1.5 sm:px-6 sm:py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm sm:text-base h-auto"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={goToNextStep} 
                    className="px-4 py-1.5 sm:px-6 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 rounded-lg transition-colors text-sm sm:text-base h-auto"
                    disabled={timeOfDay.length === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Runtime */}
            {currentStep === 4 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">How long of a movie are you looking for?</h2>
                <p className="text-sm text-gray-600 mb-4">You can select multiple options - this will help us find movies that match any of your preferred lengths.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="runtime-option">
                    <input 
                      type="checkbox" 
                      id="runtime-short" 
                      name="runtime" 
                      value="short" 
                      className="hidden" 
                      checked={runtime.includes("short")}
                      onChange={() => {
                        const newRuntime = runtime.includes("short") 
                          ? runtime.filter(r => r !== "short")
                          : [...runtime, "short"] as RuntimeOption[];
                        setRuntime(newRuntime);
                        trackEvent(AnalyticsEvents.RUNTIME_SELECTED, { 
                          runtime: "short",
                          action: runtime.includes("short") ? "removed" : "added",
                          count: newRuntime.length
                        });
                      }}
                    />
                    <label 
                      htmlFor="runtime-short" 
                      className={`flex flex-col items-center p-4 border-2 ${runtime.includes("short") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Clock className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Under 90 mins</span>
                      <span className="text-xs text-gray-500 mt-1">Quick viewing</span>
                    </label>
                  </div>

                  <div className="runtime-option">
                    <input 
                      type="checkbox" 
                      id="runtime-medium" 
                      name="runtime" 
                      value="medium" 
                      className="hidden" 
                      checked={runtime.includes("medium")}
                      onChange={() => {
                        const newRuntime = runtime.includes("medium") 
                          ? runtime.filter(r => r !== "medium")
                          : [...runtime, "medium"] as RuntimeOption[];
                        setRuntime(newRuntime);
                        trackEvent(AnalyticsEvents.RUNTIME_SELECTED, { 
                          runtime: "medium",
                          action: runtime.includes("medium") ? "removed" : "added",
                          count: newRuntime.length
                        });
                      }}
                    />
                    <label 
                      htmlFor="runtime-medium" 
                      className={`flex flex-col items-center p-4 border-2 ${runtime.includes("medium") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Clock className="w-8 h-8 mb-2 text-gray-600" />
                      <span>90-120 mins</span>
                      <span className="text-xs text-gray-500 mt-1">Standard length</span>
                    </label>
                  </div>

                  <div className="runtime-option">
                    <input 
                      type="checkbox" 
                      id="runtime-long" 
                      name="runtime" 
                      value="long" 
                      className="hidden" 
                      checked={runtime.includes("long")}
                      onChange={() => {
                        const newRuntime = runtime.includes("long") 
                          ? runtime.filter(r => r !== "long")
                          : [...runtime, "long"] as RuntimeOption[];
                        setRuntime(newRuntime);
                        trackEvent(AnalyticsEvents.RUNTIME_SELECTED, { 
                          runtime: "long",
                          action: runtime.includes("long") ? "removed" : "added",
                          count: newRuntime.length
                        });
                      }}
                    />
                    <label 
                      htmlFor="runtime-long" 
                      className={`flex flex-col items-center p-4 border-2 ${runtime.includes("long") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Clock className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Over 120 mins</span>
                      <span className="text-xs text-gray-500 mt-1">Epic storytelling</span>
                    </label>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button 
                    onClick={goToPrevStep} 
                    variant="outline"
                    className="px-4 py-1.5 sm:px-6 sm:py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm sm:text-base h-auto"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={goToNextStep} 
                    className="px-4 py-1.5 sm:px-6 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 rounded-lg transition-colors text-sm sm:text-base h-auto"
                    disabled={runtime.length === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Mood */}
            {currentStep === 5 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">What are you in the mood for?</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="mood-option">
                    <input 
                      type="radio" 
                      id="mood-laugh" 
                      name="mood" 
                      value="laugh" 
                      className="hidden" 
                      checked={mood === "laugh"}
                      onChange={() => {
                        setMood("laugh");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "laugh" });
                      }}
                    />
                    <label 
                      htmlFor="mood-laugh" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "laugh" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setMood("laugh");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "laugh" });
                      }}
                    >
                      <span className="text-2xl mb-2">😂</span>
                      <span>Laugh</span>
                      <span className="text-xs text-gray-500 mt-1">Comedy & fun</span>
                    </label>
                  </div>

                  <div className="mood-option">
                    <input 
                      type="radio" 
                      id="mood-think" 
                      name="mood" 
                      value="think" 
                      className="hidden" 
                      checked={mood === "think"}
                      onChange={() => {
                        setMood("think");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "think" });
                      }}
                    />
                    <label 
                      htmlFor="mood-think" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "think" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setMood("think");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "think" });
                      }}
                    >
                      <span className="text-2xl mb-2">🤔</span>
                      <span>Think</span>
                      <span className="text-xs text-gray-500 mt-1">Thought-provoking</span>
                    </label>
                  </div>

                  <div className="mood-option">
                    <input 
                      type="radio" 
                      id="mood-cry" 
                      name="mood" 
                      value="cry" 
                      className="hidden" 
                      checked={mood === "cry"}
                      onChange={() => {
                        setMood("cry");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "cry" });
                      }}
                    />
                    <label 
                      htmlFor="mood-cry" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "cry" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setMood("cry");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "cry" });
                      }}
                    >
                      <span className="text-2xl mb-2">😢</span>
                      <span>Cry</span>
                      <span className="text-xs text-gray-500 mt-1">Emotional drama</span>
                    </label>
                  </div>

                  <div className="mood-option">
                    <input 
                      type="radio" 
                      id="mood-thrill" 
                      name="mood" 
                      value="thrill" 
                      className="hidden" 
                      checked={mood === "thrill"}
                      onChange={() => {
                        setMood("thrill");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "thrill" });
                      }}
                    />
                    <label 
                      htmlFor="mood-thrill" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "thrill" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setMood("thrill");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "thrill" });
                      }}
                    >
                      <span className="text-2xl mb-2">😱</span>
                      <span>Thrill</span>
                      <span className="text-xs text-gray-500 mt-1">Suspense & action</span>
                    </label>
                  </div>

                  <div className="mood-option">
                    <input 
                      type="radio" 
                      id="mood-escape" 
                      name="mood" 
                      value="escape" 
                      className="hidden" 
                      checked={mood === "escape"}
                      onChange={() => {
                        setMood("escape");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "escape" });
                      }}
                    />
                    <label 
                      htmlFor="mood-escape" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "escape" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setMood("escape");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "escape" });
                      }}
                    >
                      <span className="text-2xl mb-2">✨</span>
                      <span>Escape</span>
                      <span className="text-xs text-gray-500 mt-1">Fantasy & adventure</span>
                    </label>
                  </div>

                  <div className="mood-option">
                    <input 
                      type="radio" 
                      id="mood-inspire" 
                      name="mood" 
                      value="inspire" 
                      className="hidden" 
                      checked={mood === "inspire"}
                      onChange={() => {
                        setMood("inspire");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "inspire" });
                      }}
                    />
                    <label 
                      htmlFor="mood-inspire" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "inspire" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setMood("inspire");
                        trackEvent(AnalyticsEvents.MOOD_SELECTED, { mood: "inspire" });
                      }}
                    >
                      <span className="text-2xl mb-2">💫</span>
                      <span>Inspire</span>
                      <span className="text-xs text-gray-500 mt-1">Uplifting stories</span>
                    </label>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button 
                    onClick={goToPrevStep} 
                    variant="outline"
                    className="px-4 py-1.5 sm:px-6 sm:py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm sm:text-base h-auto"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={submitQuestionnaire} 
                    className="px-4 py-1.5 sm:px-6 sm:py-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 rounded-lg font-medium transition-all transform hover:scale-105 text-sm sm:text-base h-auto"
                    disabled={!mood || isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        <span className="whitespace-nowrap">Processing...</span>
                      </span>
                    ) : (
                      <span className="whitespace-nowrap">Get Recommendations</span>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
