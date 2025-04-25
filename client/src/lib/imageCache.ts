/**
 * Image Cache Service
 * 
 * This service helps with reliable image loading by:
 * - Prefetching images before they're rendered
 * - Caching loaded images in memory
 * - Providing fallback URLs when images fail to load
 * - Proxying images through server for better reliability
 */

// Cache entry definition
interface CacheEntry {
  status: 'loading' | 'loaded' | 'error';
  imagePromise?: Promise<void>;
  timestamp: number;
}

// In-memory cache to store image loading status
const imageCache: Record<string, CacheEntry> = {};

/**
 * Standardize TMDB image URLs to always use the direct format
 * This makes caching more reliable
 */
function standardizeTmdbUrl(url: string): string {
  if (!url) return url;
  
  // Check if this is already a direct TMDB image URL
  if (url.includes('image.tmdb.org/t/p/')) {
    return url;
  }
  
  // Extract the image ID from a TMDB URL
  const tmdbFilePathPattern = /\/([a-zA-Z0-9]{20,})\.(jpg|jpeg|png)$/i;
  const match = url.match(tmdbFilePathPattern);
  
  if (match && match[1]) {
    const imageId = match[1];
    const extension = match[2] || 'jpg';
    return `https://image.tmdb.org/t/p/w500/${imageId}.${extension}`;
  }
  
  // If we couldn't extract the ID, return the original URL
  return url;
}

/**
 * Validates URL string format
 */
function isValidUrl(urlString: string): boolean {
  try {
    // Simple validation - check if string looks like a URL
    return urlString.startsWith('http://') || 
           urlString.startsWith('https://') || 
           urlString.startsWith('//');
  } catch (error) {
    console.error('URL validation error:', error);
    return false;
  }
}

/**
 * Converts a movie poster URL to use our proxy service
 * This improves reliability by handling network errors and providing fallbacks
 */
export function getPosterProxyUrl(url: string): string {
  // More thorough validation of poster URLs
  if (!url || url.trim() === '' || url.length < 10 || !isValidUrl(url)) {
    console.log('Invalid poster URL, returning empty string:', url);
    return ''; // Return empty string instead of a fallback to trigger the fallback UI
  }
  
  // If it's already using our proxy, return as is
  if (url.startsWith('/api/image/poster')) return url;
  
  // Standardize the URL format for TMDB images
  const standardizedUrl = standardizeTmdbUrl(url);
  
  // Encode the URL properly
  const encodedUrl = encodeURIComponent(standardizedUrl);
  return `/api/image/poster?url=${encodedUrl}`;
}

/**
 * Prefetch a batch of images in the background
 * @param urls Array of image URLs to prefetch
 */
export function prefetchImages(urls: string[]): void {
  urls.forEach(url => {
    if (!url) return;
    
    // Skip if already in cache and not in error state
    if (imageCache[url] && imageCache[url].status !== 'error') {
      return;
    }
    
    // Set initial cache status
    imageCache[url] = { 
      status: 'loading',
      timestamp: Date.now()
    };
    
    // Create image element and load the image
    const img = new Image();
    
    // Create a promise that resolves when the image loads or rejects on error
    const imagePromise = new Promise<void>((resolve, reject) => {
      img.onload = () => {
        imageCache[url] = {
          ...imageCache[url],
          status: 'loaded',
          timestamp: Date.now()
        };
        console.log('Image prefetched successfully:', url);
        resolve();
      };
      
      img.onerror = () => {
        imageCache[url] = {
          ...imageCache[url],
          status: 'error',
          timestamp: Date.now()
        };
        console.error('Failed to prefetch image:', url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      // Start loading the image
      img.src = url;
    });
    
    imageCache[url].imagePromise = imagePromise;
  });
}

/**
 * Check if an image is cached and its status
 * @param url Image URL
 * @returns Cache entry if exists, undefined otherwise
 */
export function getImageStatus(url: string): CacheEntry | undefined {
  return imageCache[url];
}

/**
 * Get a fallback URL for poster images
 * @param title Movie title (optional)
 * @returns A fallback placeholder image URL
 */
export function getPlaceholderPosterUrl(title?: string): string {
  // Use our local SVG placeholder image
  return '/fallback/poster-placeholder.svg';
}

/**
 * Preload a specific image and return a promise
 * @param url Image URL to preload
 * @returns Promise that resolves when image is loaded or rejects on error
 */
export async function preloadImage(url: string): Promise<void> {
  // Skip invalid URLs
  if (!url) {
    return Promise.reject(new Error('Invalid URL'));
  }
  
  // Return cached promise if available
  if (imageCache[url]?.imagePromise) {
    return imageCache[url].imagePromise;
  }
  
  // Otherwise prefetch the image and return the promise
  prefetchImages([url]);
  return imageCache[url].imagePromise!;
}