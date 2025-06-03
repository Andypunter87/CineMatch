/**
 * FilmInfo Component
 * 
 * Handles the presentation of film data including:
 * - Film poster and basic information
 * - Streaming availability and badges
 * - Match percentage and insights
 * - Director and year information
 * 
 * This component was extracted from FilmCard to separate data
 * presentation logic from action handling.
 */

import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Film as FilmIcon, Star, Award, Clock, Globe, Info } from 'lucide-react';
import { type Film } from '@shared/schema';
import { FilmInsight } from '@/hooks/use-feedback-insight';
import { EnhancedFilmInsight } from '@/hooks/use-enhanced-insights';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FilmInfoProps {
  film: Film;
  insight?: FilmInsight | null;
  enhancedInsight?: EnhancedFilmInsight | null;
}

export default function FilmInfo({ film, insight, enhancedInsight }: FilmInfoProps) {
  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatStreamingProviders = (providers: string[] | undefined) => {
    if (!providers || providers.length === 0) return [];
    
    // Clean up provider names and remove duplicates
    const cleanedProviders = providers.map(provider => {
      if (typeof provider !== 'string') return '';
      return provider
        .replace(/\s*\(.*?\)/g, '') // Remove text in parentheses
        .replace(/\s*(UK|US|Free|Premium|Ad-supported).*$/i, '') // Remove country/type suffixes
        .trim();
    }).filter(Boolean);
    
    const uniqueProviders = Array.from(new Set(cleanedProviders));
    return uniqueProviders.slice(0, 3); // Limit to 3 providers
  };

  const streamingProviders = formatStreamingProviders((film as any).streamingProviders);

  return (
    <Link href={`/film/${film.id}`}>
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 relative">
        {/* Match percentage badge */}
        {film.matchPercentage && (
          <div className="absolute top-3 left-3 z-10">
            <Badge 
              variant="secondary" 
              className="bg-green-500 text-white font-semibold px-2 py-1 text-xs"
            >
              {Math.round(film.matchPercentage)}% match
            </Badge>
          </div>
        )}

        {/* Enhanced insight badge */}
        {enhancedInsight && enhancedInsight.reason && !enhancedInsight.reason.includes('No specific') && (
          <div className="absolute top-3 right-3 z-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge 
                    variant="outline" 
                    className="bg-blue-50 border-blue-200 text-blue-700 text-xs px-2 py-1 flex items-center gap-1"
                  >
                    <Info className="h-3 w-3" />
                    Why this?
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">{enhancedInsight.reason}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Film poster */}
        <div className="aspect-[2/3] bg-gray-100 flex items-center justify-center relative overflow-hidden">
          {film.posterUrl ? (
            <img
              src={`/api/image?url=${encodeURIComponent(film.posterUrl)}&w=400&h=600&fit=cover`}
              alt={`${film.title} poster`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`${film.posterUrl ? 'hidden' : ''} flex flex-col items-center justify-center text-gray-400 p-4`}>
            <FilmIcon className="w-16 h-16 mb-2" />
            <span className="text-sm text-center font-medium">{film.title}</span>
          </div>
        </div>

        {/* Film information */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg leading-tight mb-1">{film.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{film.year}</span>
              <span>•</span>
              <span className="capitalize">{film.type}</span>
              {film.runtime && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatRuntime(film.runtime)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Director */}
          {film.director && (
            <div className="text-sm text-gray-600">
              Directed by {film.director}
            </div>
          )}

          {/* Genres */}
          {film.genres && film.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {film.genres.slice(0, 3).map((genre) => (
                <Badge key={genre} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
              {film.genres.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{film.genres.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Rating */}
          {film.voteAverage && film.voteAverage > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">
                {film.voteAverage.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">TMDB</span>
            </div>
          )}

          {/* Streaming providers */}
          {streamingProviders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Globe className="w-4 h-4" />
                <span>Available on:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {streamingProviders.map((provider, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs bg-blue-100 text-blue-800"
                  >
                    {provider}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Insight nudge */}
          {insight && (insight as any).nudgeMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
              <div className="flex items-start gap-2">
                <Award className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-amber-800">{(insight as any).nudgeMessage}</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}