import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, ServerOff, LockKeyhole, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorCategory, AppError } from '@/lib/error-utils';

interface ErrorFallbackProps {
  error?: AppError | Error | null;
  resetError?: () => void;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'inline' | 'fullscreen' | 'card' | 'minimal';
}

/**
 * Generic error fallback component with different variants
 */
export function ErrorFallback({
  error,
  resetError,
  title,
  description,
  action,
  variant = 'card'
}: ErrorFallbackProps) {
  // Determine error category if it's an AppError
  const category = (error && 'category' in error) 
    ? (error as AppError).category 
    : ErrorCategory.UNKNOWN;
  
  // Get appropriate icon based on error category
  const getErrorIcon = () => {
    switch (category) {
      case ErrorCategory.NETWORK:
        return <Wifi className="h-6 w-6" />;
      case ErrorCategory.DATABASE:
      case ErrorCategory.FIRESTORE:
        return <ServerOff className="h-6 w-6" />;
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.PERMISSION:
        return <LockKeyhole className="h-6 w-6" />;
      default:
        return <AlertTriangle className="h-6 w-6" />;
    }
  };
  
  // Get helpful message based on error category
  const getHelpMessage = () => {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Check your internet connection and try again.';
      case ErrorCategory.DATABASE:
      case ErrorCategory.FIRESTORE:
        return 'There was a problem accessing your data. Please try again later.';
      case ErrorCategory.AUTHENTICATION:
        return 'There was a problem with your account. Try logging in again.';
      case ErrorCategory.PERMISSION:
        return 'You don\'t have permission to access this resource.';
      default:
        return 'Please try again or contact support if the problem persists.';
    }
  };
  
  // Get error title
  const errorTitle = title || (() => {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Network Error';
      case ErrorCategory.DATABASE:
      case ErrorCategory.FIRESTORE:
        return 'Data Error';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication Error';
      case ErrorCategory.PERMISSION:
        return 'Permission Error';
      default:
        return 'Something Went Wrong';
    }
  })();
  
  // Get error description
  const errorDescription = description || error?.message || getHelpMessage();
  
  // Minimal variant - just an alert
  if (variant === 'minimal') {
    return (
      <Alert variant="destructive">
        {getErrorIcon()}
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription>{errorDescription}</AlertDescription>
      </Alert>
    );
  }
  
  // Inline variant - alert with try again button
  if (variant === 'inline') {
    return (
      <div className="p-4 rounded-lg bg-background border">
        <Alert variant="destructive" className="mb-4">
          {getErrorIcon()}
          <AlertTitle>{errorTitle}</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
        <div className="flex justify-end">
          {action || (resetError && (
            <Button onClick={resetError} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          ))}
        </div>
      </div>
    );
  }
  
  // Card variant - more detailed card with actions
  if (variant === 'card') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {getErrorIcon()}
            <CardTitle>{errorTitle}</CardTitle>
          </div>
          <CardDescription>
            {errorDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && error.stack && process.env.NODE_ENV === 'development' && (
            <div className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-[200px]">
              <pre>{error.stack}</pre>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          {action || (resetError && (
            <Button onClick={resetError} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          ))}
        </CardFooter>
      </Card>
    );
  }
  
  // Fullscreen variant - center on screen
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm z-50">
      <div className="max-w-md w-full">
        <Card className="border-destructive shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 bg-destructive/10 p-3 rounded-full">
              {getErrorIcon()}
            </div>
            <CardTitle className="text-xl">{errorTitle}</CardTitle>
            <CardDescription className="text-base">
              {errorDescription}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center gap-2">
            {action || (resetError && (
              <Button onClick={resetError} variant="default" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            ))}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

/**
 * Loading error fallback specifically for data fetching errors
 */
export function DataErrorFallback({
  error,
  resetError,
  isLoading = false
}: {
  error?: AppError | Error | null;
  resetError?: () => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading data...</p>
        </div>
      </div>
    );
  }
  
  if (!error) return null;
  
  const category = 'category' in error ? (error as AppError).category : ErrorCategory.UNKNOWN;
  
  return (
    <div className="py-6 px-4">
      <ErrorFallback
        error={error}
        resetError={resetError}
        variant="card"
        title={
          category === ErrorCategory.FIRESTORE || category === ErrorCategory.DATABASE 
            ? 'Data Loading Error' 
            : 'Error Loading Content'
        }
      />
    </div>
  );
}

/**
 * Network-specific error fallback
 */
export function NetworkErrorFallback({
  retryAction
}: {
  retryAction?: () => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-background border">
      <div className="text-center mb-4">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Wifi className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Network Error</h3>
        <p className="text-muted-foreground">
          Unable to connect to our servers. Please check your internet connection.
        </p>
      </div>
      {retryAction && (
        <Button onClick={retryAction} variant="default" className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry Connection
        </Button>
      )}
    </div>
  );
}

/**
 * Authentication-specific error fallback
 */
export function AuthErrorFallback({
  error,
  loginAction
}: {
  error?: AppError | Error;
  loginAction?: () => void;
}) {
  const message = error?.message || 'Your session may have expired or you need to log in again.';
  
  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-6 w-6" />
          <CardTitle>Authentication Error</CardTitle>
        </div>
        <CardDescription>
          {message}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-end">
        {loginAction && (
          <Button onClick={loginAction} variant="default">
            Log In Again
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * Server error fallback
 */
export function ServerErrorFallback({
  retryAction
}: {
  retryAction?: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <ServerOff className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">Server Error</h3>
      <p className="mt-2 text-muted-foreground">
        Our servers are currently experiencing issues. Please try again later.
      </p>
      {retryAction && (
        <div className="mt-6">
          <Button onClick={retryAction} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Permission error fallback
 */
export function PermissionErrorFallback() {
  return (
    <div className="p-6 text-center">
      <LockKeyhole className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
      <p className="mt-2 text-muted-foreground">
        You don't have permission to access this content.
      </p>
    </div>
  );
}

/**
 * Generic error state for empty states (no results)
 */
export function EmptyStateFallback({
  icon,
  title,
  description,
  action
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon || <Bug className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}