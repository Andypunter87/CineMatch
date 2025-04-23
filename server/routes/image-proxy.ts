import express, { Request, Response } from 'express';
import fetch, { Response as FetchResponse } from 'node-fetch';
import { URL } from 'url';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get directory info in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory to store cached images
const CACHE_DIR = path.join(__dirname, '../..', 'tmp', 'image-cache');

// Directory for fallback images
const FALLBACK_DIR = path.join(__dirname, '../..', 'client', 'public', 'fallback');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Ensure fallback directory exists
if (!fs.existsSync(FALLBACK_DIR)) {
  fs.mkdirSync(FALLBACK_DIR, { recursive: true });
}

// Path to the default fallback image
const FALLBACK_IMAGE_PATH = path.join(FALLBACK_DIR, 'poster-placeholder.svg');

/**
 * Serve the fallback placeholder image
 * @param res Express response object
 */
function serveFallbackImage(res: Response): void {
  // Check if fallback exists
  if (fs.existsSync(FALLBACK_IMAGE_PATH)) {
    // Set appropriate content-type based on the extension
    const contentType = 'image/svg+xml';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    
    // Stream the fallback image
    fs.createReadStream(FALLBACK_IMAGE_PATH).pipe(res);
  } else {
    res.status(404).send('Image not found and fallback image not available');
  }
}

/**
 * Generate a filename for caching based on the URL
 * @param url The URL to hash
 * @returns A safe filename for the cached image
 */
function getCacheFilename(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const parsed = new URL(url);
  const ext = path.extname(parsed.pathname) || '.jpg';
  return `${hash}${ext}`;
}

/**
 * Check if an image is cached
 * @param filename The cache filename
 * @returns true if cached, false otherwise
 */
function isImageCached(filename: string): boolean {
  const cachePath = path.join(CACHE_DIR, filename);
  return fs.existsSync(cachePath);
}

/**
 * Proxy endpoint that fetches and caches external images
 * Particularly useful for TMDB poster images to ensure reliability
 */
router.get('/poster', async (req: Request, res: Response) => {
  console.log('Image proxy endpoint called with query:', req.query);
  const originalUrl = req.query.url as string;
  
  if (!originalUrl || typeof originalUrl !== 'string') {
    return res.status(400).send('URL parameter is required');
  }
  
  // Create a variable to hold potentially modified URL
  let fetchUrl = originalUrl;
  
  try {
    // Check if this is a TMDB URL, and if so, convert it to the standard format
    if (fetchUrl.includes('themoviedb.org')) {
      // This is the standard TMDB image path format at the end of URLs
      // Example: /w3LxiVE8TvCkSSJ3L5LY23mpvzb.jpg
      const tmdbFilePathPattern = /\/([a-zA-Z0-9]{20,})\.(jpg|png|jpeg)$/i;
      const match = fetchUrl.match(tmdbFilePathPattern);
      
      if (match && match[1]) {
        const imageId = match[1];
        const extension = match[2] || 'jpg';
        
        // Construct the URL using the direct TMDB image API format
        fetchUrl = `https://image.tmdb.org/t/p/w500/${imageId}.${extension}`;
        console.log('Converted TMDB URL to:', fetchUrl);
      } else {
        console.log('Could not extract image ID from TMDB URL:', fetchUrl);
      }
    }
    
    // Verify the URL is a valid image URL (allow only specific domains for security)
    const imageUrl = new URL(fetchUrl);
    const allowedDomains = ['www.themoviedb.org', 'image.tmdb.org'];
    
    if (!allowedDomains.some(domain => imageUrl.hostname.includes(domain))) {
      return res.status(403).send('Domain not allowed');
    }
    
    // Create a cache filename based on the URL
    const cacheFilename = getCacheFilename(fetchUrl);
    const cachePath = path.join(CACHE_DIR, cacheFilename);
    
    // Check if the image is already cached
    if (isImageCached(cacheFilename)) {
      // Set appropriate content-type
      const ext = path.extname(cachePath).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      
      // Add cache control headers
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      
      // Stream the cached file
      return fs.createReadStream(cachePath).pipe(res);
    }
    
    // If not cached, fetch the image
    console.log('Fetching image from URL:', fetchUrl);
    
    let response: FetchResponse;
    try {
      response = await fetch(fetchUrl, { timeout: 5000 }); // Add a timeout
      console.log('Fetch response status:', response.status, response.statusText);
      
      if (!response.ok) {
        console.log('Error fetching image, using fallback');
        return serveFallbackImage(res);
      }
    } catch (error: any) {
      console.log('Network error fetching image, using fallback:', error?.message || 'Unknown error');
      return serveFallbackImage(res);
    }
    
    // If we get here, we have a valid response
    try {
      // Get content type and verify it's an image
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        console.log('Invalid content type, using fallback:', contentType);
        return serveFallbackImage(res);
      }
      
      // Stream to both the cache file and the response
      const fileStream = fs.createWriteStream(cachePath);
      
      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      
      // Stream the response to both the client and the cache file
      if (response.body) {
        response.body.pipe(fileStream);
        response.body.pipe(res);
      } else {
        // Fallback for older fetch implementations
        const buffer = await response.buffer();
        fileStream.write(buffer);
        res.send(buffer);
        fileStream.end();
      }
    } catch (error: any) {
      console.log('Error processing response, using fallback:', error?.message || 'Unknown error');
      return serveFallbackImage(res);
    }
    
  } catch (error: any) {
    console.error('Image proxy error:', error?.message || 'Unknown error');
    return serveFallbackImage(res);
  }
});

export default router;