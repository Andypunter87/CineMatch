import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { User, Analytics } from "@shared/schema";
import { addDays, format, subDays, subMonths } from "date-fns";

const router = Router();

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const user = req.user as User;
  
  if (!user.isAdmin) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  next();
};

// Apply admin check middleware to all routes
router.use(isAdmin);

// Get overview statistics
router.get("/overview", async (req: Request, res: Response) => {
  try {
    // Get user count
    const userCount = await storage.getUserCount();
    
    // Get recommendation count
    const recommendationCount = await storage.getEventCount("recommendation_request");
    
    // Get watchlist count
    const watchlistCount = await storage.getEventCount("watchlist_add");
    
    // Get active users today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const activeToday = (await storage.getAnalytics({
      startDate: todayStart,
    })).reduce((acc, curr) => {
      if (!acc.includes(curr.userId)) {
        acc.push(curr.userId);
      }
      return acc;
    }, [] as number[]).length;
    
    // Calculate some derived metrics
    const avgRecommendationsPerUser = userCount > 0 ? recommendationCount / userCount : 0;
    const watchlistSaveRatio = recommendationCount > 0 ? (watchlistCount / recommendationCount) * 100 : 0;
    
    // Get watched count and calculate rate
    const watchedCount = await storage.getEventCount("watchlist_watched");
    const watchedRate = watchlistCount > 0 ? (watchedCount / watchlistCount) * 100 : 0;
    
    res.json({
      userCount,
      recommendationCount,
      watchlistCount,
      activeToday,
      avgRecommendationsPerUser,
      watchlistSaveRatio,
      watchedRate
    });
  } catch (error) {
    console.error("Error getting admin overview:", error);
    res.status(500).json({ error: "Failed to fetch overview data" });
  }
});

// Get activity timeline data
router.get("/activity", async (req: Request, res: Response) => {
  try {
    // Get last 30 days of data
    const startDate = subDays(new Date(), 29);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const analytics = await storage.getAnalytics({
      startDate,
      endDate
    });
    
    // Generate date range for the last 30 days
    const dateRange = [];
    let currentDate = startDate;
    
    while (currentDate <= endDate) {
      dateRange.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, 1);
    }
    
    // Initialize the timeline data
    const timeline = dateRange.map(date => ({
      date,
      logins: 0,
      recommendations: 0,
      watchlistAdds: 0,
      newUsers: 0
    }));
    
    // Populate the timeline with actual data
    analytics.forEach(event => {
      const date = format(new Date(event.timestamp), 'yyyy-MM-dd');
      const index = timeline.findIndex(item => item.date === date);
      
      if (index !== -1) {
        if (event.eventType === 'user_login') {
          timeline[index].logins++;
        } else if (event.eventType === 'recommendation_request') {
          timeline[index].recommendations++;
        } else if (event.eventType === 'watchlist_add') {
          timeline[index].watchlistAdds++;
        } else if (event.eventType === 'user_registration') {
          timeline[index].newUsers++;
        }
      }
    });
    
    res.json(timeline);
  } catch (error) {
    console.error("Error getting activity timeline:", error);
    res.status(500).json({ error: "Failed to fetch activity data" });
  }
});

