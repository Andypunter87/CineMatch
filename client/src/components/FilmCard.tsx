import { useState, useEffect } from "react";
import { type Film } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Film as FilmIcon, Star, Award, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FilmCardProps {
  film: Film;
}

export default function FilmCard({ film }: FilmCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Preload image to check its validity
  useEffect(() => {
    if (!film.posterUrl) {
      setImageError(true);
      setIsLoading(false);
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
      setImageError(false);
    };
    img.onerror = () => {
      setIsLoading(false);
      setImageError(true);
    };
    img.src = film.posterUrl;
  }, [film.posterUrl]);
  
  // Create a fallback image when poster URL is broken or missing
  const handleImageError = () => {
    setImageError(true);
  };

  // Ensure we have valid film data
  const title = film.title || "Unknown Title";
  const year = film.year || "Unknown Year";
  const director = film.director || "Unknown Director";
  const actors = Array.isArray(film.actors) && film.actors.length > 0 
    ? film.actors 
    : ["Unknown Cast"];
  const synopsis = film.synopsis || "No synopsis available";
  const genres = Array.isArray(film.genres) && film.genres.length > 0 
    ? film.genres 
    : ["Drama"];
  const matchPercentage = film.matchPercentage || 90;
  
  return (
    <Card className="recommendation-card bg-white rounded-lg overflow-hidden shadow-lg border border-blue-100 group hover:shadow-xl transition-all duration-200 h-full flex flex-col">
      <div className="relative flex-shrink-0">
        {isLoading ? (
          <div className="recommendation-image w-full h-64 bg-blue-50 flex items-center justify-center animate-pulse">
            <FilmIcon className="w-10 h-10 text-blue-200" />
          </div>
        ) : imageError ? (
          <div className="recommendation-image w-full h-64 bg-blue-100 flex items-center justify-center">
            <div className="flex flex-col items-center p-2 text-center">
              <FilmIcon className="w-12 h-12 text-primary opacity-60 mb-2" />
              <p className="text-primary/70 font-medium text-lg">{title}</p>
              <p className="text-primary/50 text-sm">{year} • {film.type}</p>
            </div>
          </div>
        ) : (
          <img 
            src={film.posterUrl} 
            alt={title} 
            onError={handleImageError}
            className="recommendation-image w-full h-72 object-cover transition-all duration-300 group-hover:brightness-[0.9]"
          />
        )}
        
        {/* Match percentage badge */}
        <div className="absolute top-2 right-2">
          <Badge className="bg-primary text-white px-2 py-1 font-medium">
            <Star className="w-3 h-3 mr-1 inline" />
            {matchPercentage}% Match
          </Badge>
        </div>
        
        {/* Film type badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="outline" className="bg-white/80 text-gray-700 border-blue-200 px-2 py-1">
            {film.type === "indie" ? "Independent" : "Mainstream"}
          </Badge>
        </div>
        
        <div className="recommendation-details absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-gray-200 text-sm">
            {year} • {director}
          </p>
          <p className="mt-2 text-sm text-white leading-snug">{synopsis}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {genres.map((genre, index) => (
              <Badge key={index} variant="secondary" className="bg-blue-500/80 text-white">
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{title}</h3>
          <span className="text-gray-500 text-sm whitespace-nowrap ml-2">{year}</span>
        </div>
        
        <p className="text-gray-600 text-sm mt-1 line-clamp-1">
          <span className="font-medium">Director:</span> {director}
        </p>
        
        <p className="text-gray-600 text-sm mt-1 line-clamp-1">
          <span className="font-medium">Cast:</span> {actors.slice(0, 2).join(', ')}
          {actors.length > 2 ? '...' : ''}
        </p>
        
        <div className="mt-3 mb-1 flex flex-wrap gap-1">
          {genres.slice(0, 2).map((genre, index) => (
            <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {genre}
            </Badge>
          ))}
        </div>
        
        <div className="mt-auto pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-700 leading-snug">
            <Award className="inline-block w-4 h-4 mr-1 text-primary" />
            <span className="text-primary font-medium">Why it matches:</span> {' '}
            <span className="text-gray-600">{film.matchReason || 'Matches your preferences'}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
