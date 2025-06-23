import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, User, Bot } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { RecommendationRequest } from '@shared/schema';

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
    options: ["Weekday evening", "Weekend", "Late night", "Morning"],
    schemaField: 'timeOfDay',
    mappedValues: ["weekday", "weekend", "late", "morning"],
    allowMultiple: true
  },
  {
    id: 'mood',
    question: "What sort of vibe are you in the mood for?",
    options: ["Make me laugh", "Get my heart racing", "Make me think", "Tug the heartstrings", "Help me escape", "Inspire me"],
    schemaField: 'mood',
    mappedValues: ["laugh", "thrill", "think", "cry", "escape", "inspire"]
  },
  {
    id: 'runtime',
    question: "How much time have you got? (You can pick multiple)",
    options: ["Short (≤90 mins)", "Medium (≤120 mins)", "Long (2.5+ hrs)"],
    schemaField: 'runtime',
    mappedValues: ["short", "medium", "long"],
    allowMultiple: true
  },
  {
    id: 'streamingServices',
    question: "Where do you stream? (You can pick multiple)",
    options: ["Netflix", "Prime Video", "Disney+", "Apple TV+", "Hulu", "HBO Max"],
    schemaField: 'streamingServices',
    mappedValues: ["Netflix", "Amazon Prime Video", "Disney Plus", "Apple TV Plus", "Hulu", "HBO Max"],
    allowMultiple: true
  },
  {
    id: 'viewingParty',
    question: "Want to include any of your CineMatch friends in this recommendation?",
    options: [], // Will be populated with friend names
    schemaField: 'viewingParty',
    mappedValues: [],
    requiresDropdown: true,
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

  const [otherInputValue, setOtherInputValue] = useState('');
  const [recommendationData, setRecommendationData] = useState<Partial<RecommendationRequest>>({});
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isProcessingOther, setIsProcessingOther] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch friends for the viewing party step
  const { data: friends = [] } = useQuery<Friend[]>({
    queryKey: ['/api/friends'],
    enabled: userId !== undefined,
    queryFn: () => fetch('/api/friends').then(res => res.json())
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start the conversation
    addCineMateMessage("Hi! I'm CineMate, your friendly film buff. Let's find you the perfect movie to watch! 🎬");
    setTimeout(() => {
      askCurrentQuestion();
    }, 1000);
  }, []); // Added dependency array to ensure this only runs once

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

  const askCurrentQuestion = () => {
    if (currentStep >= chatSteps.length) {
      showFinalConfirmation();
      return;
    }

    const step = chatSteps[currentStep];
    
    // For viewing party step, populate with friends
    if (step.id === 'viewingParty' && friends.length > 0) {
      step.options = friends.map(f => f.name);
      step.mappedValues = friends.map(f => f.id.toString());
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

    // Single selection
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

  const handleOtherSubmit = async () => {
    if (!otherInputValue.trim()) return;

    setIsProcessingOther(true);
    addUserMessage(otherInputValue);

    // Store the raw user input directly instead of trying to map it
    const step = chatSteps[currentStep];
    updateRecommendationData(step.schemaField, otherInputValue);
    
    simulateTyping(() => {
      addCineMateMessage("Got it! I'll include that in your recommendations.");
      proceedToNextStep();
    });

    setIsProcessingOther(false);
    setOtherInputValue('');
  };

  const updateRecommendationData = (field: keyof RecommendationRequest, value: any) => {
    setRecommendationData(prev => ({
      ...prev,
      [field]: value,
      userId: userId
    }));
  };

  const proceedToNextStep = () => {
    // Clear selections before moving to next step
    setSelectedOptions([]);
    setOtherInputValue('');
    
    setCurrentStep(prev => prev + 1);
    setTimeout(() => {
      askCurrentQuestion();
    }, 1000);
  };

  const showFinalConfirmation = () => {
    simulateTyping(() => {
      addCineMateMessage("Perfect! Based on what you've told me, I'll suggest films I think you'll absolutely love. Ready for your personalized recommendations?");
      setShowConfirmation(true);
    });
  };

  const handleConfirm = () => {
    addUserMessage("Let's go!");
    simulateTyping(() => {
      addCineMateMessage("Fantastic! Give me a moment to curate the perfect selection for you...");
      // Complete the recommendation request
      onComplete(recommendationData as RecommendationRequest);
    });
  };

  const handleChangeResponses = () => {
    addUserMessage("I'd like to change something");
    setShowConfirmation(false);
    setCurrentStep(0);
    setRecommendationData({});
    setMessages([]);
    setSelectedOptions([]);
    setOtherInputValue('');
    simulateTyping(() => {
      addCineMateMessage("No problem! Let's start fresh. What would you like to change?");
      askCurrentQuestion();
    });
  };

  // Add a reset function to properly clear state
  const resetConversation = () => {
    setCurrentStep(0);
    setMessages([]);
    setRecommendationData({});
    setSelectedOptions([]);
    setOtherInputValue('');
    setShowConfirmation(false);
    setIsTyping(false);
  };

  const currentStepData = currentStep < chatSteps.length ? chatSteps[currentStep] : null;
  const showOptions = !isTyping && !showConfirmation && currentStepData;
  const isViewingPartyStep = currentStepData?.id === 'viewingParty';



  return (
    <div className="max-w-2xl mx-auto h-[600px] flex flex-col bg-white rounded-lg shadow-lg">
      {/* Chat Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">CineMate</h3>
            <p className="text-sm text-gray-600">Your personal film curator</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.sender === 'cineMate' && (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
            {message.sender === 'user' && (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-3 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50 rounded-b-lg">
        {showConfirmation && (
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                We'll suggest films we think you'll love based on what you've told us.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConfirm} className="flex-1">
                Let's go!
              </Button>
              <Button variant="outline" onClick={handleChangeResponses}>
                Change something
              </Button>
            </div>
          </div>
        )}



        {showOptions && (
          <div className="space-y-3">
            {/* Special handling for viewing party dropdown */}
            {isViewingPartyStep && friends.length > 0 ? (
              <div className="space-y-2">
                <Select onValueChange={(value) => {
                  const friendIndex = friends.findIndex(f => f.id.toString() === value);
                  if (friendIndex !== -1) {
                    handleOptionSelect(friendIndex);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a friend (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {friends.map((friend, index) => (
                      <SelectItem key={friend.id} value={friend.id.toString()}>
                        {friend.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    addUserMessage("No friends for this session");
                    updateRecommendationData(currentStepData.schemaField, []);
                    proceedToNextStep();
                  }}
                  className="w-full"
                >
                  Skip - Just me tonight
                </Button>
              </div>
            ) : (
              /* Regular button options */
              <div className="space-y-3">
                {currentStepData.allowMultiple ? (
                  /* Multiple selection with checkboxes in a grid */
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {currentStepData.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50">
                          <Checkbox
                            id={`option-${index}`}
                            checked={selectedOptions.includes(option)}
                            onCheckedChange={() => handleOptionSelect(index)}
                          />
                          <label
                            htmlFor={`option-${index}`}
                            className="flex-1 text-sm font-medium leading-none cursor-pointer"
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    {selectedOptions.length > 0 && (
                      <Button onClick={handleMultipleConfirm} className="w-full">
                        Continue with selected ({selectedOptions.length})
                      </Button>
                    )}
                  </>
                ) : (
                  /* Single selection with buttons in a row */
                  <div className="flex flex-wrap gap-2">
                    {currentStepData.options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleOptionSelect(index)}
                        className="flex-1 min-w-0 hover:bg-blue-50 hover:border-blue-300"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Text input option */}
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      value={otherInputValue}
                      onChange={(e) => setOtherInputValue(e.target.value)}
                      placeholder="Or tell me something else..."
                      onKeyPress={(e) => e.key === 'Enter' && otherInputValue.trim() && handleOtherSubmit()}
                      disabled={isProcessingOther}
                      className="pr-10"
                    />
                    <Button 
                      onClick={handleOtherSubmit} 
                      disabled={!otherInputValue.trim() || isProcessingOther}
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                    >
                      {isProcessingOther ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}