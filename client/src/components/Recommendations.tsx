import { useState } from "react";
import { type Film, type RecommendationRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import FilmCard from "@/components/FilmCard";
import { Skeleton } from "@/components/ui/skeleton";

interface RecommendationsProps {
  recommendations: Film[];
  isLoading: boolean;
  preferences: RecommendationRequest;
  onReset: () => void;
}

export default function Recommendations({ 
  recommendations, 
  isLoading, 
  preferences, 
  onReset 
}: RecommendationsProps) {
  const [filterType, setFilterType] = useState<"all" | "mainstream" | "indie">("all");

  const getLocationText = (location: string) => {
    switch (location) {
      case "home": return "At Home";
      case "travel": return "Traveling";
      case "date": return "Date Night";
      case "friends": return "With Friends";
      default: return "";
    }
  };

  const getTimeText = (time: string) => {
    switch (time) {
      case "weekday": return "Weekday Evening";
      case "weekend": return "Weekend";
      case "late": return "Late Night";
      case "morning": return "Morning/Daytime";
      default: return "";
    }
  };

  const getMoodText = (mood: string) => {
    switch (mood) {
      case "laugh": return "Laugh";
      case "think": return "Think";
      case "cry": return "Cry";
      case "thrill": return "Thrill";
      case "escape": return "Escape";
      case "inspire": return "Inspire";
      default: return "";
    }
  };

  const filteredRecommendations = recommendations.filter(
    film => filterType === "all" || film.type === filterType
  );

  return (
    <section className="py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Film Recommendations</h2>
            <p className="text-gray-600">
              Based on your preferences: {" "}
              <span className="text-primary font-medium">{getLocationText(preferences.location)}</span>, {" "}
              <span className="text-primary font-medium">{getTimeText(preferences.timeOfDay)}</span>, {" "}
              <span className="text-primary font-medium">{getMoodText(preferences.mood)}</span>
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex space-x-2">
              <Button 
                onClick={() => setFilterType("all")} 
                variant={filterType === "all" ? "default" : "outline"}
                className="px-4 py-2 text-sm"
              >
                All Films
              </Button>
              <Button 
                onClick={() => setFilterType("mainstream")} 
                variant={filterType === "mainstream" ? "default" : "outline"}
                className="px-4 py-2 text-sm"
              >
                Mainstream
              </Button>
              <Button 
                onClick={() => setFilterType("indie")} 
                variant={filterType === "indie" ? "default" : "outline"}
                className="px-4 py-2 text-sm"
              >
                Indie/Foreign
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-lg border border-blue-100">
                <Skeleton className="w-full h-64 bg-blue-100" />
                <div className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2 bg-blue-100" />
                  <Skeleton className="h-4 w-1/2 mb-4 bg-blue-100" />
                  <Skeleton className="h-16 w-full bg-blue-100" />
                </div>
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white p-6 rounded-lg text-center border border-blue-100 shadow-md">
            <p className="text-xl text-gray-800">No recommendations found based on your preferences.</p>
            <p className="mt-2 text-gray-600">Try a different combination of preferences.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecommendations.map((film) => (
              <FilmCard key={film.id} film={film} />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button
            onClick={onReset}
            variant="outline"
            className="px-6 py-3 border border-primary text-primary hover:bg-primary hover:bg-opacity-10 rounded-lg transition-colors"
          >
            Start Over
          </Button>
        </div>
      </div>
    </section>
  );
}
