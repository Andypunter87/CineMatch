import React from 'react';
import { render, screen, fireEvent } from '../test-utils';
import { mockFilms } from '../mocks/mockData';

// Mock the film card component
// Replace with actual import when available
const FilmCard = ({ 
  film, 
  onAddToWatchlist, 
  isInWatchlist = false,
  showMatchPercentage = false 
}) => (
  <div className="film-card" data-testid={`film-card-${film.id}`}>
    <img 
      src={film.posterUrl} 
      alt={`${film.title} poster`} 
      className="film-poster"
      data-testid={`film-poster-${film.id}`}
    />
    <div className="film-info">
      <h3 className="film-title" data-testid={`film-title-${film.id}`}>{film.title}</h3>
      <p className="film-year">{film.year}</p>
      <div className="film-genres">
        {film.genres.map(genre => (
          <span key={genre} className="genre-tag">{genre}</span>
        ))}
      </div>
      {showMatchPercentage && film.matchPercentage && (
        <div className="match-score" data-testid={`match-score-${film.id}`}>
          {film.matchPercentage}% Match
        </div>
      )}
      <div className="film-actions">
        <button 
          onClick={() => onAddToWatchlist(film)}
          disabled={isInWatchlist}
          data-testid={`watchlist-button-${film.id}`}
        >
          {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </button>
      </div>
    </div>
  </div>
);

describe('FilmCard', () => {
  const mockOnAddToWatchlist = jest.fn();
  
  beforeEach(() => {
    mockOnAddToWatchlist.mockClear();
  });
  
  it('should render film information correctly', () => {
    const film = mockFilms[0];
    render(<FilmCard film={film} onAddToWatchlist={mockOnAddToWatchlist} />);
    
    expect(screen.getByTestId(`film-card-${film.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`film-title-${film.id}`)).toHaveTextContent(film.title);
    expect(screen.getByText(film.year.toString())).toBeInTheDocument();
    
    // Check that all genres are displayed
    film.genres.forEach(genre => {
      expect(screen.getByText(genre)).toBeInTheDocument();
    });
    
    // Check that the poster is rendered with correct alt text
    const poster = screen.getByTestId(`film-poster-${film.id}`);
    expect(poster).toBeInTheDocument();
    expect(poster).toHaveAttribute('src', film.posterUrl);
    expect(poster).toHaveAttribute('alt', `${film.title} poster`);
  });
  
  it('should call onAddToWatchlist when button is clicked', () => {
    const film = mockFilms[0];
    render(<FilmCard film={film} onAddToWatchlist={mockOnAddToWatchlist} />);
    
    const watchlistButton = screen.getByTestId(`watchlist-button-${film.id}`);
    expect(watchlistButton).toHaveTextContent('Add to Watchlist');
    
    fireEvent.click(watchlistButton);
    expect(mockOnAddToWatchlist).toHaveBeenCalledWith(film);
  });
  
  it('should disable button when film is already in watchlist', () => {
    const film = mockFilms[0];
    render(
      <FilmCard 
        film={film} 
        onAddToWatchlist={mockOnAddToWatchlist} 
        isInWatchlist={true} 
      />
    );
    
    const watchlistButton = screen.getByTestId(`watchlist-button-${film.id}`);
    expect(watchlistButton).toHaveTextContent('In Watchlist');
    expect(watchlistButton).toBeDisabled();
    
    fireEvent.click(watchlistButton);
    expect(mockOnAddToWatchlist).not.toHaveBeenCalled();
  });
  
  it('should show match percentage when enabled', () => {
    const film = {
      ...mockFilms[0],
      matchPercentage: 85
    };
    
    render(
      <FilmCard 
        film={film} 
        onAddToWatchlist={mockOnAddToWatchlist} 
        showMatchPercentage={true} 
      />
    );
    
    const matchScore = screen.getByTestId(`match-score-${film.id}`);
    expect(matchScore).toBeInTheDocument();
    expect(matchScore).toHaveTextContent('85% Match');
  });
  
  it('should not show match percentage when disabled', () => {
    const film = {
      ...mockFilms[0],
      matchPercentage: 85
    };
    
    render(
      <FilmCard 
        film={film} 
        onAddToWatchlist={mockOnAddToWatchlist} 
        showMatchPercentage={false} 
      />
    );
    
    expect(screen.queryByTestId(`match-score-${film.id}`)).not.toBeInTheDocument();
  });
});