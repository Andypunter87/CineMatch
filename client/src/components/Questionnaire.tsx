import { useState } from "react";
import { type RecommendationRequest } from "@shared/schema";
import { 
  Home as HomeIcon, 
  Globe, 
  Heart, 
  Users, 
  Calendar, 
  Moon, 
  Sun 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface QuestionnaireProps {
  onSubmit: (data: RecommendationRequest) => void;
}

export default function Questionnaire({ onSubmit }: QuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [location, setLocation] = useState<RecommendationRequest["location"] | "">("");
  const [timeOfDay, setTimeOfDay] = useState<RecommendationRequest["timeOfDay"]>([]);
  const [mood, setMood] = useState<RecommendationRequest["mood"] | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitQuestionnaire = () => {
    if (!location || timeOfDay.length === 0 || !mood) {
      return;
    }

    setIsSubmitting(true);
    
    // Simulate a slight delay for better user experience
    setTimeout(() => {
      onSubmit({
        location,
        timeOfDay,
        mood
      });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <section className="flex flex-col justify-center items-center py-8 px-4 md:px-8 min-h-[80vh]">
      <div className="max-w-2xl w-full">
        <div className="mb-8 flex justify-center">
          <div className="flex space-x-2">
            <div className={`w-3 h-3 rounded-full ${currentStep >= 1 ? 'bg-primary' : 'bg-gray-600'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-600'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-600'}`}></div>
            <div className={`w-3 h-3 rounded-full ${currentStep >= 4 ? 'bg-primary' : 'bg-gray-600'}`}></div>
          </div>
        </div>

        <Card className="bg-white border border-blue-100 shadow-lg">
          <CardContent className="p-8">
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-3xl font-bold mb-6 text-center">Find Your Perfect Film Match</h2>
                <p className="text-lg text-center mb-8">Answer a few questions and we'll recommend films that match your current situation and mood.</p>
                <div className="flex justify-center">
                  <Button 
                    onClick={goToNextStep} 
                    className="px-8 py-6 bg-primary hover:bg-opacity-90 rounded-lg font-medium text-white transition-all transform hover:scale-105"
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
                      onChange={() => setLocation("home")}
                    />
                    <label 
                      htmlFor="location-home" 
                      className={`flex flex-col items-center p-4 border-2 ${location === "home" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => setLocation("home")}
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
                      onChange={() => setLocation("travel")}
                    />
                    <label 
                      htmlFor="location-travel" 
                      className={`flex flex-col items-center p-4 border-2 ${location === "travel" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => setLocation("travel")}
                    >
                      <Globe className="w-8 h-8 mb-2 text-gray-300" />
                      <span>Traveling</span>
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
                      onChange={() => setLocation("date")}
                    />
                    <label 
                      htmlFor="location-date" 
                      className={`flex flex-col items-center p-4 border-2 ${location === "date" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => setLocation("date")}
                    >
                      <Heart className="w-8 h-8 mb-2 text-gray-300" />
                      <span>Date Night</span>
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
                      onChange={() => setLocation("friends")}
                    />
                    <label 
                      htmlFor="location-friends" 
                      className={`flex flex-col items-center p-4 border-2 ${location === "friends" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                      onClick={() => setLocation("friends")}
                    >
                      <Users className="w-8 h-8 mb-2 text-gray-300" />
                      <span>With Friends</span>
                    </label>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button 
                    onClick={goToPrevStep} 
                    variant="outline"
                    className="px-6 py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={goToNextStep} 
                    className="px-6 py-2 bg-primary hover:bg-opacity-90 rounded-lg transition-colors"
                    disabled={!location}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Time */}
            {currentStep === 3 && (
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
                        if (timeOfDay.includes("weekday")) {
                          setTimeOfDay(timeOfDay.filter(t => t !== "weekday"));
                        } else {
                          setTimeOfDay([...timeOfDay, "weekday"]);
                        }
                      }}
                    />
                    <label 
                      htmlFor="time-weekday" 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("weekday") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Calendar className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Weekday Evening</span>
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
                        if (timeOfDay.includes("weekend")) {
                          setTimeOfDay(timeOfDay.filter(t => t !== "weekend"));
                        } else {
                          setTimeOfDay([...timeOfDay, "weekend"]);
                        }
                      }}
                    />
                    <label 
                      htmlFor="time-weekend" 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("weekend") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Calendar className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Weekend</span>
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
                        if (timeOfDay.includes("late")) {
                          setTimeOfDay(timeOfDay.filter(t => t !== "late"));
                        } else {
                          setTimeOfDay([...timeOfDay, "late"]);
                        }
                      }}
                    />
                    <label 
                      htmlFor="time-late" 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("late") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Moon className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Late Night</span>
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
                        if (timeOfDay.includes("morning")) {
                          setTimeOfDay(timeOfDay.filter(t => t !== "morning"));
                        } else {
                          setTimeOfDay([...timeOfDay, "morning"]);
                        }
                      }}
                    />
                    <label 
                      htmlFor="time-morning" 
                      className={`flex flex-col items-center p-4 border-2 ${timeOfDay.includes("morning") ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <Sun className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Morning/Daytime</span>
                    </label>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button 
                    onClick={goToPrevStep} 
                    variant="outline"
                    className="px-6 py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={goToNextStep} 
                    className="px-6 py-2 bg-primary hover:bg-opacity-90 rounded-lg transition-colors"
                    disabled={timeOfDay.length === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Mood */}
            {currentStep === 4 && (
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
                     
                    />
                    <label 
                      htmlFor="mood-laugh" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "laugh" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                    >
                      <span className="text-2xl mb-2">😂</span>
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
                     
                    />
                    <label 
                      htmlFor="mood-think" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "think" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                     
                    >
                      <span className="text-2xl mb-2">🤔</span>
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
                     
                    />
                    <label 
                      htmlFor="mood-cry" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "cry" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                     
                    >
                      <span className="text-2xl mb-2">😢</span>
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
                     
                    />
                    <label 
                      htmlFor="mood-thrill" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "thrill" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                     
                    >
                      <span className="text-2xl mb-2">😱</span>
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
                     
                    />
                    <label 
                      htmlFor="mood-escape" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "escape" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                     
                    >
                      <span className="text-2xl mb-2">✨</span>
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
                     
                    />
                    <label 
                      htmlFor="mood-inspire" 
                      className={`flex flex-col items-center p-4 border-2 ${mood === "inspire" ? "border-primary bg-primary bg-opacity-10" : "border-blue-200"} rounded-lg cursor-pointer hover:bg-blue-50 transition-all`}
                     
                    >
                      <span className="text-2xl mb-2">💫</span>
                      <span>Inspire</span>
                    </label>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <Button 
                    onClick={goToPrevStep} 
                    variant="outline"
                    className="px-6 py-2 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={submitQuestionnaire} 
                    className="px-6 py-3 bg-primary hover:bg-opacity-90 rounded-lg font-medium transition-all transform hover:scale-105"
                    disabled={!mood || isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Processing...
                      </span>
                    ) : (
                      "Get Recommendations"
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
