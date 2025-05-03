import { http, HttpResponse } from 'msw';
import { mockFilms } from './mockData';
import { mockUser } from './mockUser';
import { mockRecommendations } from './mockRecommendations';

export const handlers = [
  // Auth endpoints
  http.get('/api/user', () => {
    return HttpResponse.json(mockUser);
  }),
  
  http.post('/api/login', () => {
    return HttpResponse.json(mockUser);
  }),
  
  http.post('/api/logout', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  
  // Recommendation endpoints
  http.post('/api/recommendations', () => {
    return HttpResponse.json({ films: mockRecommendations });
  }),
  
  // Film endpoints
  http.get('/api/films/popular', () => {
    return HttpResponse.json({ films: mockFilms });
  }),
  
  // Onboarding endpoints
  http.get('/api/onboarding/films', () => {
    return HttpResponse.json({ films: mockFilms.slice(0, 12) });
  }),
  
  http.post('/api/onboarding/complete', () => {
    return HttpResponse.json({ success: true });
  }),
  
  http.get('/api/onboarding/state', () => {
    return HttpResponse.json({ 
      needsOnboarding: false, 
      progress: 100 
    });
  }),
  
  // User preferences endpoints
  http.get('/api/preferences', () => {
    return HttpResponse.json({
      streamingServices: ['netflix', 'hulu', 'prime'],
      country: 'US',
      lastUpdated: new Date().toISOString()
    });
  }),
  
  http.post('/api/preferences', () => {
    return HttpResponse.json({ success: true });
  }),
  
  // Watchlist endpoints
  http.get('/api/watchlist', () => {
    return HttpResponse.json({
      items: mockFilms.slice(0, 2).map(film => ({
        id: film.id + 100,
        filmId: film.id,
        userId: mockUser.id,
        addedAt: new Date().toISOString(),
        watched: false,
        rating: null
      }))
    });
  }),
  
  http.post('/api/watchlist', () => {
    return HttpResponse.json({ success: true });
  }),
  
  http.post('/api/watchlist/:id/rate', () => {
    return HttpResponse.json({ success: true });
  }),
  
  http.delete('/api/watchlist/:id', () => {
    return HttpResponse.json({ success: true });
  })
];