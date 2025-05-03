import { describe, it, expect, beforeEach } from 'jest';
import { apiRequest, getQueryFn } from '../../lib/queryClient';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { ErrorCategory } from '@/lib/error-utils';

describe('Query Client', () => {
  describe('apiRequest', () => {
    it('should handle successful requests', async () => {
      const response = await apiRequest('GET', '/api/user');
      expect(response.status).toBe(200);
    });
    
    it('should include proper headers with data', async () => {
      server.use(
        http.post('/api/test-headers', async ({ request }) => {
          const contentType = request.headers.get('Content-Type');
          return HttpResponse.json({ contentType });
        })
      );
      
      const response = await apiRequest('POST', '/api/test-headers', { test: true });
      const data = await response.json();
      
      expect(data.contentType).toBe('application/json');
    });
    
    it('should categorize authentication errors correctly', async () => {
      server.use(
        http.get('/api/auth-error', () => {
          return new HttpResponse(null, { status: 401, statusText: 'Unauthorized' });
        })
      );
      
      try {
        await apiRequest('GET', '/api/auth-error');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.name).toBe('AppError');
        expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
        expect(error.message).toContain('401');
      }
    });
    
    it('should handle network errors', async () => {
      // Mock a network error
      server.use(
        http.get('/api/network-error', () => {
          throw new Error('Failed to fetch');
        })
      );
      
      try {
        await apiRequest('GET', '/api/network-error');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.category).toBe(ErrorCategory.NETWORK);
      }
    });
  });
  
  describe('getQueryFn', () => {
    it('should return null for 401 responses when configured to do so', async () => {
      server.use(
        http.get('/api/unauthorized', () => {
          return new HttpResponse(null, { status: 401 });
        })
      );
      
      const queryFn = getQueryFn({ on401: 'returnNull' });
      const result = await queryFn({ queryKey: ['/api/unauthorized'] });
      
      expect(result).toBeNull();
    });
    
    it('should throw for 401 responses when configured to do so', async () => {
      server.use(
        http.get('/api/unauthorized', () => {
          return new HttpResponse(null, { status: 401 });
        })
      );
      
      const queryFn = getQueryFn({ on401: 'throw' });
      
      try {
        await queryFn({ queryKey: ['/api/unauthorized'] });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
      }
    });
    
    it('should call onError handler when provided', async () => {
      server.use(
        http.get('/api/error', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );
      
      const mockErrorHandler = jest.fn();
      const queryFn = getQueryFn({ 
        on401: 'throw',
        onError: mockErrorHandler
      });
      
      try {
        await queryFn({ queryKey: ['/api/error'] });
        fail('Should have thrown an error');
      } catch (error) {
        expect(mockErrorHandler).toHaveBeenCalledWith(error);
      }
    });
  });
});