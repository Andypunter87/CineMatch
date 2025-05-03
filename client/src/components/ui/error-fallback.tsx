import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AppError, ErrorCategory } from '@/lib/error-utils';
import { AlertTriangle, RefreshCw, Wifi, Database, Shield, FileWarning } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error | AppError;
  resetError?: () => void;
  variant?: 'default' | 'minimal' | 'card';
}

interface NetworkErrorFallbackProps {
  retryAction?: () => void;
  message?: string;
}

interface ServerErrorFallbackProps {
  retryAction?: () => void;
  message?: string;
}

interface DataErrorFallbackProps {
  retryAction?: () => void;
  message?: string;
}

interface EmptyStateFallbackProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * Standard error fallback component for displaying errors in a user-friendly way
 */
export function ErrorFallback({ error, resetError, variant = 'default' }: ErrorFallbackProps) {
  const appError = error instanceof AppError ? error : new AppError(error.message);
  
  // Choose appropriate icon based on error category
  let ErrorIcon = AlertTriangle;
  switch (appError.category) {
    case ErrorCategory.NETWORK:
      ErrorIcon = Wifi;
      break;
    case ErrorCategory.DATABASE:
    case ErrorCategory.FIRESTORE:
      ErrorIcon = Database;
      break;
    case ErrorCategory.PERMISSION:
    case ErrorCategory.AUTHENTICATION:
      ErrorIcon = Shield;
      break;
    case ErrorCategory.UNKNOWN:
    default:
      ErrorIcon = AlertTriangle;
  }
  
  // For minimal variant
  if (variant === 'minimal') {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center space-y-4 rounded-lg bg-muted/30">
        <ErrorIcon className="h-8 w-8 text-red-500" />
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Something went wrong</h3>
          <p className="text-xs text-muted-foreground">{appError.message}</p>
        </div>
        {resetError && (
          <Button variant="outline" size="sm" onClick={resetError}>
            <RefreshCw className="mr-2 h-3 w-3" />
            Try Again
          </Button>
        )}
      </div>
    );
  }
  
  // For card variant
  if (variant === 'card') {
    return (
      <Card className="w-full border-red-200 bg-red-50 dark:bg-red-950/10 dark:border-red-800/20">
        <CardHeader className="pb-2">
          <div className="flex items-center">
            <ErrorIcon className="h-5 w-5 text-red-500 mr-2" />
            <CardTitle className="text-base">An error occurred</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pb-2 text-sm">
          <p>{appError.message}</p>
          {appError.action && (
            <p className="text-xs text-muted-foreground mt-1">
              Error while: {appError.action}
            </p>
          )}
        </CardContent>
        {resetError && (
          <CardFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={resetError}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Try Again
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }
  
  // Default variant
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center border rounded-lg">
      <ErrorIcon className="h-12 w-12 text-red-500" />
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Something went wrong</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{appError.message}</p>
        {appError.action && (
          <p className="text-xs text-muted-foreground">
            Error occurred while {appError.action}
          </p>
        )}
      </div>
      {resetError && (
        <Button variant="outline" onClick={resetError}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Specialized error fallback for network errors
 */
export function NetworkErrorFallback({ retryAction, message }: NetworkErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center border rounded-lg">
      <Wifi className="h-12 w-12 text-red-500" />
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Network Error</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {message || "We're having trouble connecting to the server. Please check your internet connection and try again."}
        </p>
      </div>
      {retryAction && (
        <Button variant="outline" onClick={retryAction}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry Connection
        </Button>
      )}
    </div>
  );
}

/**
 * Specialized error fallback for server errors
 */
export function ServerErrorFallback({ retryAction, message }: ServerErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center border rounded-lg">
      <Database className="h-12 w-12 text-red-500" />
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Server Error</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {message || "The server encountered an error. We've been notified and will fix this as soon as possible."}
        </p>
      </div>
      {retryAction && (
        <Button variant="outline" onClick={retryAction}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Specialized error fallback for data errors
 */
export function DataErrorFallback({ retryAction, message }: DataErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center border rounded-lg">
      <FileWarning className="h-12 w-12 text-red-500" />
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Data Error</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {message || "We encountered an error loading your data. This might be temporary."}
        </p>
      </div>
      {retryAction && (
        <Button variant="outline" onClick={retryAction}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload Data
        </Button>
      )}
    </div>
  );
}

/**
 * Component for displaying empty states with consistent styling
 */
export function EmptyStateFallback({ icon, title, description, action }: EmptyStateFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center border border-dashed rounded-lg">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">{title}</h3>
        {description && <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}