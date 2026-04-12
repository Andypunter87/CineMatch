import { useState, useEffect, useCallback } from "react";
import { type Film, type RecommendationRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import FilmCard from "./FilmCard";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { useSwipeable } from "react-swipeable";

interface OnboardingAwareRecommendationContext extends RecommendationRequest {
  isOnboarding?: boolean;
}

interface RecommendationsProps {
  recommendations: Film[];
  isLoading: boolean;
  preferences: OnboardingAwareRecommendationContext;
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isLongLoading, setIsLongLoading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setIsLongLoading(false);
      timer = setTimeout(() => setIsLongLoading(true), 7000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [isLoading]);

  const filteredRecommendations = recommendations.filter(
    film => filterType === "all" || film.type === filterType
  );

  const total = filteredRecommendations.length;

  const goNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [filterType]);

  // Clamp currentIndex if the filtered list shrinks (e.g. after filter change lands)
  useEffect(() => {
    if (total > 0 && currentIndex >= total) {
      setCurrentIndex(total - 1);
    }
  }, [total, currentIndex]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goNext,
    onSwipedRight: goPrev,
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  const getLocationText = (location: string) => {
    switch (location) {
      case "home": return "At Home";
      case "travel": return "Traveling";
      case "date": return "Date Night";
      case "friends": return "With Friends";
      default: return location;
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
    }).filter(Boolean).join(", ");
  };

  const getMoodText = (mood: string) => {
    switch (mood) {
      case "laugh": return "Laugh";
      case "think": return "Think";
      case "cry": return "Cry";
      case "thrill": return "Thrill";
      case "escape": return "Escape";
      case "inspire": return "Inspire";
      default: return mood;
    }
  };

  const currentFilm = filteredRecommendations[currentIndex] ?? null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-white py-5 px-8 rounded-2xl border shadow-md flex items-center space-x-3 mb-8">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          <p className="text-gray-800">
            {isLongLoading
              ? "Nearly there! Thanks for waiting..."
              : "Getting your personalized film recommendations..."}
          </p>
        </div>
        <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-lg border border-blue-100 filter blur-sm">
          <Skeleton className="w-full h-64 bg-blue-100" />
          <div className="p-5 bg-white">
            <Skeleton className="h-6 w-3/4 mb-3 bg-blue-100" />
            <Skeleton className="h-4 w-1/2 mb-4 bg-blue-100" />
            <Skeleton className="h-16 w-full bg-blue-100" />
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="bg-white p-8 rounded-2xl text-center border border-blue-100 shadow-md max-w-sm w-full">
          <div className="text-primary opacity-40 text-5xl mb-4">¯\_(ツ)_/¯</div>
          <p className="text-xl text-gray-800 font-medium">No recommendations found.</p>
          <p className="mt-2 text-gray-600 mb-4">Try a different combination of settings.</p>
          <Button onClick={onReset} variant="secondary" className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try different preferences
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] bg-background">
      {/* Collapsible top bar: preferences + filters */}
      <div className="border-b bg-white dark:bg-zinc-900 shadow-sm">
        <button
          data-testid="button-toggle-filters"
          onClick={() => setIsFiltersOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            {getLocationText(preferences.location)} · {getMoodText(preferences.mood)}
            {preferences.audience && preferences.audience !== "solo" && ` · ${preferences.audience}`}
          </span>
          {isFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isFiltersOpen && (
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            <div className="text-xs text-gray-500 space-y-1">
              <p><span className="font-medium text-gray-700">Setting:</span> {getLocationText(preferences.location)}</p>
              <p><span className="font-medium text-gray-700">Time:</span> {getTimeText(preferences.timeOfDay)}</p>
              <p><span className="font-medium text-gray-700">Mood:</span> {getMoodText(preferences.mood)}</p>
              {preferences.country && (
                <p><span className="font-medium text-gray-700">Country:</span> {preferences.country}</p>
              )}
              {preferences.streamingServices && preferences.streamingServices.length > 0 && (
                <p><span className="font-medium text-gray-700">Services:</span> {preferences.streamingServices.join(", ")}</p>
              )}
              {preferences.viewingParty && preferences.viewingParty.length > 0 && (
                <p><span className="font-medium text-gray-700">Party:</span> {preferences.viewingParty.length} friend{preferences.viewingParty.length !== 1 ? "s" : ""}</p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["all", "mainstream", "indie"] as const).map(type => (
                <Button
                  key={type}
                  data-testid={`button-filter-${type}`}
                  onClick={() => setFilterType(type)}
                  variant={filterType === type ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-3"
                >
                  {type === "all" ? "All Films" : type === "mainstream" ? "Mainstream" : "Indie / Foreign"}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main swipe area */}
      <div className="flex flex-col flex-1 items-center justify-start pt-4 pb-4 px-4">
        {/* Progress indicator */}
        {total > 0 && (
          <div
            data-testid="text-card-progress"
            className="text-sm font-medium text-gray-500 mb-3 tabular-nums"
          >
            {currentIndex + 1} / {total}
          </div>
        )}

        {/* Swipeable card area */}
        {currentFilm ? (
          <div
            {...swipeHandlers}
            className="w-full max-w-sm mx-auto touch-pan-y select-none"
          >
            <FilmCard
              key={currentFilm.id}
              film={currentFilm}
              swipeMode
              recommendationContext={{
                ...preferences,
                isOnboarding: false,
              }}
              onDisliked={onDisliked}
            />
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl text-center border border-blue-100 shadow-md max-w-sm w-full">
            <p className="text-gray-800">No {filterType} films in your recommendations.</p>
            <Button onClick={() => setFilterType("all")} variant="link" className="mt-2">
              Show all recommendations
            </Button>
          </div>
        )}

        {/* Navigation row */}
        {total > 0 && (
          <div className="flex items-center justify-between w-full max-w-sm mx-auto mt-4 gap-3">
            <Button
              data-testid="button-prev-card"
              variant="outline"
              size="icon"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="rounded-full h-11 w-11 shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {/* Dot indicators */}
            <div className="flex gap-1.5 flex-wrap justify-center flex-1">
              {filteredRecommendations.map((_, i) => (
                <button
                  key={i}
                  data-testid={`button-dot-${i}`}
                  onClick={() => setCurrentIndex(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === currentIndex
                      ? "w-4 h-2 bg-primary"
                      : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            <Button
              data-testid="button-next-card"
              variant="outline"
              size="icon"
              onClick={goNext}
              disabled={currentIndex === total - 1}
              className="rounded-full h-11 w-11 shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Bottom actions */}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {hasMoreToGenerate && onGenerateMore && (
            <Button
              data-testid="button-generate-more"
              onClick={onGenerateMore}
              variant="outline"
              size="sm"
              className="px-6"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              More Recommendations
            </Button>
          )}
          <Button
            data-testid="button-start-over"
            onClick={onReset}
            variant="default"
            size="sm"
            className="px-6"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    </div>
  );
}
