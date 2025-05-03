import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { mockRecommendations } from '../mocks/mockRecommendations';

// Mock component for recommendation form
// Replace with actual import when available
const RecommendationForm = ({ onSubmit }) => (
  <form 
    data-testid="recommendation-form" 
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        mood: 'laugh',
        audience: 'solo',
        location: 'home',
        timeOfDay: ['weekend'],
        streamingServices: ['netflix']
      });
    }}
  >
    <button type="submit" data-testid="submit-button">
      Get Recommendations
    </button>
  </form>
);

// Mock component for recommendation results
// Replace with actual import when available
const RecommendationResults = ({ films }) => (
  <div data-testid="recommendation-results">
    <h2>Recommended Films</h2>
    <ul>
      {films.map(film => (
        <li key={film.id} data-testid={`film-${film.id}`}>
          {film.title} - Match: {film.matchPercentage}%
        </li>
      ))}
    </ul>
  </div>
);

// Mock the recommendation page
// Replace with actual import when available
const RecommendationPage = () => {
  const [films, setFilms] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  
  const handleSubmit = async (preferences) => {
    setLoading(true);
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      const data = await response.json();
      setFilms(data.films);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1>Get Film Recommendations</h1>
      <RecommendationForm onSubmit={handleSubmit} />
      {loading && <div data-testid="loading">Loading...</div>}
      {films.length > 0 && <RecommendationResults films={films} />}
    </div>
  );
};

describe('Recommendation Engine', () => {
  it('should display the recommendation form', () => {
    render(<RecommendationPage />);
    
    expect(screen.getByText(/get film recommendations/i)).toBeInTheDocument();
    expect(screen.getByTestId('recommendation-form')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });
  
  it('should fetch and display recommendations when form is submitted', async () => {
    render(<RecommendationPage />);
    
    // Submit the form
    fireEvent.click(screen.getByTestId('submit-button'));
    
    // Check loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    
    // Wait for results to load
    await waitFor(() => {
      expect(screen.getByTestId('recommendation-results')).toBeInTheDocument();
    });
    
    // Check that films are displayed
    expect(screen.getByText(/recommended films/i)).toBeInTheDocument();
    
    // Verify specific films are in the results
    mockRecommendations.forEach(film => {
      expect(screen.getByTestId(`film-${film.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`film-${film.id}`)).toHaveTextContent(film.title);
    });
  });
  
  it('should handle API errors gracefully', async () => {
    // Override the handler for this test to simulate an error
    server.use(
      http.post('/api/recommendations', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    
    render(<RecommendationPage />);
    
    // Submit the form
    fireEvent.click(screen.getByTestId('submit-button'));
    
    // Check loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });
    
    // Results should not be displayed
    expect(screen.queryByTestId('recommendation-results')).not.toBeInTheDocument();
  });
});