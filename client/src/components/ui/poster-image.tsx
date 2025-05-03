import React, { useState, useEffect } from 'react';
import { Film as FilmIcon, Loader2 } from 'lucide-react';
import { 
  prefetchImages, 
  getImageStatus, 
  getPlaceholderPosterUrl,
  getPosterProxyUrl,
  isValidUrl,
  preloadImage
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
 * Logs image loading process for debugging
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
  const [imgSrc, setImgSrc] = useState<string>('');
  
  // Validate the URL before processing
  const isValidPosterUrl = React.useMemo(() => {
    const valid = posterUrl && posterUrl.trim() !== '' && isValidUrl(posterUrl);
    if (!valid && posterUrl) {
      console.warn(`Invalid poster URL for "${title}":`, posterUrl);
    }
    return valid;
  }, [posterUrl, title]);
  
  // Memoize the proxied URL to avoid recalculation on every render
  // Only create a proxy URL if the original URL is valid
  const proxiedPosterUrl = React.useMemo(() => {
    if (!isValidPosterUrl) return '';
    const proxied = getPosterProxyUrl(posterUrl, title); // Pass title for better debugging
    if (priority) {
      console.log(`Proxied poster URL for "${title}":`, proxied);
    }
    return proxied;
  }, [posterUrl, isValidPosterUrl, title, priority]);
  
  // Check cache and prefetch only once on mount or when url/priority changes
  useEffect(() => {
    // If the URL is invalid, show error state immediately
    if (!isValidPosterUrl) {
      console.log(`Using fallback for invalid URL: "${title}"`);
      setError(true);
      setLoaded(true); // Mark as loaded so we show the error state right away
      return;
    }
    
    // Check if already in cache
    const cachedStatus = getImageStatus(proxiedPosterUrl);
    if (cachedStatus) {
      if (cachedStatus.status === 'loaded') {
        if (priority) console.log(`Image for "${title}" already cached as loaded`);
        setLoaded(true);
        setImgSrc(proxiedPosterUrl);
      } else if (cachedStatus.status === 'error') {
        console.warn(`Image for "${title}" cached with error status`);
        setError(true);
        setLoaded(true); // Mark as loaded so we show the error state
      }
    } else {
      // Reset state since we have a new image to load
      setLoaded(false);
      setError(false);
      
      // For priority images, wait for preloading to complete before setting
      if (priority) {
        console.log(`Preloading priority image for "${title}"...`);
        preloadImage(proxiedPosterUrl)
          .then(() => {
            console.log(`Priority image preloaded successfully for "${title}"`);
            setImgSrc(proxiedPosterUrl);
            setLoaded(true);
          })
          .catch((err) => {
            console.error(`Failed to preload priority image for "${title}":`, err);
            setError(true);
            setLoaded(true);
          });
      } else {
        // For non-priority images, start loading immediately and prefetch in background
        setImgSrc(proxiedPosterUrl);
        prefetchImages([proxiedPosterUrl]);
      }
    }
  }, [posterUrl, proxiedPosterUrl, priority, isValidPosterUrl, title]);
  
  // Handle image load and error events
  const handleLoad = () => {
    if (priority) console.log(`Image loaded successfully for "${title}"`);
    setLoaded(true);
  };
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`Image loading error for "${title}":`, e.currentTarget.src);
    setLoaded(true);
    setError(true);
  };
  
  // Use a fallback placeholder if there's an error or the URL is invalid
  const shouldShowFallback = error || !isValidPosterUrl;
  const fallbackImageUrl = getPlaceholderPosterUrl(title);
  
  // Ensure we have a valid src value
  const effectiveSrc = shouldShowFallback ? fallbackImageUrl : (imgSrc || proxiedPosterUrl);
  
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
      
      {/* The actual image - shown even with fallback to support right-click etc. */}
      <img 
        src={effectiveSrc}
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