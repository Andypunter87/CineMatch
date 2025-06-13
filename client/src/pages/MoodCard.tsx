import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Instagram, Twitter, Copy, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MoodCardData {
  moodName: string;
  subtitle: string;
  bgColour: string;
  emojis: string;
  topFilms: string[];
  placidImageUrl?: string;
  year: number;
  month: number;
}

export default function MoodCard() {
  const { year, month } = useParams();
  const [location] = useLocation();
  const { toast } = useToast();
  const [moodCard, setMoodCard] = useState<MoodCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if this is a public share URL
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const uid = urlParams.get('uid');
  const isPublicShare = !!uid;

  useEffect(() => {
    const fetchMoodCard = async () => {
      try {
        setLoading(true);
        setError(null);

        const endpoint = isPublicShare 
          ? `/api/mood-card/public/${year}/${month}?uid=${uid}`
          : `/api/mood-card/${year}/${month}`;

        const response = await fetch(endpoint);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Mood card not found for this month");
          }
          throw new Error("Failed to load mood card");
        }

        const data = await response.json();
        setMoodCard(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load mood card");
      } finally {
        setLoading(false);
      }
    };

    if (year && month) {
      fetchMoodCard();
    }
  }, [year, month, uid, isPublicShare]);

  const generateMoodCard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mood-card/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year: parseInt(year!),
          month: parseInt(month!)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate mood card");
      }

      const data = await response.json();
      setMoodCard(data);
      toast({
        title: "Mood card generated!",
        description: "Your monthly mood card is ready to share",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to generate mood card",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const shareToInstagram = () => {
    if (moodCard?.placidImageUrl) {
      // Instagram doesn't support direct sharing, so we'll copy the image URL
      navigator.clipboard.writeText(moodCard.placidImageUrl);
      toast({
        title: "Image URL copied!",
        description: "Paste this URL in Instagram to share your mood card",
      });
    }
  };

  const shareToTwitter = () => {
    if (moodCard) {
      const shareUrl = `${window.location.origin}/mymood/${year}-${month?.padStart(2, '0')}?uid=${uid || 'user'}`;
      const text = `My ${getMonthName(parseInt(month!))} CineMatch mood: ${moodCard.moodName} ${moodCard.emojis}`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, '_blank');
    }
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/mymood/${year}-${month?.padStart(2, '0')}?uid=${uid || 'user'}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Share this link with friends to show your mood card",
    });
  };

  const downloadImage = () => {
    if (moodCard?.placidImageUrl) {
      const link = document.createElement('a');
      link.href = moodCard.placidImageUrl;
      link.download = `${moodCard.moodName}-${year}-${month}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getMonthName = (monthNum: number) => {
    return new Date(2000, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your mood card...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !moodCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Mood Card Found</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              {!isPublicShare && (
                <Button onClick={generateMoodCard} className="bg-blue-600 hover:bg-blue-700">
                  Generate Mood Card
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!moodCard) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getMonthName(moodCard.month)} {moodCard.year} Mood Card
          </h1>
          <p className="text-gray-600">
            {isPublicShare ? "Shared mood card" : "Your monthly film mood"}
          </p>
        </div>

        {/* Main Mood Card */}
        <Card className="mb-8 overflow-hidden">
          <div 
            className="p-8 text-white text-center"
            style={{ backgroundColor: moodCard.bgColour }}
          >
            <div className="text-4xl mb-4">{moodCard.emojis}</div>
            <h2 className="text-3xl font-bold mb-3">{moodCard.moodName}</h2>
            <p className="text-lg opacity-90">{moodCard.subtitle}</p>
          </div>

          {/* Placid Image */}
          {moodCard.placidImageUrl && (
            <div className="relative">
              <img 
                src={moodCard.placidImageUrl} 
                alt={`${moodCard.moodName} mood card`}
                className="w-full h-auto"
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-center">Your Top Films This Month</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {moodCard.topFilms.map((film, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {film}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sharing Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Your Mood
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                onClick={shareToInstagram}
                className="flex items-center gap-2"
              >
                <Instagram className="h-4 w-4" />
                Instagram
              </Button>
              
              <Button 
                variant="outline" 
                onClick={shareToTwitter}
                className="flex items-center gap-2"
              >
                <Twitter className="h-4 w-4" />
                Twitter
              </Button>
              
              <Button 
                variant="outline" 
                onClick={copyShareLink}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
              
              {moodCard.placidImageUrl && (
                <Button 
                  variant="outline" 
                  onClick={downloadImage}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p>Powered by CineMatch - Discover your film mood</p>
        </div>
      </div>
    </div>
  );
}