import express, { Request, Response } from 'express';
import { storage } from '../storage';

const router = express.Router();

/**
 * Testing API to check user's rated films
 * This endpoint returns the list of films the user has rated
 */
router.get('/user-rated-films', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'You must be logged in to access this resource' });
    }
    
    const userId = req.user!.id;
    const ratedFilms = await storage.getUserRatedFilms(userId);
    
    res.json({
      count: ratedFilms.length,
      ratedFilms,
      filmIds: ratedFilms.map(film => film.filmId)
    });
  } catch (error) {
    console.error('Error getting user rated films:', error);
    res.status(500).json({ message: 'Failed to get user rated films' });
  }
});

export default router;