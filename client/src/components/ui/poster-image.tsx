import React, { useState, useEffect } from 'react';
import { Film as FilmIcon, Loader2 } from 'lucide-react';
import { 
  prefetchImages, 
  getImageStatus, 
  getPlaceholderPosterUrl,
  getPosterProxyUrl,
  isValidUrl
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
 * Adds robust handling of invalid poster URLs and image loading errors
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
  
  // Validate the URL before processing
  const isValidPosterUrl = React.useMemo(() => 
    posterUrl && posterUrl.trim() !== '' && isValidUrl(posterUrl),
    [posterUrl]
  );
  
  // Memoize the proxied URL to avoid recalculation on every render
  // Only create a proxy URL if the original URL is valid
  const proxiedPosterUrl = React.useMemo(() => 
    isValidPosterUrl ? getPosterProxyUrl(posterUrl) : '',
    [posterUrl, isValidPosterUrl]
  );
  
  // Check cache and prefetch only once on mount or when url/priority changes
  useEffect(() => {
    // If the URL is invalid, show error state immediately
    if (!isValidPosterUrl) {
      setError(true);
      setLoaded(true); // Mark as loaded so we show the error state right away
      return;
    }
    
    // Check if already in cache
    const cachedStatus = getImageStatus(proxiedPosterUrl);
    if (cachedStatus) {
      if (cachedStatus.status === 'loaded') {
        setLoaded(true);
      } else if (cachedStatus.status === 'error') {
        setError(true);
        setLoaded(true); // Mark as loaded so we show the error state
      }
    } else {
      // Reset state since we have a new image to load
      setLoaded(false);
      setError(false);
      
      // Prefetch the image
      prefetchImages([proxiedPosterUrl]); // Always prefetch, not just for priority images
    }
  }, [posterUrl, proxiedPosterUrl, priority, isValidPosterUrl]);
  
  // Handle image load and error events
  const handleLoad = () => {
    setLoaded(true);
  };
  
  const handleError = () => {
    setLoaded(true);
    setError(true);
  };
  
  // Use a fallback placeholder if there's an error or the URL is invalid
  const shouldShowFallback = error || !isValidPosterUrl;
  const fallbackImageUrl = getPlaceholderPosterUrl(title);
  
  return (
    <div className={`relative ${className}`}>
      {/* Loading state */}
      {!loaded && showLoadingState && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        </div>
      )}
      
      {/* Error state */}
      {shouldShowFallback && showErrorState && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
          <FilmIcon className="h-16 w-16 mb-2 text-gray-500" />
          <span className="text-gray-400 text-sm text-center px-4">
            {title || 'Poster not available'}
          </span>
        </div>
      )}
      
      {/* The actual image */}
      <img 
        src={shouldShowFallback ? fallbackImageUrl : proxiedPosterUrl} 
        alt={`${title} poster`} 
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded && !shouldShowFallback ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export default PosterImage;