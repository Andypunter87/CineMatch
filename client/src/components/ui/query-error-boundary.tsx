import React, { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ErrorFallback, EmptyStateFallback } from '@/components/ui/error-fallback';
import { Loader2 } from 'lucide-react';
import { ErrorCategory, AppError, normalizeError } from '@/lib/error-utils';

interface QueryErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: Error) => void;
  fallback?: ReactNode | ((props: { error: Error; resetError: () => void }) => ReactNode);
}

interface QueryStateHandlerProps {
  children: ReactNode;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  onReset?: () => void;
  emptyComponent?: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
}

/**
 * Error boundary specifically for React Query with cache invalidation on error
 */
export function QueryErrorBoundary({ children, onError, fallback }: QueryErrorBoundaryProps) {
  const queryClient = useQueryClient();

  const handleError = (error: Error) => {
    // Call the provided onError handler if available
    if (onError) {
      onError(error);
    }
    
    // Log the error
    console.error('Query Error:', error);
    
    // Reset any failed queries
    queryClient.resetQueries();
  };

  return (
    <ErrorBoundary 
      onError={handleError}
      fallback={fallback || ((props) => (
        <ErrorFallback 
          error={props.error} 
          resetError={() => {
            // Clear the query cache and reset the error boundary
            queryClient.resetQueries();
            props.resetError();
          }} 
        />
      ))}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Component that handles all query states (loading, error, empty, success)
 * This can be used to wrap any component that depends on query data
 */
export function QueryStateHandler({
  children,
  isLoading,
  isError,
  error,
  isEmpty,
  onReset,
  emptyComponent,
  loadingComponent,
  errorComponent,
}: QueryStateHandlerProps) {
  // Handle loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Handle error state
  if (isError && error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    
    const normalizedError = normalizeError(error);
    
    // Show specialized error UI based on error category
    if (normalizedError.category === ErrorCategory.NETWORK) {
      return (
        <div className="p-4">
          <ErrorFallback 
            error={normalizedError} 
            resetError={onReset} 
            variant="card" 
          />
        </div>
      );
    }
    
    return (
      <div className="p-4">
        <ErrorFallback 
          error={normalizedError} 
          resetError={onReset} 
          variant="minimal" 
        />
      </div>
    );
  }
  
  // Handle empty state
  if (isEmpty) {
    if (emptyComponent) {
      return <>{emptyComponent}</>;
    }
    
    return (
      <div className="p-4">
        <EmptyStateFallback
          title="No data available"
          description="There is no data to display at this time."
        />
      </div>
    );
  }
  
  // Render children if not loading, not error, and not empty
  return <>{children}</>;
}