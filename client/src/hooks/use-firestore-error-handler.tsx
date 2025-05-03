import { useState, useCallback } from 'react';
import { FirebaseError } from 'firebase/app';
import { createAppError, ErrorCategory, useErrorToast } from '@/lib/error-utils';

/**
 * Parses Firebase errors into more user-friendly messages with appropriate context
 */
export function parseFirebaseError(error: FirebaseError): { 
  message: string;
  category: ErrorCategory;
  code: string;
} {
  let message: string;
  let category: ErrorCategory = ErrorCategory.FIRESTORE;
  
  // Authentication errors
  if (error.code.startsWith('auth/')) {
    category = ErrorCategory.AUTHENTICATION;
    
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password. Please try again.';
        break;
      case 'auth/email-already-in-use':
        message = 'This email is already in use. Try logging in instead.';
        break;
      case 'auth/weak-password':
        message = 'Your password is too weak. Choose a stronger password.';
        break;
      case 'auth/invalid-email':
        message = 'The email address is not valid.';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled. Contact support for help.';
        break;
      case 'auth/requires-recent-login':
        message = 'Please log in again to complete this action.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many unsuccessful attempts. Try again later.';
        break;
      default:
        message = 'Authentication error. Please try again.';
    }
  } 
  // Firestore errors
  else if (error.code.startsWith('firestore/')) {
    switch (error.code) {
      case 'firestore/permission-denied':
        message = 'You do not have permission to access this data.';
        category = ErrorCategory.PERMISSION;
        break;
      case 'firestore/not-found':
        message = 'The requested document was not found.';
        break;
      case 'firestore/already-exists':
        message = 'This document already exists.';
        break;
      case 'firestore/unavailable':
        message = 'The service is temporarily unavailable. Please try again later.';
        category = ErrorCategory.NETWORK;
        break;
      case 'firestore/data-loss':
        message = 'Data may have been lost or corrupted. Please refresh and try again.';
        break;
      case 'firestore/cancelled':
        message = 'The operation was cancelled.';
        break;
      default:
        message = 'Database error. Please try again.';
    }
  } 
  // Network errors
  else if (error.code === 'network-request-failed' || error.code.includes('unavailable')) {
    message = 'Network connection error. Please check your internet connection.';
    category = ErrorCategory.NETWORK;
  } 
  // Storage errors
  else if (error.code.startsWith('storage/')) {
    message = 'Error accessing storage. Please try again.';
  } 
  // Default fallback
  else {
    message = error.message || 'An unknown error occurred.';
  }
  
  return {
    message,
    category,
    code: error.code
  };
}

/**
 * Hook for handling Firebase errors with consistent behavior
 */
export function useFirestoreErrorHandler() {
  const [lastError, setLastError] = useState<FirebaseError | Error | null>(null);
  const { showErrorToast } = useErrorToast();
  
  /**
   * Handle a Firebase error with proper categorization and user feedback
   */
  const handleFirebaseError = useCallback((
    error: unknown,
    operation: string,
    showToast = true,
    title?: string
  ) => {
    // Log all errors
    console.error(`[Firebase Error] ${operation}:`, error);
    
    // Store the error
    if (error instanceof Error) {
      setLastError(error);
    }
    
    // Handle Firebase-specific errors
    if (error instanceof FirebaseError) {
      const { message, category, code } = parseFirebaseError(error);
      
      const appError = createAppError(
        message,
        category,
        operation,
        { firebaseCode: code }
      );
      
      // Show toast if requested
      if (showToast) {
        showErrorToast(appError, title);
      }
      
      return appError;
    } 
    // Handle generic errors
    else if (error instanceof Error) {
      const appError = createAppError(
        error.message,
        ErrorCategory.UNKNOWN,
        operation
      );
      
      if (showToast) {
        showErrorToast(appError, title);
      }
      
      return appError;
    }
    // Handle unknown errors
    else {
      const message = typeof error === 'string' ? error : 'An unknown error occurred';
      const appError = createAppError(
        message,
        ErrorCategory.UNKNOWN,
        operation
      );
      
      if (showToast) {
        showErrorToast(appError, title);
      }
      
      return appError;
    }
  }, [showErrorToast]);
  
  return {
    handleFirebaseError,
    lastError,
    clearError: () => setLastError(null),
    parseFirebaseError
  };
}