// Get user statistics
router.get("/users", async (req: Request, res: Response) => {
  try {
    // Get all users
    const totalUsers = await storage.getUserCount();
    
    // Get active users from last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    const activeUsersAnalytics = await storage.getAnalytics({
      startDate: thirtyDaysAgo,
    });
    
    const activeUserIds = activeUsersAnalytics.reduce((acc, curr) => {
      if (curr.userId && !acc.includes(curr.userId)) {
        acc.push(curr.userId);
      }
      return acc;
    }, [] as number[]);
    
    const activeUsers = activeUserIds.length;
    
    // Get new users from last 7 days
    const sevenDaysAgo = subDays(new Date(), 7);
    const newUsersEvents = await storage.getAnalytics({
      eventType: "user_registration",
      startDate: sevenDaysAgo,
    });
    
    const newUsers = newUsersEvents.length;
    
    // Generate user growth data (last 12 weeks)
    const userGrowth = [];
    const twelveWeeksAgo = subMonths(new Date(), 3);
    
    for (let i = 0; i < 12; i++) {
      const weekStart = subDays(new Date(), i * 7 + 6);
      const weekEnd = subDays(new Date(), i * 7);
      
      const weekRegistrations = await storage.getAnalytics({
        eventType: "user_registration",
        startDate: weekStart,
        endDate: weekEnd,
      });
      
      userGrowth.unshift({
        date: format(weekEnd, 'MMM d'),
        newUsers: weekRegistrations.length,
        totalUsers: totalUsers - i // This is an approximation
      });
    }
    
    // Get login activity by hour of day
    const loginsByTime = Array(24).fill(0).map((_, hour) => ({ hour, count: 0 }));
    
    const loginEvents = await storage.getAnalytics({
      eventType: "user_login",
      startDate: thirtyDaysAgo,
    });
    
    loginEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      loginsByTime[hour].count++;
    });
    
    // Get top countries from user data (mock data for now)
    const topCountries = [
      { name: "United States", count: Math.floor(totalUsers * 0.4) },
      { name: "United Kingdom", count: Math.floor(totalUsers * 0.25) },
      { name: "Canada", count: Math.floor(totalUsers * 0.15) },
      { name: "Australia", count: Math.floor(totalUsers * 0.1) },
      { name: "Germany", count: Math.floor(totalUsers * 0.05) }
    ];
    
    // Get popular streaming services (mock data for now)
    const popularServices = [
      { name: "Netflix", count: Math.floor(totalUsers * 0.8) },
      { name: "Amazon Prime", count: Math.floor(totalUsers * 0.6) },
      { name: "Disney+", count: Math.floor(totalUsers * 0.5) },
      { name: "Hulu", count: Math.floor(totalUsers * 0.35) },
      { name: "HBO Max", count: Math.floor(totalUsers * 0.3) }
    ];
    
    res.json({
      totalUsers,
      activeUsers,
      newUsers,
      userGrowth,
      loginsByTime,
      topCountries,
      popularServices
    });
  } catch (error) {
    console.error("Error getting user statistics:", error);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
});

// Get recommendation statistics
router.get("/recommendations", async (req: Request, res: Response) => {
  try {
    // Get basic recommendation stats
    const totalRecommendations = await storage.getEventCount("recommendation_request");
    
    // Calculate daily average (over last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentRecommendations = await storage.getAnalytics({
      eventType: "recommendation_request",
      startDate: thirtyDaysAgo,
    });
    
    const dailyAverage = Math.round(recentRecommendations.length / 30);
    
    // Get recommendation data to analyze
    const recommendationEvents = await storage.getAnalytics({
      eventType: "recommendation_request",
    });
    
    // Extract mood and location preferences from recommendation events
    const moods: Record<string, number> = {};
    const locations: Record<string, number> = {};
    const uniqueFilmIds = new Set<number>();
    
    recommendationEvents.forEach(event => {
      if (event.data) {
        const preferences = event.data as Record<string, any>;
        
        // Track mood preferences
        if (preferences.mood) {
          const mood = preferences.mood;
          moods[mood] = (moods[mood] || 0) + 1;
        }
        
        // Track location preferences
        if (preferences.location) {
          const location = preferences.location;
          locations[location] = (locations[location] || 0) + 1;
        }
        
        // Track recommended film IDs
        if (preferences.recommendedFilms && Array.isArray(preferences.recommendedFilms)) {
          preferences.recommendedFilms.forEach((film: any) => {
            if (film.id) {
              uniqueFilmIds.add(film.id);
            }
          });
        }
      }
    });
    
    // Format mood data for charts
    const popularMoods = Object.entries(moods).map(([name, count]) => ({
      name: formatMoodName(name),
      count
    })).sort((a, b) => b.count - a.count);
    
    // Format location data for charts
    const popularLocations = Object.entries(locations).map(([name, count]) => ({
      name: formatLocationName(name),
      count
    })).sort((a, b) => b.count - a.count);
    
    // Generate recommendation trends data (last 12 weeks)
    const recommendationTrends = [];
    
    for (let i = 0; i < 12; i++) {
      const weekStart = subDays(new Date(), i * 7 + 6);
      const weekEnd = subDays(new Date(), i * 7);
      
      const weekRecommendations = await storage.getAnalytics({
        eventType: "recommendation_request",
        startDate: weekStart,
        endDate: weekEnd,
      });
      
      let mainstream = 0;
      let indie = 0;
      
      weekRecommendations.forEach(event => {
        if (event.data && event.data.recommendedFilms) {
          const films = event.data.recommendedFilms as any[];
          films.forEach(film => {
            if (film.type === "mainstream") mainstream++;
            else if (film.type === "indie") indie++;
          });
        }
      });
      
      recommendationTrends.unshift({
        date: format(weekEnd, 'MMM d'),
        mainstream,
        indie
      });
    }
    
    res.json({
      totalRecommendations,
      uniqueFilms: uniqueFilmIds.size,
      dailyAverage,
      popularMoods,
      popularLocations,
      recommendationTrends
    });
  } catch (error) {
    console.error("Error getting recommendation statistics:", error);
    res.status(500).json({ error: "Failed to fetch recommendation statistics" });
  }
});

