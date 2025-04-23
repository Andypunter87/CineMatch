/**
 * Image Cache Service
 * 
 * This service helps with reliable image loading by:
 * - Prefetching images before they're rendered
 * - Caching loaded images in memory
 * - Providing fallback URLs when images fail to load
 */

interface CacheEntry {
  status: 'loading' | 'loaded' | 'error';
  imagePromise?: Promise<void>;
}

// In-memory cache to store image loading status
const imageCache: Record<string, CacheEntry> = {};

/**
 * Prefetch a batch of images in the background
 * @param urls Array of image URLs to prefetch
 */
export const prefetchImages = (urls: string[]): void => {
  urls.forEach(url => {
    if (!url) return;
    
    // Skip if already in cache
    if (imageCache[url] && imageCache[url].status !== 'error') {
      return;
    }
    
    // Set initial cache status
    imageCache[url] = { status: 'loading' };
    
    // Create image element and load the image
    const img = new Image();
    
    // Create a promise that resolves when the image loads or rejects on error
    const imagePromise = new Promise<void>((resolve, reject) => {
      img.onload = () => {
        imageCache[url].status = 'loaded';
        resolve();
      };
      
      img.onerror = () => {
        imageCache[url].status = 'error';
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      // Start loading the image
      img.src = url;
    });
    
    imageCache[url].imagePromise = imagePromise;
  });
};

/**
 * Check if an image is cached and its status
 * @param url Image URL
 * @returns Cache entry if exists, undefined otherwise
 */
export const getImageStatus = (url: string): CacheEntry | undefined => {
  return imageCache[url];
};

/**
 * Get a fallback URL for poster images
 * @param title Movie title
 * @returns A generated placeholder URL based on the title
 */
export const getPlaceholderPosterUrl = (title: string): string => {
  // Generate a URL for the placeholder image with the title text
  return `https://placehold.co/300x450/1a1a2e/ffffff?text=${encodeURIComponent(title)}`;
};

/**
 * Preload a specific image and return a promise
 * @param url Image URL to preload
 * @returns Promise that resolves when image is loaded or rejects on error
 */
export const preloadImage = async (url: string): Promise<void> => {
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
};