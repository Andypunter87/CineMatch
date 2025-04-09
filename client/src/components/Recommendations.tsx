import { useState, useEffect } from "react";
import { type Film, type RecommendationRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import FilmCard from "./FilmCard";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Plus } from "lucide-react";

interface RecommendationsProps {
  recommendations: Film[];
  isLoading: boolean;
  preferences: RecommendationRequest;
  onReset: () => void;
  onGenerateMore?: () => void;
  hasMoreToGenerate?: boolean;
  onDisliked?: (filmId: number) => void;
}

export default function Recommendations({ 
  recommendations, 
  isLoading, 
  preferences, 
  onReset,
  onGenerateMore,
  hasMoreToGenerate = false,
  onDisliked
}: RecommendationsProps) {
  const [filterType, setFilterType] = useState<"all" | "mainstream" | "indie">("all");
  const [isLongLoading, setIsLongLoading] = useState(false);
  
  // Set up a timer to change the loading message after 7 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLoading) {
      setIsLongLoading(false);
      timer = setTimeout(() => {
        setIsLongLoading(true);
      }, 7000); // 7 seconds
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  const getLocationText = (location: string) => {
    switch (location) {
      case "home": return "At Home";
      case "travel": return "Traveling";
      case "date": return "Date Night";
      case "friends": return "With Friends";
      default: return "";
    }
  };

  const getTimeText = (times: string[]) => {
    if (!times || times.length === 0) return "";
    return times.map(time => {
      switch (time) {
        case "weekday": return "Weekday Evening";
        case "weekend": return "Weekend";
        case "late": return "Late Night";
        case "morning": return "Morning/Daytime";
        default: return "";
      }
    }).join(", ");
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
  
  const getRuntimeText = (runtime?: string[] | string) => {
    if (!runtime || (Array.isArray(runtime) && runtime.length === 0)) return "";
    
    // Handle array of runtimes
    if (Array.isArray(runtime)) {
      return runtime.map(r => {
        switch (r) {
          case "short": return "Under 90 mins";
          case "medium": return "90-120 mins";
          case "long": return "Over 120 mins";
          default: return "";
        }
      }).join(", ");
    }
    
    // Handle single runtime (legacy support)
    switch (runtime) {
      case "short": return "Under 90 mins";
      case "medium": return "90-120 mins";
      case "long": return "Over 120 mins";
      default: return "";
    }
  };

  const filteredRecommendations = recommendations.filter(
    film => filterType === "all" || film.type === filterType
  );

  return (
    <section className="py-6 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Film Recommendations</h2>
            <div className="text-gray-600 text-sm sm:text-base">
              <p className="mb-1">Based on your preferences:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="text-primary font-medium">{getLocationText(preferences.location)}</span></li>
                <li><span className="text-primary font-medium">{getTimeText(preferences.timeOfDay)}</span></li> 
                <li><span className="text-primary font-medium">{getMoodText(preferences.mood)}</span></li>
                {preferences.runtime && (
                  <li><span className="text-primary font-medium">Runtime: {getRuntimeText(preferences.runtime)}</span></li>
                )}
                {preferences.viewingParty && preferences.viewingParty.length > 0 && (
                  <li><span className="text-primary font-medium">Watching with: {preferences.viewingParty.length} {preferences.viewingParty.length === 1 ? 'friend' : 'friends'}</span></li>
                )}
                {preferences.country && (
                  <li><span className="text-primary font-medium">Country: {preferences.country}</span></li>
                )}
                {preferences.streamingServices && preferences.streamingServices.length > 0 && (
                  <li><span className="text-primary font-medium">Services: {preferences.streamingServices.join(", ")}</span></li>
                )}
              </ul>
            </div>
            {preferences.streamingServices && preferences.streamingServices.length > 0 && (
              <div className="mt-3 text-xs bg-blue-50 border border-blue-100 rounded-md p-2 text-blue-700">
                <strong>Tip:</strong> We've listed streaming services where each film may be available. Always check the services directly for current availability.
              </div>
            )}
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => setFilterType("all")} 
                variant={filterType === "all" ? "default" : "outline"}
                className="px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm h-auto"
              >
                All Films
              </Button>
              <Button 
                onClick={() => setFilterType("mainstream")} 
                variant={filterType === "mainstream" ? "default" : "outline"}
                className="px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm h-auto"
              >
                Mainstream
              </Button>
              <Button 
                onClick={() => setFilterType("indie")} 
                variant={filterType === "indie" ? "default" : "outline"}
                className="px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm h-auto"
              >
                Indie/Foreign
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white py-5 px-8 rounded-lg border shadow-md flex items-center space-x-3 z-10">
                <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                <p className="text-gray-800">
                  {isLongLoading
                    ? "Nearly there! Thanks for waiting..."
                    : "Getting your personalized film recommendations..."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-8 filter blur-sm">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-96 bg-white rounded-lg overflow-hidden shadow-lg border border-blue-100">
                  <Skeleton className="w-full h-64 bg-blue-100" />
                  <div className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2 bg-blue-100" />
                    <Skeleton className="h-4 w-1/2 mb-4 bg-blue-100" />
                    <Skeleton className="h-16 w-full bg-blue-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white p-8 rounded-lg text-center border border-blue-100 shadow-md">
            <div className="text-primary opacity-40 text-5xl mb-4">¯\_(ツ)_/¯</div>
            <p className="text-xl text-gray-800 font-medium">No recommendations found for these preferences.</p>
            <p className="mt-2 text-gray-600 mb-4">Try a different combination of settings to get better results.</p>
            <Button onClick={onReset} variant="secondary" className="mt-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try different preferences
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-8">
              {filteredRecommendations.map((film) => (
                <FilmCard 
                  key={film.id} 
                  film={film} 
                  recommendationContext={preferences}
                  onDisliked={onDisliked}
                />
              ))}
            </div>
            
            {filteredRecommendations.length === 0 && (
              <div className="bg-white p-6 rounded-lg text-center border border-blue-100 shadow-md mt-6">
                <p className="text-gray-800">No {filterType} films found in your recommendations.</p>
                <Button onClick={() => setFilterType("all")} variant="link" className="mt-2">
                  Show all recommendations
                </Button>
              </div>
            )}
          </>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {onGenerateMore && hasMoreToGenerate && (
            <Button
              onClick={onGenerateMore}
              variant="default"
              size="lg"
              className="px-8 py-3 bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Show More Films
            </Button>
          )}
          <Button
            onClick={onReset}
            variant="default"
            size="lg"
            className="px-8 py-3 bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    </section>
  );
}
