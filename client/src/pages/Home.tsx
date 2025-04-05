import { useState } from "react";
import Questionnaire from "@/components/Questionnaire";
import Recommendations from "@/components/Recommendations";
import { type RecommendationRequest, type Film } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user } = useAuth();
  const [showQuestionnaire, setShowQuestionnaire] = useState(true);
  const [preferences, setPreferences] = useState<RecommendationRequest | null>(null);
  
  const { data: recommendations, isLoading } = useQuery<Film[]>({
    queryKey: ['/api/recommendations', preferences],
    enabled: preferences !== null,
    staleTime: Infinity,
    queryFn: async () => {
      if (!preferences) return [];
      
      // If user is logged in, add their streaming services to preferences
      const preferencesWithUserServices = user?.streamingServices?.length 
        ? { ...preferences, streamingServices: user.streamingServices }
        : preferences;
        
      const response = await apiRequest('POST', '/api/recommendations', preferencesWithUserServices);
      return response.json();
    }
  });

  const handleSubmitQuestionnaire = (data: RecommendationRequest) => {
    setPreferences(data);
    setShowQuestionnaire(false);
  };

  const handleReset = () => {
    setPreferences(null);
    setShowQuestionnaire(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
          Find Your Perfect Movie Match
        </h1>
        <p className="text-center text-gray-600 max-w-2xl mx-auto">
          Tell us about your mood and preferences, and we'll recommend the perfect films for you to watch.
        </p>
      </div>
      
      <div className="max-w-4xl mx-auto">
        {showQuestionnaire ? (
          <Questionnaire onSubmit={handleSubmitQuestionnaire} />
        ) : (
          <Recommendations 
            recommendations={recommendations || []} 
            isLoading={isLoading} 
            preferences={preferences!} 
            onReset={handleReset} 
          />
        )}
      </div>
    </div>
  );
}
