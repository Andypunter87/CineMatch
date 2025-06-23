import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, User, Bot, UserPlus, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RecommendationRequest } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender: 'cineMate' | 'user';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatStep {
  id: string;
  question: string;
  options: string[];
  schemaField: keyof RecommendationRequest;
  mappedValues: string[];
  allowMultiple?: boolean;
  requiresDropdown?: boolean;
  requiresPersonalization?: boolean;
}

interface Friend {
  id: number;
  name: string;
  email: string;
}

const chatSteps: ChatStep[] = [
  {
    id: 'location',
    question: "Where are you watching?",
    options: ["At home", "Travelling", "Out and about"],
    schemaField: 'location',
    mappedValues: ["home", "travel", "travel"]
  },
  {
    id: 'audience',
    question: "Who are you watching with?",
    options: ["Just me", "Friends", "Date night", "Family"],
    schemaField: 'audience',
    mappedValues: ["solo", "friends", "date", "family"]
  },
  {
    id: 'timeOfDay',
    question: "When's this for? (You can pick multiple)",
    options: ["Weekday", "Weekend", "Late night", "Morning"],
    schemaField: 'timeOfDay',
    mappedValues: ["weekday", "weekend", "late", "morning"],
    allowMultiple: true
  },
  {
    id: 'mood',
    question: "What sort of vibe are you in the mood for?",
    options: [], // Will be populated with personalized mood labels
    schemaField: 'mood',
    mappedValues: [], // Will be populated with mood labels as-is
    requiresPersonalization: true
  },
  {
    id: 'runtime',
    question: "How much time have you got? (You can pick multiple)",
    options: ["Short (≤90 mins)", "Medium (≤120 mins)", "Long (2.5+ hrs)"],
    schemaField: 'runtime',
    mappedValues: ["short", "medium", "long"],
    allowMultiple: true
  }
];

