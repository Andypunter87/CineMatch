import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createAppError, ErrorCategory } from '@/lib/error-utils';

/**
 * Enhanced error handling for fetch responses
 * Categorizes errors based on status codes and provides better error messages
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Determine error category based on status code
    let category = ErrorCategory.UNKNOWN;
    
    if (res.status === 401 || res.status === 403) {
      category = ErrorCategory.AUTHENTICATION;
    } else if (res.status === 404) {
      category = ErrorCategory.DATABASE;
    } else if (res.status >= 500) {
      category = ErrorCategory.DATABASE;
    } else if (res.status === 429) {
      category = ErrorCategory.NETWORK;
    }
    
    // Create a more detailed error
    throw createAppError(
      `${res.status}: ${text}`,
      category,
      'fetchData',
      { status: res.status, url: res.url }
    );
  }
}

/**
 * Make an API request with enhanced error handling
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  authToken?: string,
): Promise<Response> {
  // Define headers with Content-Type when there's data
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add Authorization header if authToken is provided
  if (authToken) {
    headers["Authorization"] = authToken;
  }
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Check if it's already an AppError
    if (error instanceof Error && error.name === 'AppError') {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof Error && 
        (error.message.includes('network') || error.message.includes('fetch'))) {
      throw createAppError(
        'Network error occurred. Please check your connection and try again.',
        ErrorCategory.NETWORK,
        'apiRequest',
        { originalError: error.message }
      );
    }
    
    // Re-throw other errors
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

interface GetQueryFnOptions {
  on401: UnauthorizedBehavior;
  onError?: (error: Error) => void;
}

/**
 * Enhanced query function creator with error handling
 */
export function getQueryFn<TQueryFnData>(options: GetQueryFnOptions): QueryFunction<TQueryFnData> {
  const { on401: unauthorizedBehavior, onError } = options;
  
  return async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null as unknown as TQueryFnData;
      }

      await throwIfResNotOk(res);
      return await res.json() as TQueryFnData;
    } catch (error) {
      // Call the optional onError handler
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      throw error;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
