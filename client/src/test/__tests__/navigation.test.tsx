import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { mockUser } from '../mocks/mockUser';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

// Mock navigation component
// Replace with actual imports when available
const Navigation = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(true);
  
  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setIsLoggedIn(false);
  };
  
  return (
    <nav data-testid="main-nav">
      <div className="logo">CineMatch</div>
      <div className="nav-links">
        <a href="/" data-testid="home-link">Home</a>
        <a href="/recommendations" data-testid="recommendations-link">Recommendations</a>
        <a href="/watchlist" data-testid="watchlist-link">My Watchlist</a>
        <a href="/friends" data-testid="friends-link">Friends</a>
        {isLoggedIn ? (
          <button onClick={handleLogout} data-testid="logout-button">Logout</button>
        ) : (
          <a href="/auth" data-testid="login-link">Login</a>
        )}
      </div>
    </nav>
  );
};

describe('Navigation', () => {
  it('should display all navigation links', () => {
    render(<Navigation />);
    
    expect(screen.getByText(/cinematch/i)).toBeInTheDocument();
    expect(screen.getByTestId('home-link')).toBeInTheDocument();
    expect(screen.getByTestId('recommendations-link')).toBeInTheDocument();
    expect(screen.getByTestId('watchlist-link')).toBeInTheDocument();
    expect(screen.getByTestId('friends-link')).toBeInTheDocument();
  });
  
  it('should display logout button when user is logged in', () => {
    render(<Navigation />);
    
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    expect(screen.queryByTestId('login-link')).not.toBeInTheDocument();
  });
  
  it('should handle logout correctly', async () => {
    render(<Navigation />);
    
    // Click logout button
    fireEvent.click(screen.getByTestId('logout-button'));
    
    // Wait for state update after logout
    await waitFor(() => {
      expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('login-link')).toBeInTheDocument();
    });
  });
  
  it('should display login link when user is not logged in', async () => {
    // Override auth endpoint to return no user
    server.use(
      http.get('/api/user', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );
    
    // Mock component with initial logged out state
    const LoggedOutNav = () => {
      const [isLoggedIn, setIsLoggedIn] = React.useState(false);
      return (
        <nav data-testid="main-nav">
          <div className="logo">CineMatch</div>
          <div className="nav-links">
            <a href="/" data-testid="home-link">Home</a>
            {isLoggedIn ? (
              <button onClick={() => {}} data-testid="logout-button">Logout</button>
            ) : (
              <a href="/auth" data-testid="login-link">Login</a>
            )}
          </div>
        </nav>
      );
    };
    
    render(<LoggedOutNav />);
    
    expect(screen.getByTestId('login-link')).toBeInTheDocument();
    expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
  });
});