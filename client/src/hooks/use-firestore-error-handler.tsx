import { useToast } from '@/hooks/use-toast';
import { AppError, ErrorCategory, handleError, parseFirebaseError } from '@/lib/error-utils';
import { FirebaseError } from 'firebase/app';
import { useState, useCallback } from 'react';

/**
 * Custom hook for handling Firestore errors with consistent error handling
 */
export function useFirestoreErrorHandler() {
  const { toast } = useToast();
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  
  // Reset error state
  const resetError = useCallback(() => {
    setIsError(false);
    setError(null);
  }, []);
  
  // Handle Firestore errors
  const handleFirestoreError = useCallback((
    err: Error | FirebaseError,
    action?: string,
    context?: Record<string, any>,
    showToast = true
  ) => {
    let appError: AppError;
    
    if ((err as any).code) {
      // Firebase error
      appError = parseFirebaseError(err as FirebaseError, action);
    } else {
      // Regular error
      appError = handleError(
        err,
        ErrorCategory.FIRESTORE,
        action,
        context
      );
    }
    
    setError(appError);
    setIsError(true);
    
    if (showToast) {
      toast({
        title: 'Database Error',
        description: appError.message,
        variant: 'destructive',
      });
    }
    
    return appError;
  }, [toast]);
  
  // Wrap Firestore operations with error handling
  const withErrorHandling = useCallback(<T extends any[]>(
    fn: (...args: T) => Promise<any>,
    action?: string,
    showToast = true
  ) => {
    return async (...args: T) => {
      try {
        resetError();
        return await fn(...args);
      } catch (err) {
        handleFirestoreError(err as Error, action, { args }, showToast);
        throw err;
      }
    };
  }, [handleFirestoreError, resetError]);
  
  return {
    isError,
    error,
    resetError,
    handleFirestoreError,
    withErrorHandling
  };
}