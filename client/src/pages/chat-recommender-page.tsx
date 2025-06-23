import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Film } from 'lucide-react';
import ChatRecommender from '@/components/ChatRecommender';
import { RecommendationRequest, Film as FilmType } from '@shared/schema';
import { Link } from 'wouter';

interface User {
  id: number;
  name: string;
  email: string;
}

export default function ChatRecommenderPage() {
  const [showChat, setShowChat] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<FilmType[]>([]);
  const [recommendationRequest, setRecommendationRequest] = useState<RecommendationRequest | null>(null);

  // Get current user
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  const handleChatComplete = async (request: RecommendationRequest) => {
    setRecommendationRequest(request);
    setIsGenerating(true);
    
    try {
      // Call the existing recommendation API
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      // Handle error appropriately
    } finally {
      setIsGenerating(false);
    }
  };

  const startNewChat = () => {
    setShowChat(true);
    setRecommendations([]);
    setRecommendationRequest(null);
    setIsGenerating(false);
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
              <h3 className="text-lg font-semibold">Finding your perfect films...</h3>
              <p className="text-gray-600">CineMate is curating personalized recommendations just for you.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (recommendations.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Personalized Recommendations</h1>
              <p className="text-gray-600 mt-2">Based on your conversation with CineMate</p>
            </div>
            <Button onClick={startNewChat} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Recommendations
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((film, index) => (
              <Card key={film.id || index} className="overflow-hidden hover:shadow-lg transition-shadow">
                {film.posterUrl && (
                  <div className="aspect-[2/3] relative overflow-hidden">
                    <img
                      src={film.posterUrl}
                      alt={film.title}
                      className="w-full h-full object-cover"
                    />
                    {film.matchPercentage && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                        {film.matchPercentage}% match
                      </div>
                    )}
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{film.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {film.year} • {film.director}
                  </p>
                  {film.genres && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {film.genres.slice(0, 3).map((genre, i) => (
                        <span
                          key={i}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                  {film.synopsis && (
                    <p className="text-gray-700 text-sm line-clamp-3 mb-3">
                      {film.synopsis}
                    </p>
                  )}
                  {film.matchReason && (
                    <p className="text-blue-600 text-sm font-medium">
                      {film.matchReason}
                    </p>
                  )}
                  {film.availableOn && film.availableOn.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500 mb-1">Available on:</p>
                      <div className="flex flex-wrap gap-1">
                        {film.availableOn.map((service, i) => (
                          <span
                            key={i}
                            className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setShowChat(false)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <ChatRecommender 
            onComplete={handleChatComplete}
            userId={user?.id}
          />
        </div>
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="mb-8">
          <Film className="w-16 h-16 mx-auto text-blue-500 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Meet CineMate
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Your personal film curator who finds the perfect movie based on your mood, 
            company, and preferences through a friendly conversation.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-left">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <h4 className="font-semibold">Chat with CineMate</h4>
                <p className="text-gray-600 text-sm">Answer a few friendly questions about your mood and viewing situation</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <h4 className="font-semibold">Get personalized picks</h4>
                <p className="text-gray-600 text-sm">Receive curated recommendations tailored to your preferences</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <h4 className="font-semibold">Discover your next favorite</h4>
                <p className="text-gray-600 text-sm">Find films available on your streaming services with detailed reasons why they match</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={startNewChat} size="lg" className="text-lg px-8 py-3">
          Start Chatting with CineMate
        </Button>

        <div className="mt-6">
          <p className="text-sm text-gray-500">
            Already have an account? <Link href="/"><a className="text-blue-600 hover:underline">Go to dashboard</a></Link>
          </p>
        </div>
      </div>
    </div>
  );
}