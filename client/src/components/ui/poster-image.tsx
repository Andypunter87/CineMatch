import React, { useState, useEffect } from 'react';
import { Film as FilmIcon, Loader2 } from 'lucide-react';
import { 
  prefetchImages, 
  getImageStatus, 
  getPlaceholderPosterUrl,
  getPosterProxyUrl
} from '@/lib/imageCache';

interface PosterImageProps {
  posterUrl: string;
  title: string;
  className?: string;
  showLoadingState?: boolean;
  showErrorState?: boolean;
  priority?: boolean;
}

/**
 * Enhanced poster image component with loading states and fallbacks
 */
export const PosterImage: React.FC<PosterImageProps> = ({
  posterUrl,
  title,
  className = '',
  showLoadingState = true,
  showErrorState = true,
  priority = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  // Get the proxied URL for the poster
  const proxiedPosterUrl = getPosterProxyUrl(posterUrl);
  
  // Check cache on mount
  useEffect(() => {
    const cachedStatus = getImageStatus(proxiedPosterUrl);
    if (cachedStatus) {
      if (cachedStatus.status === 'loaded') {
        setLoaded(true);
      } else if (cachedStatus.status === 'error') {
        setError(true);
      }
    }
    
    // If not cached or priority image, prefetch immediately
    if (!cachedStatus || priority) {
      prefetchImages([proxiedPosterUrl]);
    }
  }, [proxiedPosterUrl, priority]);
  
  // Handle image load and error events
  const handleLoad = () => {
    setLoaded(true);
  };
  
  const handleError = () => {
    setLoaded(true);
    setError(true);
  };
  
  return (
    <div className={`relative ${className}`}>
      {/* Loading state */}
      {!loaded && showLoadingState && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        </div>
      )}
      
      {/* Error state */}
      {error && showErrorState && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
          <FilmIcon className="h-16 w-16 mb-2 text-gray-500" />
          <span className="text-gray-400 text-sm text-center px-4">
            {title || 'Poster not available'}
          </span>
        </div>
      )}
      
      {/* The actual image */}
      <img 
        src={error ? getPlaceholderPosterUrl(title) : proxiedPosterUrl} 
        alt={`${title} poster`} 
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded && !error ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export default PosterImage;