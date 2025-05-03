import React from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ErrorFallback, DataErrorFallback } from '@/components/ui/error-fallback';
import { ErrorCategory, AppError } from '@/lib/error-utils';

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
  fallbackRender?: (props: {
    error: Error;
    resetErrorBoundary: () => void;
  }) => React.ReactNode;
}

/**
 * Error boundary specifically designed for React Query errors
 * Automatically resets query cache on retry
 */
export function QueryErrorBoundary({
  children,
  fallbackRender,
}: QueryErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onError={(error) => {
        console.error('React Query Error:', error);
      }}
      fallback={
        fallbackRender ? (
          // Custom fallback if provided
          // @ts-ignore type issues with ErrorBoundary props
          (props) => fallbackRender({ ...props, resetErrorBoundary: reset })
        ) : (
          // Default fallback for query errors
          <ErrorFallback
            title="Data Fetch Error"
            description="There was an error loading the data."
            resetError={reset}
            variant="card"
          />
        )
      }
      resetOnPropsChange={false}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Component to handle data loading states in one component
 */
export function QueryStateHandler({
  isLoading,
  isError,
  error,
  children,
  onReset,
  loadingComponent,
  emptyComponent,
  isEmpty = false,
}: {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  children: React.ReactNode;
  onReset?: () => void;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  isEmpty?: boolean;
}) {
  // Handle loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (isError && error) {
    return (
      <DataErrorFallback
        error={error}
        resetError={onReset}
      />
    );
  }

  // Handle empty state
  if (isEmpty && emptyComponent) {
    return <>{emptyComponent}</>;
  }

  // Render children when data is available and there are no errors
  return <>{children}</>;
}