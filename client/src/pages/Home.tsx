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
      
      // If user is logged in, add their streaming services and country to preferences
      const preferencesWithUserInfo = {
        ...preferences,
        // Add streaming services if user has selected them
        streamingServices: user?.streamingServices?.length ? user.streamingServices : undefined,
        // Add country if user has specified one
        country: user?.country || undefined
      };
        
      const response = await apiRequest('POST', '/api/recommendations', preferencesWithUserInfo);
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
    <div className="container mx-auto px-4 py-8 bg-white">
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
          <>
            <Questionnaire onSubmit={handleSubmitQuestionnaire} />
            
            {user && user.streamingServices && user.streamingServices.length > 0 && (
              <div className="mt-6 text-center text-sm bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-2xl mx-auto shadow-[0_4px_14px_0_rgba(59,130,246,0.2)]">
                <span className="font-medium text-blue-700">Streaming match:</span> We'll search for films available on your preferred platforms 
                ({user.streamingServices.join(", ")}) in {user.country || "your country"}.
              </div>
            )}
          </>
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
