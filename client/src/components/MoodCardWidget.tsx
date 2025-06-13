import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Share2, Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MoodCardData {
  id: number;
  moodName: string;
  subtitle: string;
  bgColour: string;
  emojis: string;
  topFilms: string[];
  placidImageUrl?: string;
  year: number;
  month: number;
}

interface MoodCardWidgetProps {
  userId?: number;
  showHeader?: boolean;
}

export default function MoodCardWidget({ userId, showHeader = true }: MoodCardWidgetProps) {
  const [currentMoodCard, setCurrentMoodCard] = useState<MoodCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLatestMoodCard();
  }, []);

  const fetchLatestMoodCard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current month mood card
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const response = await fetch(`/api/mood-card/${year}/${month}`);
      
      if (response.status === 404) {
        // Try previous month if current month doesn't exist
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        
        const prevResponse = await fetch(`/api/mood-card/${prevYear}/${prevMonth}`);
        
        if (prevResponse.ok) {
          const data = await prevResponse.json();
          setCurrentMoodCard(data);
        } else {
          setCurrentMoodCard(null);
        }
      } else if (response.ok) {
        const data = await response.json();
        setCurrentMoodCard(data);
      } else {
        throw new Error("Failed to load mood card");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mood card");
    } finally {
      setLoading(false);
    }
  };

  const generateCurrentMoodCard = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const response = await fetch('/api/mood-card/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year, month })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate mood card");
      }

      const data = await response.json();
      setCurrentMoodCard(data);
      toast({
        title: "Your mood card is ready!",
        description: "Your latest film mood has been generated",
      });
    } catch (err) {
      toast({
        title: "Unable to generate mood card",
        description: err instanceof Error ? err.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openFullMoodCard = () => {
    if (currentMoodCard) {
      const monthStr = currentMoodCard.month.toString().padStart(2, '0');
      window.open(`/mymood/${currentMoodCard.year}-${monthStr}`, '_blank');
    }
  };

  const getMonthName = (monthNum: number) => {
    return new Date(2000, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  };

  if (loading) {
    return (
      <Card className="w-full">
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Your Film Mood
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentMoodCard) {
    return (
      <Card className="w-full">
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Your Film Mood
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No mood card available yet</p>
          <p className="text-sm text-gray-500 mb-6">
            Add some films to your watchlist to generate your monthly mood
          </p>
          <Button onClick={generateCurrentMoodCard} className="bg-blue-600 hover:bg-blue-700">
            Generate This Month's Mood
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Your {getMonthName(currentMoodCard.month)} Mood
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {/* Mood Card Preview */}
        <div 
          className="rounded-lg p-6 text-white text-center mb-4"
          style={{ backgroundColor: currentMoodCard.bgColour }}
        >
          <div className="text-2xl mb-2">{currentMoodCard.emojis}</div>
          <h3 className="text-xl font-bold mb-2">{currentMoodCard.moodName}</h3>
          <p className="text-sm opacity-90">{currentMoodCard.subtitle}</p>
        </div>

        {/* Top Films */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Your Top Films</h4>
          <div className="flex flex-wrap gap-1">
            {currentMoodCard.topFilms.slice(0, 3).map((film, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {film}
              </Badge>
            ))}
            {currentMoodCard.topFilms.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{currentMoodCard.topFilms.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={openFullMoodCard}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            View Full Card
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (currentMoodCard) {
                const shareUrl = `${window.location.origin}/mymood/${currentMoodCard.year}-${currentMoodCard.month.toString().padStart(2, '0')}?uid=${userId}`;
                navigator.clipboard.writeText(shareUrl);
                toast({
                  title: "Share link copied!",
                  description: "Share your mood card with friends",
                });
              }
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}