export default function ChatRecommender({ 
  onComplete, 
  userId 
}: { 
  onComplete: (request: RecommendationRequest) => void;
  userId?: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [recommendationData, setRecommendationData] = useState<Partial<RecommendationRequest>>({});
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showFriendSelection, setShowFriendSelection] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [isProcessingCustom, setIsProcessingCustom] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [personalizedMoods, setPersonalizedMoods] = useState<string[]>([]);
  const [isGeneratingMoods, setIsGeneratingMoods] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch friends for the viewing party step
  const { data: friends = [], refetch: refetchFriends } = useQuery<Friend[]>({
    queryKey: ['/api/friends'],
    enabled: userId !== undefined,
    queryFn: () => fetch('/api/friends').then(res => res.json())
  });

  // Friend invitation mutation
  const inviteFriendMutation = useMutation({
    mutationFn: async (data: { email: string, friendName: string }) => {
      const response = await fetch('/api/friend-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invitation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Friend invitation sent",
        description: "We'll notify you when they accept your request",
      });
      setInviteEmail('');
      setInviteName('');
      setShowInviteModal(false);
      refetchFriends();
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Generate personalized mood labels mutation
  const generateMoodsMutation = useMutation({
    mutationFn: async (context: { audience: string, timeOfDay: string[] }) => {
      const response = await fetch('/api/mood-labels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate mood labels');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setPersonalizedMoods(data.moodLabels);
      setIsGeneratingMoods(false);
    },
    onError: (error: any) => {
      console.error('Error generating moods:', error);
      // Fall back to default mood options
      setPersonalizedMoods([
        "Something that feels like a warm hug",
        "Let me escape into another world", 
        "Make me feel cleverer than I am",
        "Something beautifully melancholic",
        "A film that surprises me"
      ]);
      setIsGeneratingMoods(false);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation on mount
  useEffect(() => {
    startConversation();
  }, []);

  const startConversation = () => {
    setMessages([]);
    setCurrentStep(0);
    setRecommendationData({});
    setSelectedOptions([]);
    setShowFriendSelection(false);
    setShowConfirmation(false);
    setCustomInput('');
    setIsProcessingCustom(false);
    
    addCineMateMessage("Hi! I'm CineMate, your friendly film buff. Let's find you the perfect movie to watch! 🎬");
    setTimeout(() => {
      askQuestion(0);
    }, 1000);
  };

  const addCineMateMessage = (text: string, isTyping = false) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: 'cineMate',
      text,
      timestamp: new Date(),
      isTyping
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (text: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const simulateTyping = (callback: () => void, delay = 1500) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, delay);
  };

  const askQuestion = async (stepIndex: number) => {
    if (stepIndex >= chatSteps.length) {
      showFinalConfirmation();
      return;
    }

    const step = chatSteps[stepIndex];
    
    // If this is the mood step and requires personalization, generate mood labels
    if (step.requiresPersonalization && step.id === 'mood') {
      setIsGeneratingMoods(true);
      
      // Get context from previous answers
      const audience = recommendationData.audience || 'solo';
      const timeOfDay = recommendationData.timeOfDay || ['evening'];
      
      try {
        await generateMoodsMutation.mutateAsync({ audience, timeOfDay });
      } catch (error) {
        console.error('Failed to generate mood labels:', error);
      }
    }
    
    simulateTyping(() => {
      addCineMateMessage(step.question);
    });
  };

  const handleOptionSelect = (optionIndex: number) => {
    const step = chatSteps[currentStep];
    const selectedOption = step.options[optionIndex];
    const mappedValue = step.mappedValues[optionIndex];

    if (step.allowMultiple) {
      const newSelected = selectedOptions.includes(selectedOption)
        ? selectedOptions.filter(opt => opt !== selectedOption)
        : [...selectedOptions, selectedOption];
      
      setSelectedOptions(newSelected);
      return;
    }

    // Handle "Friends" or "Date night" selection - show friend dropdown
    if (step.id === 'audience' && (selectedOption === 'Friends' || selectedOption === 'Date night')) {
      addUserMessage(selectedOption);
      updateRecommendationData(step.schemaField, mappedValue);
      setShowFriendSelection(true);
      return;
    }

    // Single selection - proceed to next question
    addUserMessage(selectedOption);
    updateRecommendationData(step.schemaField, mappedValue);
    proceedToNextStep();
  };

  const handleMultipleConfirm = () => {
    const step = chatSteps[currentStep];
    const selectedMappedValues = selectedOptions.map(option => {
      const index = step.options.indexOf(option);
      return step.mappedValues[index];
    });

    addUserMessage(selectedOptions.join(', '));
    updateRecommendationData(step.schemaField, selectedMappedValues);
    setSelectedOptions([]);
    proceedToNextStep();
  };

  const handleFriendSelection = (friendId: string) => {
    const selectedFriend = friends.find(f => f.id.toString() === friendId);
    if (selectedFriend) {
      addUserMessage(`Watching with ${selectedFriend.name}`);
      updateRecommendationData('viewingParty', [friendId]);
    }
    setShowFriendSelection(false);
    proceedToNextStep();
  };

  const skipFriendSelection = () => {
    addUserMessage("Just me for this session");
    updateRecommendationData('viewingParty', []);
    setShowFriendSelection(false);
    proceedToNextStep();
  };

  const handleInviteFriend = () => {
    setShowInviteModal(true);
  };

  const handleSendInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    if (!inviteName || inviteName.trim() === '') {
      toast({
        title: "Friend's name is required",
        description: "Please enter your friend's name",
        variant: "destructive",
      });
      return;
    }
    
    inviteFriendMutation.mutate({ email: inviteEmail, friendName: inviteName });
  };

  const handleCustomInput = async () => {
    if (!customInput.trim() || isProcessingCustom) return;
    
    setIsProcessingCustom(true);
    const step = chatSteps[currentStep];
    
    // Add user message and process the custom input
    addUserMessage(customInput);
    
    // For custom responses, pass the raw text as the value
    // The LLM will interpret this contextually
    updateRecommendationData(step.schemaField, customInput);
    
    setCustomInput('');
    setIsProcessingCustom(false);
    proceedToNextStep();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCustomInput();
    }
  };

  const updateRecommendationData = (field: keyof RecommendationRequest, value: any) => {
    setRecommendationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const proceedToNextStep = () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    setTimeout(() => {
      askQuestion(nextStep);
    }, 1000);
  };

  const showFinalConfirmation = () => {
    simulateTyping(() => {
      addCineMateMessage("Perfect! I've got all the details I need. Let me find you some great recommendations!");
      setShowConfirmation(true);
    });
  };

  const handleConfirmSubmit = () => {
    const completeRequest: RecommendationRequest = {
      location: recommendationData.location || 'home',
      audience: recommendationData.audience || 'solo',
      timeOfDay: recommendationData.timeOfDay || ['evening'],
      mood: recommendationData.mood || 'any',
      runtime: recommendationData.runtime || ['medium'],
      viewingParty: recommendationData.viewingParty || [],
      additionalContext: 'Generated from chat interface'
    };
    
    onComplete(completeRequest);
  };

  const restartChat = () => {
    startConversation();
  };

  const currentStepData = currentStep < chatSteps.length ? chatSteps[currentStep] : null;
  const showOptions = !isTyping && !showConfirmation && !showFriendSelection && currentStepData;
  
  // For mood step, use personalized moods if available
  const getOptionsForCurrentStep = () => {
    if (!currentStepData) return [];
    
    if (currentStepData.id === 'mood' && personalizedMoods.length > 0) {
      return personalizedMoods;
    }
    
    return currentStepData.options;
  };
  
  const getMappedValuesForCurrentStep = () => {
    if (!currentStepData) return [];
    
    if (currentStepData.id === 'mood' && personalizedMoods.length > 0) {
      return personalizedMoods; // Use mood labels as-is for mapping
    }
    
    return currentStepData.mappedValues;
  };
  
  // Only allow custom input for location and mood questions
  // Keep predefined options for audience and time/runtime questions
  const allowCustomInput = currentStepData && ['location', 'mood'].includes(currentStepData.id);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card className="h-96 overflow-y-auto bg-gradient-to-b from-blue-50 to-white border-blue-200">
        <CardContent className="p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div className={`p-2 rounded-full ${
                message.sender === 'cineMate' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {message.sender === 'cineMate' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.sender === 'cineMate'
                  ? 'bg-white shadow-sm border border-blue-100'
                  : 'bg-blue-500 text-white'
              }`}>
                <p className="text-sm">{message.text}</p>
                {message.isTyping && (
                  <div className="flex items-center gap-1 mt-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Bot size={16} />
              </div>
              <div className="bg-white shadow-sm border border-blue-100 p-3 rounded-lg">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {/* Confirmation Screen */}
      {showConfirmation && (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 mb-3">
              Ready to get your recommendations?
            </p>
            <div className="flex gap-2">
              <Button onClick={handleConfirmSubmit} className="flex-1">
                Get My Recommendations
              </Button>
              <Button variant="outline" onClick={restartChat}>
                Start Over
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Friend Selection Dropdown */}
      {showFriendSelection && (
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 mb-3">
              {recommendationData.audience === 'date' 
                ? "Who are you going on a date with?"
                : "Which friend are you watching with?"}
            </p>
            <div className="space-y-2">
              {friends.length > 0 ? (
                <Select onValueChange={handleFriendSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      recommendationData.audience === 'date' 
                        ? "Select your date" 
                        : "Select a friend"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {friends.map((friend) => (
                      <SelectItem key={friend.id} value={friend.id.toString()}>
                        {friend.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-600 mb-2">
                  You don't have any friends added yet.
                </p>
              )}
              
              <Button 
                variant="outline" 
                onClick={handleInviteFriend}
                className="w-full"
                disabled={inviteFriendMutation.isPending}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {recommendationData.audience === 'date' 
                  ? "Invite someone new" 
                  : "Invite a friend"}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={skipFriendSelection}
                className="w-full"
              >
                {recommendationData.audience === 'date' 
                  ? "Actually, just me tonight"
                  : "Actually, just me tonight"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Friend Invitation Modal */}
      {showInviteModal && (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-green-800 font-medium">
                {recommendationData.audience === 'date' 
                  ? "Invite someone special"
                  : "Invite a friend"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInviteModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <form onSubmit={handleSendInvitation} className="space-y-3">
              <div>
                <Input
                  type="email"
                  placeholder="Enter their email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Enter their name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={inviteFriendMutation.isPending}
                >
                  {inviteFriendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Invitation
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Options Interface */}
      {showOptions && (
        <div className="space-y-3">
          {currentStepData.allowMultiple ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {currentStepData.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={selectedOptions.includes(option) ? "default" : "outline"}
                    onClick={() => handleOptionSelect(index)}
                    className="flex-1 min-w-[120px]"
                  >
                    {option}
                  </Button>
                ))}
              </div>
              {selectedOptions.length > 0 && (
                <Button onClick={handleMultipleConfirm} className="w-full">
                  Continue with: {selectedOptions.join(', ')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {currentStepData.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleOptionSelect(index)}
                    className="flex-1 min-w-[120px]"
                  >
                    {option}
                  </Button>
                ))}
              </div>
              
              {/* Custom Input for Location and Mood Questions */}
              {allowCustomInput && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Or describe it in your own words:</p>
                  <div className="flex gap-2">
                    <Input
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your answer..."
                      className="flex-1"
                      disabled={isProcessingCustom}
                    />
                    <Button 
                      onClick={handleCustomInput}
                      disabled={!customInput.trim() || isProcessingCustom}
                      size="sm"
                    >
                      {isProcessingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}