import { useState, useEffect } from "react";
import { type RecommendationRequest, type User } from "@shared/schema";

// Type definition for time of day options
type TimeOfDay = "weekday" | "weekend" | "late" | "morning";
// Type definition for runtime options
type RuntimeOption = "short" | "medium" | "long";
// Type definition for audience options
type AudienceOption = "solo" | "friends" | "date" | "family";

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
  X,
  UserCheck,
  Check,
  User as UserIcon,
  UserPlus,
  Baby
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuestionnaireProps {
  onSubmit: (data: RecommendationRequest) => void;
}

export default function Questionnaire({ onSubmit }: QuestionnaireProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [location, setLocation] = useState<RecommendationRequest["location"] | "">("");
  const [audience, setAudience] = useState<AudienceOption | "">("");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay[]>([]);
  const [mood, setMood] = useState<RecommendationRequest["mood"] | "">("");
  const [runtime, setRuntime] = useState<RuntimeOption[]>([]);
  const [friendInvites, setFriendInvites] = useState<{email: string, name: string}[]>([]);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [newFriendName, setNewFriendName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<string>("select");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const { toast } = useToast();
  
  // Check if we should show the friend invitation step (for "friends" or "date" audience)
  const shouldShowFriendStep = audience === "friends" || audience === "date";
  
  // Fetch user's friends list
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery<User[]>({
    queryKey: ["/api/friends"],
    enabled: !!user && shouldShowFriendStep, // Only fetch when user is logged in and on friend step
    queryFn: async () => {
      const response = await fetch("/api/friends");
      if (!response.ok) {
        throw new Error("Failed to fetch friends");
      }
      return await response.json();
    }
  });
  
  // Effect to run when audience changes - if it's not a social option, clear friend emails
  useEffect(() => {
    if (!shouldShowFriendStep) {
      setFriendInvites([]);
      setSelectedFriends([]);
    }
  }, [audience, shouldShowFriendStep]);

  // Check if user has incomplete invitation data
  const hasIncompleteInvitation = newFriendEmail.trim() !== '' || newFriendName.trim() !== '';
  
  // Check if Continue button should be disabled
  const shouldDisableContinue = hasIncompleteInvitation;
  
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

  // Helper function to add time of day with proper type casting
  const updateTimeOfDay = (time: TimeOfDay, isAdding: boolean) => {
    if (isAdding) {
      setTimeOfDay(prev => {
        // Check if item already exists to avoid duplicates
        if (prev.includes(time)) return prev;
        return [...prev, time];
      });
    } else {
      setTimeOfDay(prev => prev.filter(t => t !== time));
    }
  };

  // Helper function to add runtime with proper type casting
  const updateRuntime = (option: RuntimeOption, isAdding: boolean) => {
    if (isAdding) {
      setRuntime(prev => {
        // Check if item already exists to avoid duplicates
        if (prev.includes(option)) return prev;
        return [...prev, option];
      });
    } else {
      setRuntime(prev => prev.filter(r => r !== option));
    }
  };

  // Function to handle friend invitation
  const friendInviteMutation = useMutation({
    mutationFn: async ({ email, friendName }: { email: string; friendName: string }) => {
      try {
        const response = await apiRequest("POST", "/api/friend-requests", { 
          email, 
          friendName 
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          // If it's a 400 status and the message is about already being friends
          if (response.status === 400 && errorData.message?.includes("already friends")) {
            throw new Error("You are already friends with this person");
          }
          // For any other error
          throw new Error(errorData.message || "Failed to send invitation");
        }
        
        const data: FriendInviteResponse = await response.json();
        return data;
      } catch (error: any) {
        console.error("Error in friend invite:", error);
        throw error;
      }
    },
    onSuccess: (data: FriendInviteResponse) => {
      const message = data.message || (data.directAdd 
        ? `${data.friend?.name || data.friend?.email} has been added to your friends.`
        : `Invitation sent! They'll receive an email to join CineMatch and you'll be able to create blended recommendations together.`);
        
      toast({
        title: data.directAdd 
          ? "Friend added!" 
          : "Invitation sent!",
        description: message,
        variant: "default"
      });
    },
    onError: (error: any) => {
      // Special case for already friends
      if (error.message?.includes("already friends")) {
        toast({
          title: "Already Friends",
          description: "You are already connected with this person.",
          variant: "default" // Use default instead of destructive for this case
        });
      } else {
        toast({
          title: "Failed to send invitation",
          description: error.message || "Please try again.",
          variant: "destructive"
        });
      }
    }
  });
  
  // Handle adding a friend email
  const addFriendEmail = () => {
    console.log('addFriendEmail function called with:', { newFriendEmail, newFriendName });
    if (!newFriendEmail || !newFriendEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    if (!newFriendName || newFriendName.trim() === '') {
      toast({
        title: "Friend's name required",
        description: "Please enter your friend's name",
        variant: "destructive"
      });
      return;
    }
    
    if (friendInvites.some(invite => invite.email === newFriendEmail)) {
      toast({
        title: "Duplicate email",
        description: "This email is already in your invite list",
        variant: "destructive"
      });
      return;
    }
    
    const newInvite = { email: newFriendEmail, name: newFriendName };
    console.log('Adding friend invitation:', newInvite);
    
    setFriendInvites(prev => {
      const updated = [...prev, newInvite];
      console.log('Updated friendInvites array after adding:', updated);
      return updated;
    });
    setNewFriendEmail("");
    setNewFriendName("");
  };
  
  // Remove a friend email
  const removeFriendEmail = (email: string) => {
    setFriendInvites(prev => prev.filter(invite => invite.email !== email));
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
    
    if (friendInvites.length === 0) return;
    
    setIsSendingInvites(true);
    
    try {
      // Send invitations sequentially
      let successCount = 0;
      let alreadyFriendsCount = 0;
      let errorCount = 0;
      
      for (const invite of friendInvites) {
        try {
          await friendInviteMutation.mutateAsync({ email: invite.email, friendName: invite.name });
          successCount++;
        } catch (error: any) {
          if (error.message?.includes("already friends")) {
            // This is not really an error, the user is already friends with this person
            alreadyFriendsCount++;
            console.log(`User is already friends with ${invite.email}`);
          } else {
            errorCount++;
            console.error(`Failed to send invitation to ${invite.email}:`, error);
          }
        }
      }
      
      // Show summary toast for successes
      if (successCount > 0) {
        toast({
          title: `${successCount} invitation${successCount > 1 ? 's' : ''} sent!`,
          description: `Your friend${successCount > 1 ? 's' : ''} will receive an email to join CineMatch. Once they accept, you'll be able to create blended recommendations together for the perfect movie night!`,
          variant: "default"
        });
      }
      
      // Show summary for already friends
      if (alreadyFriendsCount > 0) {
        toast({
          title: `${alreadyFriendsCount} email${alreadyFriendsCount > 1 ? 's' : ''} already connected`,
          description: "You're already friends with some of the people you tried to invite.",
          variant: "default"
        });
      }
      
      // Show summary for actual errors
      if (errorCount > 0) {
        toast({
          title: `${errorCount} invitation${errorCount > 1 ? 's' : ''} failed`,
          description: "There was a problem sending some invitations. Please try again later.",
          variant: "destructive"
        });
      }
      
      // If we had any successful operations (either new invites or identified existing friends)
      if (successCount > 0 || alreadyFriendsCount > 0) {
        // Clear the list after sending
        setFriendInvites([]);
        
        // Don't automatically go to next step - let user click Continue
        // This preserves the user's choice to proceed or add more invitations
      }
    } catch (error) {
      console.error("Error in invitation process:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or continue without inviting",
        variant: "destructive"
      });
    } finally {
      setIsSendingInvites(false);
    }
  };

  const goToNextStep = () => {
    // Check if we're on the friend invitation step and have unsent invitations
    if (currentStep === 4 && shouldShowFriendStep && friendInvites.length > 0) {
      const confirmContinue = window.confirm(
        "You have unsent friend invitations. Are you sure you want to continue without sending them? You can always invite friends later from your profile."
      );
      
      if (!confirmContinue) {
        return; // Don't continue if user cancels
      }
    }

    // Determine if we should show friend step
    if (currentStep === 3 && shouldShowFriendStep) {
      // If user selected "friends" or "date" audience, add friend collection step
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 4 && shouldShowFriendStep) {
      // If we're on the standard step 4 (time selection) and coming from friend step
      setCurrentStep(currentStep + 1);
    } else if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      // If we're on step 5 and shouldShowFriendStep, go back to step 3 (skipping friend step when going backwards)
      if (currentStep === 5 && shouldShowFriendStep) {
        setCurrentStep(3);
      } else if (currentStep === 4 && shouldShowFriendStep) {
        setCurrentStep(currentStep - 1);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const submitQuestionnaire = () => {
    if (!location || !audience || timeOfDay.length === 0 || !mood) {
      return;
    }

    // Check if user is on friend step and has unsent invitations
    if (shouldShowFriendStep && friendInvites.length > 0) {
      const confirmContinue = window.confirm(
        "You have unsent friend invitations. Are you sure you want to continue without sending them? You can always invite friends later from your profile."
      );
      
      if (!confirmContinue) {
        return; // Don't continue if user cancels
      }
    }

    setIsSubmitting(true);
    
    try {
      console.log("Submitting questionnaire with data:", { 
        location, 
        audience,
        timeOfDay, 
        mood, 
        runtime,
        selectedFriends: selectedFriends.length > 0 ? selectedFriends : undefined
      });
      
      // Include the user's country for better localized recommendations
      const requestData: RecommendationRequest = {
        location,
        audience,
        timeOfDay,
        mood,
        runtime: runtime.length > 0 ? runtime : undefined, // Only include if selected
        country: user?.country || undefined,
        // Add viewing party data if we have selected friends
        viewingParty: selectedFriends.length > 0 ? selectedFriends : undefined
        // Streaming services are now handled in the Home component
        // to allow for more flexibility and automatic updates
      };
      
      // Track questionnaire completion event
      trackEvent(AnalyticsEvents.QUESTIONNAIRE_COMPLETED, {
        location: location,
        audience: audience,
        time_count: timeOfDay.length,
        time_options: timeOfDay,
        mood: mood,
        runtime: runtime.length > 0 ? runtime.join(',') : 'not_selected',
        runtime_count: runtime.length,
        is_logged_in: !!user,
        has_country: !!user?.country,
        has_friends: selectedFriends.length > 0,
        friend_count: selectedFriends.length
      });
      
      // Simulate a slight delay for better user experience
      setTimeout(() => {
        onSubmit(requestData);
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      console.error("Error submitting questionnaire:", error);
      setIsSubmitting(false);
      // Show error toast
      toast({
        title: "Error getting recommendations",
        description: "Please try again or select different options",
        variant: "destructive"
      });
    }
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
            <div className={`w-3 h-3 rounded-full ${currentStep >= 6 ? 'bg-primary' : 'bg-gray-600'}`}></div>
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
                      <span className="text-xs text-gray-500 mt-1 text-center">Cozy movie night</span>
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
                      <span className="text-xs text-gray-500 mt-1 text-center">On the go entertainment</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-between mt-8">
                  <Button
                    onClick={goToPrevStep}
                    variant="outline"
                    className="px-4 py-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={goToNextStep}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white"
                    disabled={!location}
                  >
                    {location ? "Continue" : "Select an option"}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Step 3: Who are you watching with? */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Who are you watching with?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="audience-option">
                    <input 
                      type="radio" 
                      id="audience-solo" 
                      name="audience" 
                      value="solo" 
                      className="hidden" 
                      checked={audience === "solo"}
                      onChange={() => {
                        setAudience("solo");
                        trackEvent(AnalyticsEvents.AUDIENCE_SELECTED, { audience: "solo" });
                      }}
                    />
                    <label 
                      htmlFor="audience-solo" 
                      className={`flex flex-col items-center p-4 border-2 ${audience === "solo" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setAudience("solo");
                        trackEvent(AnalyticsEvents.AUDIENCE_SELECTED, { audience: "solo" });
                      }}
                    >
                      <UserIcon className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Solo</span>
                      <span className="text-xs text-gray-500 mt-1 text-center">We'll make suggestions that are all about your taste</span>
                    </label>
                  </div>

                  <div className="audience-option">
                    <input 
                      type="radio" 
                      id="audience-friends" 
                      name="audience" 
                      value="friends" 
                      className="hidden" 
                      checked={audience === "friends"}
                      onChange={() => {
                        setAudience("friends");
                        trackEvent(AnalyticsEvents.AUDIENCE_SELECTED, { audience: "friends" });
                      }}
                    />
                    <label 
                      htmlFor="audience-friends" 
                      className={`flex flex-col items-center p-4 border-2 ${audience === "friends" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setAudience("friends");
                        trackEvent(AnalyticsEvents.AUDIENCE_SELECTED, { audience: "friends" });
                      }}
                    >
                      <Users className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Friends</span>
                      <span className="text-xs text-gray-500 mt-1 text-center">We'll come up with something for everyone</span>
                    </label>
                  </div>

                  <div className="audience-option">
                    <input 
                      type="radio" 
                      id="audience-date" 
                      name="audience" 
                      value="date" 
                      className="hidden" 
                      checked={audience === "date"}
                      onChange={() => {
                        setAudience("date");
                        trackEvent(AnalyticsEvents.AUDIENCE_SELECTED, { audience: "date" });
                      }}
                    />
                    <label 
                      htmlFor="audience-date" 
                      className={`flex flex-col items-center p-4 border-2 ${audience === "date" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setAudience("date");
                        trackEvent(AnalyticsEvents.AUDIENCE_SELECTED, { audience: "date" });
                      }}
                    >
                      <Heart className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Date Night</span>
                      <span className="text-xs text-gray-500 mt-1 text-center">We'll suggest things that suit you both, but that set the tone just right</span>
                    </label>
                  </div>

                  <div className="audience-option">
                    <input 
                      type="radio" 
                      id="audience-family" 
                      name="audience" 
                      value="family" 
                      className="hidden" 
                      checked={audience === "family"}
                      onChange={() => {
                        setAudience("family");
                        trackEvent(AnalyticsEvents.AUDIENCE_SELECTED, { audience: "family" });
                      }}
                    />
                    <label 
                      htmlFor="audience-family" 
                      className={`flex flex-col items-center p-4 border-2 ${audience === "family" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        setAudience("family");
                        trackEvent(AnalyticsEvents.AUDIENCE_SELECTED, { audience: "family" });
                      }}
                    >
                      <Baby className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Family</span>
                      <span className="text-xs text-gray-500 mt-1 text-center">We'll come up with family friendly options</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-between mt-8">
                  <Button
                    onClick={goToPrevStep}
                    variant="outline"
                    className="px-4 py-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={goToNextStep}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white"
                    disabled={!audience}
                  >
                    {audience ? "Continue" : "Select an option"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Friend Selection (for "friends" or "date" audience) */}
            {currentStep === 4 && shouldShowFriendStep && (
              <div>
                <h2 className="text-2xl font-bold mb-6">
                  {audience === "friends" ? "Who's joining your viewing party?" : "Who are you watching with?"}
                </h2>
                <p className="text-gray-600 mb-6">
                  {audience === "friends" 
                    ? "Select friends to include in your group viewing recommendations." 
                    : "Let us know who you're having your date night with for better recommendations."}
                </p>
                
                <Tabs defaultValue="select" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-6">
                    <TabsTrigger value="select" className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      <span>Select Friends</span>
                      {selectedFriends.length > 0 && 
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-xs font-medium rounded-full h-5 px-2 ml-1">
                          {selectedFriends.length}
                        </span>
                      }
                    </TabsTrigger>
                    <TabsTrigger value="invite" className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      <span>Invite New Friends</span>
                      {friendInvites.length > 0 && 
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-xs font-medium rounded-full h-5 px-2 ml-1">
                          {friendInvites.length}
                        </span>
                      }
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="select">
                    {!user ? (
                      <div className="text-center py-6">
                        <p className="text-gray-600 mb-4">You need to be logged in to select friends.</p>
                        <p className="text-sm text-gray-500">Log in to access your friends list or continue as a guest.</p>
                      </div>
                    ) : isLoadingFriends ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : friends.length === 0 ? (
                      <div className="text-center py-6 px-4">
                        <p className="text-gray-600 mb-2">You don't have any friends yet.</p>
                        <p className="text-sm text-gray-500 mb-4">Switch to the "Invite New Friends" tab to add some!</p>
                        <Button 
                          onClick={() => setActiveTab("invite")}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white"
                          size="sm"
                        >
                          Invite Friends
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2">
                        {friends.map(friend => (
                          <div 
                            key={friend.id} 
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedFriends.includes(friend.id) 
                                ? "border-primary bg-primary bg-opacity-5" 
                                : "border-gray-200 hover:border-blue-200 hover:bg-blue-50"
                            }`}
                            onClick={() => {
                              setSelectedFriends(prev => 
                                prev.includes(friend.id)
                                  ? prev.filter(id => id !== friend.id)
                                  : [...prev, friend.id]
                              );
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border">
                                <AvatarFallback className="bg-blue-100 text-blue-800">
                                  {(friend.name || friend.username || "?").substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{friend.name || friend.username}</p>
                                <p className="text-xs text-gray-500">{friend.email}</p>
                              </div>
                            </div>
                            
                            {selectedFriends.includes(friend.id) && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="invite">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Input
                          placeholder="Friend's name"
                          value={newFriendName}
                          onChange={(e) => setNewFriendName(e.target.value)}
                          className="w-full"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="Friend's email"
                            value={newFriendEmail}
                            onChange={(e) => setNewFriendEmail(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newFriendEmail && newFriendName) {
                                e.preventDefault();
                                addFriendEmail();
                              }
                            }}
                          />
                          <Button
                            onClick={addFriendEmail}
                            className="bg-primary hover:bg-primary/90"
                            disabled={!newFriendEmail || !newFriendName}
                          >
                            <PlusCircle className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                      
                      {friendInvites.length > 0 && (
                        <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                          <p className="text-sm text-gray-500 mb-2">Friends to invite:</p>
                          <div className="flex flex-wrap gap-2">
                            {friendInvites.map((invite) => (
                              <div 
                                key={invite.email} 
                                className="bg-blue-50 text-blue-800 rounded-full px-3 py-1 text-sm flex items-center gap-1"
                              >
                                <UserIcon className="w-3 h-3" />
                                <span>{invite.name}</span>
                                <Mail className="w-3 h-3 mx-1" />
                                <span className="text-xs">{invite.email}</span>
                                <button 
                                  onClick={() => removeFriendEmail(invite.email)}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {friendInvites.length > 0 && (
                        <div className="pt-2">
                          <Button
                            onClick={sendInvitations}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white"
                            disabled={isSendingInvites}
                          >
                            {isSendingInvites ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending Invitations...
                              </>
                            ) : (
                              <>Send Invitations</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-between mt-8">
                  <Button
                    onClick={goToPrevStep}
                    variant="outline"
                    className="px-4 py-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('Continue button clicked - State check:', {
                        friendInvitesLength: friendInvites.length,
                        friendInvites: friendInvites,
                        currentStep,
                        shouldShowFriendStep,
                        activeTab
                      });
                      
                      // Check if user has unsent invitations before continuing
                      if (friendInvites.length > 0) {
                        console.log('Showing confirmation dialog - friendInvites found');
                        const confirmContinue = window.confirm(
                          "You have unsent friend invitations. Are you sure you want to continue without sending them? You can always invite friends later from your profile."
                        );
                        
                        if (!confirmContinue) {
                          console.log('User cancelled confirmation dialog');
                          return; // Don't continue if user cancels
                        }
                        console.log('User confirmed, proceeding');
                      } else {
                        console.log('No unsent invitations found, proceeding directly');
                      }
                      goToNextStep();
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4 or 5: Time of Day (depending on if friend step was shown) */}
            {((currentStep === 4 && !shouldShowFriendStep) || (currentStep === 5 && shouldShowFriendStep)) && (
              <div>
                <h2 className="text-2xl font-bold mb-6">When are you watching?</h2>
                <p className="text-gray-600 mb-6">Select all options that apply. We'll prioritize films that match your timing.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="time-option">
                    <label 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("weekday") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        const newValue = !timeOfDay.includes("weekday");
                        // Direct state update to avoid race conditions
                        setTimeOfDay(prev => {
                          if (newValue) {
                            if (prev.includes("weekday")) return prev;
                            return [...prev, "weekday" as TimeOfDay];
                          } else {
                            return prev.filter(item => item !== "weekday");
                          }
                        });
                        trackEvent(AnalyticsEvents.TIME_SELECTED, { 
                          time: "weekday", 
                          selected: newValue
                        });
                      }}
                    >
                      <Calendar className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Weekday</span>
                      <span className="text-xs text-gray-500 mt-1 text-center">Monday to Friday viewing</span>
                    </label>
                  </div>
                  
                  <div className="time-option">
                    <label 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("weekend") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        const newValue = !timeOfDay.includes("weekend");
                        // Direct state update to avoid race conditions
                        setTimeOfDay(prev => {
                          if (newValue) {
                            if (prev.includes("weekend")) return prev;
                            return [...prev, "weekend" as TimeOfDay];
                          } else {
                            return prev.filter(item => item !== "weekend");
                          }
                        });
                        trackEvent(AnalyticsEvents.TIME_SELECTED, { 
                          time: "weekend", 
                          selected: newValue
                        });
                      }}
                    >
                      <Calendar className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Weekend</span>
                      <span className="text-xs text-gray-500 mt-1 text-center">Saturday and Sunday</span>
                    </label>
                  </div>
                  
                  <div className="time-option">
                    <label 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("morning") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        const newValue = !timeOfDay.includes("morning");
                        // Direct state update to avoid race conditions
                        setTimeOfDay(prev => {
                          if (newValue) {
                            if (prev.includes("morning")) return prev;
                            return [...prev, "morning" as TimeOfDay];
                          } else {
                            return prev.filter(item => item !== "morning");
                          }
                        });
                        trackEvent(AnalyticsEvents.TIME_SELECTED, { 
                          time: "morning", 
                          selected: newValue
                        });
                      }}
                    >
                      <Sun className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Morning/Day</span>
                      <span className="text-xs text-gray-500 mt-1 text-center">Daytime viewing</span>
                    </label>
                  </div>
                  
                  <div className="time-option">
                    <label 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("late") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => {
                        const newValue = !timeOfDay.includes("late");
                        // Direct state update to avoid race conditions
                        setTimeOfDay(prev => {
                          if (newValue) {
                            if (prev.includes("late")) return prev;
                            return [...prev, "late" as TimeOfDay];
                          } else {
                            return prev.filter(item => item !== "late");
                          }
                        });
                        trackEvent(AnalyticsEvents.TIME_SELECTED, { 
                          time: "late", 
                          selected: newValue
                        });
                      }}
                    >
                      <Moon className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Evening/Late</span>
                      <span className="text-xs text-gray-500 mt-1 text-center">Nighttime viewing</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-between mt-8">
                  <Button
                    onClick={goToPrevStep}
                    variant="outline"
                    className="px-4 py-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={goToNextStep}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white"
                    disabled={timeOfDay.length === 0}
                  >
                    {timeOfDay.length > 0 ? "Continue" : "Select at least one option"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5 or 6: Mood (depending on if friend step was shown) */}
            {((currentStep === 5 && !shouldShowFriendStep) || (currentStep === 6 && shouldShowFriendStep)) && (
              <div>
                <h2 className="text-2xl font-bold mb-6">What's your mood?</h2>
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
                      <span className="text-2xl mb-1">😂</span>
                      <span>Laugh</span>
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
                      <span className="text-2xl mb-1">🤔</span>
                      <span>Think</span>
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
                      <span className="text-2xl mb-1">😢</span>
                      <span>Cry</span>
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
                      <span className="text-2xl mb-1">😱</span>
                      <span>Thrill</span>
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
                      <span className="text-2xl mb-1">🚀</span>
                      <span>Escape</span>
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
                      <span className="text-2xl mb-1">✨</span>
                      <span>Inspire</span>
                    </label>
                  </div>
                </div>
                
                <div className="mt-8">
                  <h3 className="font-medium mb-3">Film Length (Optional)</h3>
                  <div className="flex flex-wrap gap-3">
                    <div className="runtime-option">
                      <div 
                        className={`flex items-center gap-2 px-4 py-2 border ${runtime.includes("short") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-full cursor-pointer hover:bg-blue-50 transition-all`}
                        onClick={() => {
                          const newValue = !runtime.includes("short");
                          // Direct state update to avoid race conditions
                          setRuntime(prev => {
                            if (newValue) {
                              if (prev.includes("short")) return prev;
                              return [...prev, "short" as RuntimeOption];
                            } else {
                              return prev.filter(item => item !== "short");
                            }
                          });
                          trackEvent(AnalyticsEvents.RUNTIME_SELECTED, { 
                            runtime: "short", 
                            selected: newValue
                          });
                        }}
                      >
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span>Under 90 min</span>
                      </div>
                    </div>
                    
                    <div className="runtime-option">
                      <div 
                        className={`flex items-center gap-2 px-4 py-2 border ${runtime.includes("medium") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-full cursor-pointer hover:bg-blue-50 transition-all`}
                        onClick={() => {
                          const newValue = !runtime.includes("medium");
                          // Direct state update to avoid race conditions
                          setRuntime(prev => {
                            if (newValue) {
                              if (prev.includes("medium")) return prev;
                              return [...prev, "medium" as RuntimeOption];
                            } else {
                              return prev.filter(item => item !== "medium");
                            }
                          });
                          trackEvent(AnalyticsEvents.RUNTIME_SELECTED, { 
                            runtime: "medium", 
                            selected: newValue
                          });
                        }}
                      >
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span>90-120 min</span>
                      </div>
                    </div>
                    
                    <div className="runtime-option">
                      <div 
                        className={`flex items-center gap-2 px-4 py-2 border ${runtime.includes("long") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-full cursor-pointer hover:bg-blue-50 transition-all`}
                        onClick={() => {
                          const newValue = !runtime.includes("long");
                          // Direct state update to avoid race conditions
                          setRuntime(prev => {
                            if (newValue) {
                              if (prev.includes("long")) return prev;
                              return [...prev, "long" as RuntimeOption];
                            } else {
                              return prev.filter(item => item !== "long");
                            }
                          });
                          trackEvent(AnalyticsEvents.RUNTIME_SELECTED, { 
                            runtime: "long", 
                            selected: newValue
                          });
                        }}
                      >
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span>Over 120 min</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-8">
                  <Button
                    onClick={goToPrevStep}
                    variant="outline"
                    className="px-4 py-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={submitQuestionnaire}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white flex items-center gap-2"
                    disabled={!mood || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Finding films...
                      </>
                    ) : (
                      <>Get Recommendations</>
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