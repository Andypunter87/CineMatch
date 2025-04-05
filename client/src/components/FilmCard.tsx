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
  
  // Create a fallback data URI in case even the placeholder service fails
  const generateFallbackImage = () => {
    // Create a simple blue background with the title text
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 750;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Draw background
    ctx.fillStyle = '#3498db';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    
    // Get title and year
    const movieTitle = film.title || 'Movie';
    const displayTitle = movieTitle.length > 20 
      ? movieTitle.substring(0, 20) + '...' 
      : movieTitle;
    
    // Center the text
    ctx.fillText(displayTitle, canvas.width / 2, canvas.height / 2);
    
    // Draw year if available
    if (film.year) {
      ctx.font = '24px Arial';
      ctx.fillText(`(${film.year})`, canvas.width / 2, canvas.height / 2 + 40);
    }
    
    // Return data URI
    return canvas.toDataURL('image/png');
  };
  
  // Preload image to check its validity
  useEffect(() => {
    if (!film.posterUrl) {
      setImageError(true);
      setIsLoading(false);
      return;
    }
    
    // Set a timer to ensure we don't wait too long for images
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    
    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
      setImageError(false);
      clearTimeout(loadingTimer);
    };
    img.onerror = () => {
      setIsLoading(false);
      setImageError(true);
      clearTimeout(loadingTimer);
    };
    img.src = film.posterUrl;
    
    return () => clearTimeout(loadingTimer);
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
          <img 
            src={generateFallbackImage()}
            alt={title} 
            className="recommendation-image w-full h-72 object-cover"
          />
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
