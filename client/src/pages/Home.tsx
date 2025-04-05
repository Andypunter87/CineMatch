import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Questionnaire from "@/components/Questionnaire";
import Recommendations from "@/components/Recommendations";
import { type RecommendationRequest, type Film } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const [showQuestionnaire, setShowQuestionnaire] = useState(true);
  const [preferences, setPreferences] = useState<RecommendationRequest | null>(null);
  
  const { data: recommendations, isLoading } = useQuery<Film[]>({
    queryKey: ['/api/recommendations', preferences],
    enabled: preferences !== null,
    staleTime: Infinity
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
    <div className="min-h-screen bg-blue-50 text-gray-800 flex flex-col">
      <Header />
      <main className="flex-grow">
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
      </main>
      <Footer />
    </div>
  );
}
