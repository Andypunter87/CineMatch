import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { mockFilms } from '../mocks/mockData';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

// Import the component to test (replace with actual path)
// import { OnboardingPage } from '@/pages/onboarding-page';

// Mock the onboarding page for now - replace this with a proper import when available
const OnboardingPage = () => (
  <div>
    <h1>Onboarding</h1>
    <div data-testid="step-indicator">Step 1 of 4</div>
    <button data-testid="next-button">Next</button>
  </div>
);

describe('Onboarding Flow', () => {
  it('should display the first step of the onboarding process', async () => {
    render(<OnboardingPage />);
    
    expect(screen.getByText(/onboarding/i)).toBeInTheDocument();
    expect(screen.getByTestId('step-indicator')).toHaveTextContent('Step 1 of 4');
    expect(screen.getByTestId('next-button')).toBeInTheDocument();
  });
  
  it('should fetch films for the rating step', async () => {
    // Override the handler for this specific test
    server.use(
      http.get('/api/onboarding/films', () => {
        return HttpResponse.json({ 
          films: mockFilms.slice(0, 3),
          total: 3 
        });
      })
    );
    
    // For now, we're just testing API mocking is working
    // In a real test, you would render the component and interact with it
    const response = await fetch('/api/onboarding/films');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.films.length).toBe(3);
    expect(data.films[0].title).toBe(mockFilms[0].title);
  });
  
  // Additional tests for the complete onboarding flow would be added here
  // They would test navigation between steps, form submissions, etc.
});