import { FirebaseError } from 'firebase/app';
import { trackEvent } from './analytics';
import { useToast } from '@/hooks/use-toast';

/**
 * Standard error categories to help with consistent messaging
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  DATABASE = 'database',
  FIRESTORE = 'firestore',
  USER_INPUT = 'user_input',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

/**
 * Standard error object with additional context properties
 */
export interface AppError extends Error {
  category: ErrorCategory;
  code?: string;
  action?: string;
  context?: Record<string, any>;
  timestamp: number;
}

/**
 * Creates a standardized AppError
 */
export function createAppError(
  error: Error | string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  action?: string,
  context?: Record<string, any>
): AppError {
  const message = typeof error === 'string' ? error : error.message;
  const code = typeof error === 'object' && 'code' in error ? (error as any).code : undefined;
  
  return {
    name: typeof error === 'object' ? error.name : 'Error',
    message,
    category,
    code,
    action,
    context,
    timestamp: Date.now(),
    stack: typeof error === 'object' ? error.stack : new Error().stack
  } as AppError;
}

/**
 * Parse Firebase errors into standardized app errors
 */
export function parseFirebaseError(error: FirebaseError, action?: string): AppError {
  // Map Firebase error codes to error categories
  let category = ErrorCategory.UNKNOWN;
  
  if (error.code.startsWith('auth/')) {
    category = ErrorCategory.AUTHENTICATION;
  } else if (error.code.startsWith('firestore/')) {
    category = ErrorCategory.FIRESTORE;
  } else if (error.code.startsWith('permission-denied')) {
    category = ErrorCategory.PERMISSION;
  } else if (error.code.includes('network')) {
    category = ErrorCategory.NETWORK;
  }
  
  // Get human-readable error message
  let message = error.message;
  
  // Clean up common Firebase error messages
  message = message.replace('Firebase: ', '');
  if (message.includes('Error (auth/')) {
    message = message.replace(/Error \(auth\/[^)]+\): /, '');
  }
  
  // Special case handling for common errors
  if (error.code === 'auth/invalid-credential') {
    message = 'The login credentials are invalid or expired.';
  } else if (error.code === 'auth/too-many-requests') {
    message = 'Too many unsuccessful login attempts. Please try again later.';
  } else if (error.code === 'firestore/permission-denied') {
    message = 'You don\'t have permission to access this data.';
  } else if (error.code === 'firestore/unavailable') {
    message = 'The service is currently unavailable. Please try again later.';
  } else if (error.code === 'auth/network-request-failed') {
    message = 'Network connection is unavailable. Check your internet connection.';
  }
  
  return createAppError(
    message,
    category,
    action,
    { 
      firebaseCode: error.code,
      firebaseMessage: error.message,
    }
  );
}

/**
 * Parse network errors into standardized app errors
 */
export function parseNetworkError(error: Error, action?: string): AppError {
  let message = error.message;
  
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    message = 'Network connection error. Please check your internet connection and try again.';
  } else if (message.includes('timeout')) {
    message = 'Request timed out. Please try again.';
  }
  
  return createAppError(
    message,
    ErrorCategory.NETWORK,
    action
  );
}

/**
 * Standard error handler that logs, tracks, and optionally shows a toast
 */
export function handleError(
  error: Error | string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  action?: string,
  context?: Record<string, any>,
  showToast = false
): AppError {
  // Create standardized error
  let appError: AppError;
  
  // Parse specific error types
  if (error instanceof FirebaseError) {
    appError = parseFirebaseError(error, action);
  } else if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('timeout')) {
      appError = parseNetworkError(error, action);
    } else {
      appError = createAppError(error, category, action, context);
    }
  } else {
    appError = createAppError(error, category, action, context);
  }
  
  // Log error to console
  console.error('Application error:', appError);
  
  // Track error for analytics
  trackEvent('error_occurred', {
    error_message: appError.message,
    error_category: appError.category,
    error_code: appError.code,
    error_action: appError.action,
    error_stack: appError.stack
  });
  
  return appError;
}

/**
 * Hook for displaying standardized error toasts
 */
export function useErrorToast() {
  const { toast } = useToast();
  
  // Show error toast with standardized styling based on category
  const showErrorToast = (error: AppError | Error | string, title?: string) => {
    let appError: AppError;
    
    if (typeof error === 'string') {
      appError = createAppError(error);
    } else if ('category' in error) {
      appError = error as AppError;
    } else {
      appError = createAppError(error);
    }
    
    let toastTitle = title || 'Error';
    
    // Set title based on category if not provided
    if (!title) {
      switch (appError.category) {
        case ErrorCategory.AUTHENTICATION:
          toastTitle = 'Authentication Error';
          break;
        case ErrorCategory.NETWORK:
          toastTitle = 'Network Error';
          break;
        case ErrorCategory.DATABASE:
        case ErrorCategory.FIRESTORE:
          toastTitle = 'Data Error';
          break;
        case ErrorCategory.PERMISSION:
          toastTitle = 'Permission Error';
          break;
        case ErrorCategory.USER_INPUT:
          toastTitle = 'Invalid Input';
          break;
      }
    }
    
    toast({
      title: toastTitle,
      description: appError.message,
      variant: 'destructive',
    });
  };
  
  return { showErrorToast };
}