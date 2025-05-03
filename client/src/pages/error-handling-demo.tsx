import React from 'react';
import { ErrorHandlingExample } from '@/components/ErrorHandlingExample';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Code, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { QueryStateHandler } from '@/components/ui/query-error-boundary';
import { EmptyStateFallback, ErrorFallback } from '@/components/ui/error-fallback';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useImprovedRecommendationEngine } from '@/hooks/use-improved-recommendation-engine';
import { useImprovedPreferences } from '@/hooks/use-improved-preferences';

export default function ErrorHandlingDemo() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Error Handling System</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        This page demonstrates CineMatch's comprehensive error handling system. It includes
        reusable components, hooks, and utilities to provide consistent, user-friendly error
        messages across the application.
      </p>
      
      <Tabs defaultValue="components">
        <TabsList className="mb-6">
          <TabsTrigger value="components">UI Components</TabsTrigger>
          <TabsTrigger value="hooks">Improved Hooks</TabsTrigger>
          <TabsTrigger value="integration">Integration Example</TabsTrigger>
        </TabsList>
        
        <TabsContent value="components">
          <ErrorHandlingExample />
        </TabsContent>
        
        <TabsContent value="hooks">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  <CardTitle>Improved Hooks</CardTitle>
                </div>
                <CardDescription>
                  Enhanced versions of core hooks with comprehensive error handling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">useImprovedPreferences</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enhanced hook for managing user preferences with error handling and offline support.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono">
                    const preferences = useImprovedPreferences();
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">useImprovedFilmRating</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enhanced hook for managing film ratings with error handling and offline support.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono">
                    const filmRating = useImprovedFilmRating();
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">useImprovedRecommendationEngine</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enhanced hook for managing recommendations with error handling and offline support.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono">
                    const engine = useImprovedRecommendationEngine();
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">useSafeFirestore</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Generic hook for safe Firestore operations with built-in error handling.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono">
                    const firestore = useSafeFirestore('collection_path');
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" asChild>
                  <Link to="/error-handling-demo/hooks">
                    Explore Hook Examples
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <CardTitle>Utility Functions</CardTitle>
                </div>
                <CardDescription>
                  Standardized error handling utilities for consistent error management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">useErrorToast</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Hook for displaying standardized error toasts based on error category.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono">
                    const {'{'} showErrorToast {'}'} = useErrorToast();
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">createAppError</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Creates a standardized AppError with category, code, and context.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono">
                    createAppError(message, category, action, context);
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">handleError</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Standard error handler that logs, tracks, and optionally shows a toast.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono">
                    handleError(error, category, action, context, showToast);
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Error Categories</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Standard error categories for consistent messaging.
                  </p>
                  <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto">
                    {`
enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  DATABASE = 'database',
  FIRESTORE = 'firestore',
  USER_INPUT = 'user_input',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}
                    `.trim()}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" asChild>
                  <Link to="/error-handling-demo/utils">
                    View Error Utils
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="integration">
          <div className="grid gap-6 grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Error Handling in Practice</CardTitle>
                <CardDescription>
                  Live example of the improved recommendation engine with error handling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary>
                  <RecommendationWithErrorHandling />
                </ErrorBoundary>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  <p className="flex items-center">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Try testing with network disconnected to see offline handling
                  </p>
                </div>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecommendationWithErrorHandling() {
  const engine = useImprovedRecommendationEngine();
  const { preferences, isLoading: isLoadingPreferences } = useImprovedPreferences();
  
  return (
    <div className="space-y-4">
      <QueryStateHandler
        isLoading={engine.isLoading || isLoadingPreferences}
        isError={engine.isError}
        error={engine.error}
        isEmpty={engine.recommendations.length === 0 && !engine.isLoading}
        onReset={engine.retryAfterError}
        emptyComponent={
          <EmptyStateFallback
            title="No Recommendations"
            description="Try adjusting your preferences or checking your internet connection."
            action={
              <Button onClick={engine.refreshRecommendations}>
                Refresh Recommendations
              </Button>
            }
          />
        }
      >
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Current Status</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <span className="font-medium mr-2">Network:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${engine.isOffline ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {engine.isOffline ? 'Offline' : 'Online'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">Data source:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${engine.isShowingHistory ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {engine.isShowingHistory ? 'History' : 'Live'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">Recommendations:</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                  {engine.recommendations.length} films
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">User preferences:</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                  {preferences.streamingServices.length > 0
                    ? preferences.streamingServices.length + ' services'
                    : 'None'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {engine.recommendations.slice(0, 6).map((film) => (
              <Card key={film.id} className="overflow-hidden">
                <div className="aspect-[2/3] relative bg-muted">
                  {film.posterUrl ? (
                    <img
                      src={film.posterUrl}
                      alt={film.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-muted-foreground">No image</span>
                    </div>
                  )}
                </div>
                <CardContent className="pt-4">
                  <h3 className="font-semibold text-sm">{film.title}</h3>
                  <p className="text-sm text-muted-foreground">{film.year}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={engine.reset}>
              Reset
            </Button>
            <Button
              onClick={() => engine.getMoreSuggestions()}
              disabled={engine.isLoadingMore || !engine.hasMoreToGenerate}
            >
              {engine.isLoadingMore ? 'Loading...' : 'Get More'}
            </Button>
          </div>
        </div>
      </QueryStateHandler>
    </div>
  );
}