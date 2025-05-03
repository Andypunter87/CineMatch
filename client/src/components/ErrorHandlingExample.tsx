import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { EmptyStateFallback, ErrorFallback, NetworkErrorFallback, ServerErrorFallback } from '@/components/ui/error-fallback';
import { QueryErrorBoundary, QueryStateHandler } from '@/components/ui/query-error-boundary';
import { useErrorToast } from '@/lib/error-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorCategory, AppError, createAppError } from '@/lib/error-utils';
import { useImprovedPreferences } from '@/hooks/use-improved-preferences';
import { useImprovedFilmRating } from '@/hooks/use-improved-film-rating';
import { useSafeFirestore } from '@/hooks/use-safe-firestore';
import { FileQuestion, FileWarning, ThumbsUp, AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

/**
 * Component that demonstrates the various error handling components and hooks
 */
export function ErrorHandlingExample() {
  const [activeTab, setActiveTab] = useState('ui-components');
  const { showErrorToast } = useErrorToast();
  
  // Simulate different types of errors
  const simulateError = (type: string) => {
    switch (type) {
      case 'simple':
        showErrorToast(new Error('This is a simple error message'));
        break;
      case 'network':
        showErrorToast(
          createAppError(
            'Failed to connect to the server. Please check your internet connection.',
            ErrorCategory.NETWORK,
            'fetchData'
          ),
          'Network Connection Failed'
        );
        break;
      case 'permission':
        showErrorToast(
          createAppError(
            'You do not have permission to access this resource.',
            ErrorCategory.PERMISSION,
            'accessResource'
          ),
          'Access Denied'
        );
        break;
      case 'firestore':
        showErrorToast(
          createAppError(
            'Error loading data from Firestore: document not found.',
            ErrorCategory.FIRESTORE,
            'getDocument'
          ),
          'Database Error'
        );
        break;
      case 'throw':
        throw new Error('This error was thrown inside the component!');
      default:
        showErrorToast(new Error('Unknown error type'));
    }
  };
  
  // Example component that demonstrates how to use the error boundary
  const ErrorProneComponent = () => {
    const [willError, setWillError] = useState(false);
    
    if (willError) {
      throw new Error('This component has crashed!');
    }
    
    return (
      <div className="p-4 border rounded-md">
        <h3 className="text-lg font-medium mb-2">Error Boundary Demo</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Click the button below to cause this component to throw an error,
          which will be caught by the error boundary.
        </p>
        <Button variant="destructive" onClick={() => setWillError(true)}>
          <FileWarning className="mr-2 h-4 w-4" />
          Trigger Error
        </Button>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Error Handling Examples</h1>
      <p className="text-muted-foreground mb-6">
        This page demonstrates the various error handling components and patterns
        implemented in the application.
      </p>
      
      <Tabs defaultValue="ui-components" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="ui-components">UI Components</TabsTrigger>
          <TabsTrigger value="error-boundaries">Error Boundaries</TabsTrigger>
          <TabsTrigger value="toasts">Error Toasts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ui-components">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Error Fallback Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Error Fallback Components</CardTitle>
                <CardDescription>
                  Reusable error UI components for different scenarios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Standard Error</h3>
                  <ErrorFallback 
                    error={createAppError('Something went wrong loading your data', ErrorCategory.UNKNOWN)} 
                    resetError={() => {}} 
                    variant="minimal" 
                  />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Network Error</h3>
                  <NetworkErrorFallback retryAction={() => {}} />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Server Error</h3>
                  <ServerErrorFallback retryAction={() => {}} />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-2">Empty State</h3>
                  <EmptyStateFallback
                    icon={<FileQuestion className="h-5 w-5" />}
                    title="No Results Found"
                    description="Try adjusting your search or filters to find what you're looking for."
                    action={<Button variant="outline">Clear Filters</Button>}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* QueryStateHandler Example */}
            <Card>
              <CardHeader>
                <CardTitle>Query State Handler</CardTitle>
                <CardDescription>
                  Unified component for handling loading, error and empty states
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => setActiveTab('loading-state')}>
                    Show Loading
                  </Button>
                  <Button onClick={() => setActiveTab('error-state')} variant="destructive">
                    Show Error
                  </Button>
                  <Button onClick={() => setActiveTab('empty-state')} variant="outline">
                    Show Empty
                  </Button>
                  <Button onClick={() => setActiveTab('ui-components')} variant="secondary">
                    Show Content
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <QueryStateHandler
                    isLoading={activeTab === 'loading-state'}
                    isError={activeTab === 'error-state'}
                    error={activeTab === 'error-state' ? new Error('Failed to load data') : null}
                    isEmpty={activeTab === 'empty-state'}
                    onReset={() => setActiveTab('ui-components')}
                    emptyComponent={
                      <EmptyStateFallback
                        icon={<FileQuestion className="h-5 w-5" />}
                        title="No Items Found"
                        description="Try different filters or add some items."
                        action={<Button size="sm">Add Item</Button>}
                      />
                    }
                  >
                    <div className="p-6 text-center">
                      <ThumbsUp className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-medium">Content Loaded Successfully</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        This is the content that appears when data is successfully loaded.
                      </p>
                    </div>
                  </QueryStateHandler>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="error-boundaries">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Error Boundary Example */}
            <Card>
              <CardHeader>
                <CardTitle>Error Boundary</CardTitle>
                <CardDescription>
                  React error boundary that catches errors during rendering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary>
                  <ErrorProneComponent />
                </ErrorBoundary>
              </CardContent>
            </Card>
            
            {/* Query Error Boundary Example */}
            <Card>
              <CardHeader>
                <CardTitle>Query Error Boundary</CardTitle>
                <CardDescription>
                  Specialized error boundary for React Query that resets query cache
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QueryErrorBoundary>
                  <div className="p-4 border rounded-md">
                    <h3 className="text-lg font-medium mb-2">React Query Error Handling</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This component is wrapped in a QueryErrorBoundary which will
                      catch errors thrown by React Query.
                    </p>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        // Simulate a React Query error
                        throw new Error('React Query failed to fetch data!');
                      }}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Simulate Query Error
                    </Button>
                  </div>
                </QueryErrorBoundary>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="toasts">
          <Card>
            <CardHeader>
              <CardTitle>Error Toast Messages</CardTitle>
              <CardDescription>
                Demonstration of different types of error toasts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Button variant="outline" onClick={() => simulateError('simple')}>
                  Simple Error Toast
                </Button>
                <Button variant="outline" onClick={() => simulateError('network')}>
                  Network Error Toast
                </Button>
                <Button variant="outline" onClick={() => simulateError('permission')}>
                  Permission Error Toast
                </Button>
                <Button variant="outline" onClick={() => simulateError('firestore')}>
                  Firestore Error Toast
                </Button>
                <Button variant="destructive" onClick={() => simulateError('throw')}>
                  Throw Component Error
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 text-sm text-muted-foreground">
              <ShieldAlert className="mr-2 h-4 w-4" />
              Use ErrorBoundary to catch component errors in production
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}