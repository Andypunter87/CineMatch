import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";
import { FirebaseError } from "firebase/app";

// Error categories for consistent handling
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  DATABASE = 'database',
  FIRESTORE = 'firestore',
  USER_INPUT = 'user_input',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

// Custom error class with additional context
export class AppError extends Error {
  category: ErrorCategory;
  code?: string;
  action?: string;
  context?: Record<string, any>;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    action?: string,
    code?: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.code = code;
    this.action = action;
    this.context = context;
    
    // Ensure the stack trace includes this constructor
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Factory function to create AppError from any error
export function createAppError(
  message: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  action?: string,
  context?: Record<string, any>
): AppError {
  return new AppError(message, category, action, undefined, context);
}

// Convert any error to AppError for consistent handling
export function normalizeError(error: unknown): AppError {
  // If it's already an AppError, return it as is
  if (error instanceof AppError) {
    return error;
  }
  
  // Handle Firebase errors
  if (error instanceof FirebaseError) {
    let category = ErrorCategory.UNKNOWN;
    
    // Determine category based on Firebase error code
    if (error.code.startsWith('auth/')) {
      category = ErrorCategory.AUTHENTICATION;
    } else if (error.code.startsWith('firestore/')) {
      category = ErrorCategory.FIRESTORE;
    } else if (error.code.startsWith('permission-denied')) {
      category = ErrorCategory.PERMISSION;
    } else if (error.code.startsWith('unavailable') || error.code.startsWith('network-request-failed')) {
      category = ErrorCategory.NETWORK;
    }
    
    return new AppError(
      error.message,
      category,
      undefined,
      error.code,
      { originalError: error }
    );
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    let category = ErrorCategory.UNKNOWN;
    
    // Try to determine category from error message
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('connection') || message.includes('offline')) {
      category = ErrorCategory.NETWORK;
    } else if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      category = ErrorCategory.PERMISSION;
    } else if (message.includes('auth') || message.includes('login')) {
      category = ErrorCategory.AUTHENTICATION;
    } else if (message.includes('database') || message.includes('sql')) {
      category = ErrorCategory.DATABASE;
    }
    
    return new AppError(
      error.message,
      category,
      undefined,
      undefined,
      { originalError: error, stack: error.stack }
    );
  }
  
  // For string errors
  if (typeof error === 'string') {
    return new AppError(error);
  }
  
  // For unknown errors
  return new AppError('An unknown error occurred');
}

// Centralized error handling function
export function handleError(
  error: unknown,
  category?: ErrorCategory,
  action?: string,
  context?: Record<string, any>,
  showToast = false
): AppError {
  // Normalize the error
  const normalizedError = normalizeError(error);
  
  // Override with provided information if available
  if (category) normalizedError.category = category;
  if (action) normalizedError.action = action;
  if (context) normalizedError.context = { ...normalizedError.context, ...context };
  
  // Log the error with additional context
  console.error(`[${normalizedError.category}] ${normalizedError.action ? `(${normalizedError.action}) ` : ''}Error:`, 
    normalizedError.message, 
    normalizedError.context || ''
  );
  
  // Track the error (could be extended with analytics)
  
  return normalizedError;
}

// Custom hook for showing error toasts with proper categorization
export function useErrorToast() {
  const { toast } = useToast();
  const [lastError, setLastError] = useState<AppError | null>(null);
  
  const showErrorToast = useCallback((error: unknown, title?: string) => {
    const normalizedError = normalizeError(error);
    setLastError(normalizedError);
    
    // Customize toast based on error category
    let variant: 'default' | 'destructive' = 'destructive';
    let defaultTitle = 'Error';
    
    switch (normalizedError.category) {
      case ErrorCategory.NETWORK:
        defaultTitle = 'Network Error';
        break;
      case ErrorCategory.AUTHENTICATION:
        defaultTitle = 'Authentication Error';
        break;
      case ErrorCategory.PERMISSION:
        defaultTitle = 'Permission Error';
        break;
      case ErrorCategory.FIRESTORE:
        defaultTitle = 'Database Error';
        break;
      case ErrorCategory.USER_INPUT:
        defaultTitle = 'Input Error';
        variant = 'default';
        break;
    }
    
    toast({
      title: title || defaultTitle,
      description: normalizedError.message,
      variant
    });
    
    return normalizedError;
  }, [toast]);
  
  return {
    showErrorToast,
    lastError,
    clearLastError: () => setLastError(null)
  };
}