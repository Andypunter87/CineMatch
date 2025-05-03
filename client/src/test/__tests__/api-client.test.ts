import { describe, it, expect, beforeEach } from 'jest';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { mockUser } from '../mocks/mockUser';

// Reset the query client before each test
beforeEach(() => {
  queryClient.clear();
});

describe('API Client', () => {
  it('should handle GET requests', async () => {
    const response = await apiRequest('GET', '/api/user');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toEqual(mockUser);
  });
  
  it('should handle POST requests', async () => {
    const payload = { 
      username: 'testuser', 
      password: 'password123' 
    };
    
    const response = await apiRequest('POST', '/api/login', payload);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toEqual(mockUser);
  });
  
  it('should handle errors', async () => {
    // Implementation depends on how error handling is implemented in the application
    // This is a placeholder test
    const testFn = async () => {
      await apiRequest('GET', '/non-existent-endpoint');
    };
    
    // We expect the request to fail since we have no mock for this endpoint
    await expect(testFn()).rejects.toThrow();
  });
});