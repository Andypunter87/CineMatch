import { describe, it, expect, jest } from 'jest';
import { 
  AppError, 
  ErrorCategory, 
  createAppError, 
  normalizeError, 
  handleError 
} from '@/lib/error-utils';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create an AppError with the correct properties', () => {
      const error = new AppError(
        'Test error message',
        ErrorCategory.NETWORK,
        'testAction',
        'error-code',
        { additionalInfo: 'test' }
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('AppError');
      expect(error.message).toBe('Test error message');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.action).toBe('testAction');
      expect(error.code).toBe('error-code');
      expect(error.context).toEqual({ additionalInfo: 'test' });
    });
    
    it('should have default values for optional properties', () => {
      const error = new AppError('Test error message');
      
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.action).toBeUndefined();
      expect(error.code).toBeUndefined();
      expect(error.context).toBeUndefined();
    });
  });
  
  describe('createAppError', () => {
    it('should create an AppError with the provided parameters', () => {
      const error = createAppError(
        'Test error message',
        ErrorCategory.DATABASE,
        'testAction',
        { additionalInfo: 'test' }
      );
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error message');
      expect(error.category).toBe(ErrorCategory.DATABASE);
      expect(error.action).toBe('testAction');
      expect(error.context).toEqual({ additionalInfo: 'test' });
    });
  });
  
  describe('normalizeError', () => {
    it('should return AppError instances unchanged', () => {
      const originalError = new AppError(
        'Original error',
        ErrorCategory.PERMISSION,
        'originalAction'
      );
      
      const normalizedError = normalizeError(originalError);
      
      expect(normalizedError).toBe(originalError);
    });
    
    it('should convert standard Error objects', () => {
      const standardError = new Error('Network connection failed');
      const normalizedError = normalizeError(standardError);
      
      expect(normalizedError).toBeInstanceOf(AppError);
      expect(normalizedError.category).toBe(ErrorCategory.NETWORK);
      expect(normalizedError.message).toBe('Network connection failed');
      expect(normalizedError.context?.originalError).toBe(standardError);
    });
    
    it('should convert string errors', () => {
      const stringError = 'Something went wrong';
      const normalizedError = normalizeError(stringError);
      
      expect(normalizedError).toBeInstanceOf(AppError);
      expect(normalizedError.message).toBe('Something went wrong');
    });
    
    it('should handle unknown error types', () => {
      const unknownError = { foo: 'bar' };
      const normalizedError = normalizeError(unknownError);
      
      expect(normalizedError).toBeInstanceOf(AppError);
      expect(normalizedError.message).toBe('An unknown error occurred');
      expect(normalizedError.category).toBe(ErrorCategory.UNKNOWN);
    });
  });
  
  describe('handleError', () => {
    const originalConsoleError = console.error;
    
    beforeEach(() => {
      console.error = jest.fn();
    });
    
    afterEach(() => {
      console.error = originalConsoleError;
    });
    
    it('should normalize the error and log it', () => {
      const error = new Error('Test error');
      const handled = handleError(error);
      
      expect(handled).toBeInstanceOf(AppError);
      expect(console.error).toHaveBeenCalled();
    });
    
    it('should override error properties if provided', () => {
      const error = new Error('Original error');
      const handled = handleError(
        error,
        ErrorCategory.USER_INPUT,
        'testAction',
        { additionalInfo: 'test' }
      );
      
      expect(handled.category).toBe(ErrorCategory.USER_INPUT);
      expect(handled.action).toBe('testAction');
      expect(handled.context).toHaveProperty('additionalInfo', 'test');
    });
    
    it('should merge context with existing context', () => {
      const appError = new AppError(
        'Test error',
        ErrorCategory.UNKNOWN,
        undefined,
        undefined,
        { existingInfo: 'exists' }
      );
      
      const handled = handleError(
        appError,
        undefined,
        undefined,
        { newInfo: 'new' }
      );
      
      expect(handled.context).toEqual({
        existingInfo: 'exists',
        newInfo: 'new'
      });
    });
  });
});