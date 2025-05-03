/**
 * Specialized utilities for detailed Firestore operation logging
 * This helps with troubleshooting Firestore operations during the onboarding flow
 */

// Log Categories
export enum LogCategory {
  PREFERENCE = 'preferences',
  RATING = 'ratings',
  AUTH = 'authentication',
  CONFIG = 'configuration',
  OTHER = 'other'
}

// Log Levels
export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

interface FirestoreLogOptions {
  userId?: number | string | null;
  errorCode?: string;
  errorMessage?: string;
  documentPath?: string;
  collectionPath?: string;
  data?: any;
  operationType?: 'read' | 'write' | 'delete' | 'update' | 'query' | 'setup' | 'test';
  additionalInfo?: Record<string, any>;
}

/**
 * Comprehensive logger for Firestore operations
 */
export function logFirestoreOperation(
  category: LogCategory,
  level: LogLevel,
  message: string,
  options: FirestoreLogOptions = {}
) {
  const {
    userId,
    errorCode,
    errorMessage,
    documentPath,
    collectionPath,
    data,
    operationType,
    additionalInfo
  } = options;

  // Generate a timestamp
  const timestamp = new Date().toISOString();
  
  // Format data for logging but remove large or sensitive fields
  const safeData = data ? sanitizeData(data) : undefined;
  
  // Create the log payload
  const logPayload = {
    timestamp,
    category,
    level,
    message,
    userId,
    operationType,
    documentPath,
    collectionPath,
    ...(errorCode && { errorCode }),
    ...(errorMessage && { errorMessage }),
    ...(safeData && { data: safeData }),
    ...additionalInfo
  };
  
  // Use different console methods based on log level
  const prefix = `[FIRESTORE TEST ${level.toUpperCase()}] [${category}]`;
  switch (level) {
    case LogLevel.ERROR:
      console.error(prefix, message, logPayload);
      break;
    case LogLevel.WARNING:
      console.warn(prefix, message, logPayload);
      break;
    case LogLevel.SUCCESS:
      console.log(`%c${prefix} ${message}`, 'color: green; font-weight: bold', logPayload);
      break;
    case LogLevel.INFO:
    default:
      console.log(prefix, message, logPayload);
  }
  
  return logPayload; // Return for potential additional processing
}

/**
 * Sanitize data for logging (remove sensitive information, truncate large values)
 */
function sanitizeData(data: any): any {
  if (!data) return undefined;
  
  // If it's not an object, return as is
  if (typeof data !== 'object') return data;
  
  // If it's an array, sanitize each item
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  const result: Record<string, any> = {};
  
  // Process each property
  for (const [key, value] of Object.entries(data)) {
    // Skip internal/private props
    if (key.startsWith('_') && key !== '_metadata') continue;
    
    // Skip any password or token fields
    if (/passw|token|secret|key|auth/i.test(key)) {
      result[key] = '[REDACTED]';
      continue;
    }
    
    // Handle nested objects
    if (value !== null && typeof value === 'object') {
      if (Object.keys(value).length > 10) {
        // If object is large, just show keys
        result[key] = `[Object with ${Object.keys(value).length} keys]`;
      } else {
        result[key] = sanitizeData(value);
      }
    } 
    // Handle strings - truncate if too long
    else if (typeof value === 'string' && value.length > 100) {
      result[key] = `${value.substring(0, 100)}... [truncated, ${value.length} chars]`;
    }
    // Pass everything else as is
    else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Convenience method for logging preference operations
 */
export function logPreferenceOperation(
  level: LogLevel,
  message: string,
  options: FirestoreLogOptions = {}
) {
  return logFirestoreOperation(LogCategory.PREFERENCE, level, message, options);
}

/**
 * Convenience method for logging rating operations
 */
export function logRatingOperation(
  level: LogLevel,
  message: string,
  options: FirestoreLogOptions = {}
) {
  return logFirestoreOperation(LogCategory.RATING, level, message, options);
}

/**
 * Convenience method for logging auth operations
 */
export function logAuthOperation(
  level: LogLevel,
  message: string,
  options: FirestoreLogOptions = {}
) {
  return logFirestoreOperation(LogCategory.AUTH, level, message, options);
}

/**
 * Log a successful operation with green color highlighting
 */
export function logSuccess(
  category: LogCategory,
  message: string,
  options: FirestoreLogOptions = {}
) {
  return logFirestoreOperation(category, LogLevel.SUCCESS, message, options);
}

/**
 * Log Firestore error with detailed diagnostics
 */
export function logFirestoreError(
  category: LogCategory,
  message: string,
  error: any,
  options: FirestoreLogOptions = {}
) {
  // Extract Firebase-specific error information if available
  const errorCode = error?.code || 'unknown';
  const errorMessage = error?.message || 'Unknown error';
  
  return logFirestoreOperation(
    category,
    LogLevel.ERROR,
    message,
    {
      ...options,
      errorCode,
      errorMessage,
      additionalInfo: {
        ...(options.additionalInfo || {}),
        errorStack: error?.stack ? error.stack.split('\n').slice(0, 3).join('\n') : undefined
      }
    }
  );
}