// Get watchlist statistics
router.get("/watchlist", async (req: Request, res: Response) => {
  try {
    // Get watchlist counts
    const totalItems = await storage.getEventCount("watchlist_add");
    const watchedItems = await storage.getEventCount("watchlist_watched");
    
    // Calculate rates
    const recommendationCount = await storage.getEventCount("recommendation_request");
    const saveRate = recommendationCount > 0 ? Math.round((totalItems / recommendationCount) * 100) : 0;
    const completionRate = totalItems > 0 ? Math.round((watchedItems / totalItems) * 100) : 0;
    
    // Get watchlist analytics
    const watchlistEvents = await storage.getAnalytics({
      eventType: "watchlist_add",
    });
    
    // Extract genre data from watchlist events
    const genreCounts: Record<string, { saved: number; watched: number }> = {};
    const filmData: Record<number, { 
      title: string; 
      year: number; 
      count: number; 
      watched: number;
      ratings: number[];
    }> = {};
    
    // Process watchlist_add events
    watchlistEvents.forEach(event => {
      if (event.data && event.data.film) {
        const film = event.data.film as Record<string, any>;
        
        // Track genres
        if (film.genres && Array.isArray(film.genres)) {
          film.genres.forEach((genre: string) => {
            if (!genreCounts[genre]) {
              genreCounts[genre] = { saved: 0, watched: 0 };
            }
            genreCounts[genre].saved++;
          });
        }
        
        // Track film data
        if (film.id) {
          const filmId = film.id;
          if (!filmData[filmId]) {
            filmData[filmId] = { 
              title: film.title || 'Unknown Film', 
              year: film.year || 0, 
              count: 0, 
              watched: 0,
              ratings: []
            };
          }
          filmData[filmId].count++;
        }
      }
    });
    
    // Process watchlist_watched events
    const watchedEvents = await storage.getAnalytics({
      eventType: "watchlist_watched",
    });
    
    watchedEvents.forEach(event => {
      if (event.data && event.data.film) {
        const film = event.data.film as Record<string, any>;
        
        // Track watched genres
        if (film.genres && Array.isArray(film.genres)) {
          film.genres.forEach((genre: string) => {
            if (genreCounts[genre]) {
              genreCounts[genre].watched++;
            }
          });
        }
        
        // Track watched films
        if (film.id) {
          const filmId = film.id;
          if (filmData[filmId]) {
            filmData[filmId].watched++;
            
            // Track rating if available
            if (event.data.rating) {
              filmData[filmId].ratings.push(event.data.rating);
            }
          }
        }
      }
    });
    
    // Format genre data for charts
    const popularGenres = Object.entries(genreCounts)
      .map(([name, counts]) => ({
        name,
        saved: counts.saved,
        watched: counts.watched
      }))
      .sort((a, b) => b.saved - a.saved)
      .slice(0, 10);
    
    // Get top saved films
    const topSavedFilms = Object.values(filmData)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(film => ({
        title: film.title,
        year: film.year,
        count: film.count,
        watched: film.watched
      }));
    
    // Get top rated films
    const topRatedFilms = Object.values(filmData)
      .filter(film => film.ratings.length > 0)
      .map(film => ({
        title: film.title,
        year: film.year,
        rating: film.ratings.reduce((sum, rating) => sum + rating, 0) / film.ratings.length,
        count: film.ratings.length
      }))
      .sort((a, b) => b.rating - a.rating || b.count - a.count)
      .slice(0, 10);
    
    res.json({
      totalItems,
      watchedItems,
      saveRate,
      completionRate,
      popularGenres,
      topSavedFilms,
      topRatedFilms
    });
  } catch (error) {
    console.error("Error getting watchlist statistics:", error);
    res.status(500).json({ error: "Failed to fetch watchlist statistics" });
  }
});

// Helper function to format mood names for display
function formatMoodName(mood: string): string {
  const moodMap: Record<string, string> = {
    "laugh": "Laugh",
    "think": "Think",
    "cry": "Emotional",
    "thrill": "Thrill",
    "escape": "Escape",
    "inspire": "Inspiration"
  };
  
  return moodMap[mood] || mood;
}

// Helper function to format location names for display
function formatLocationName(location: string): string {
  const locationMap: Record<string, string> = {
    "home": "At Home",
    "date": "Date Night",
    "friends": "With Friends",
    "travel": "While Traveling"
  };
  
  return locationMap[location] || location;
}

export default router;