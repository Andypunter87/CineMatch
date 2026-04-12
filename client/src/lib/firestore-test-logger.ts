/**
 * Utility for logging Firestore operations during testing and development
 */

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  WARNING = 'warning', // Alias for warn
  INFO = 'info',
  DEBUG = 'debug'
}

// Log categories for different operations
export enum LogCategory {
  USER = 'user',
  USER_PREFERENCES = 'user_preferences',
  PREFERENCE = 'preference', // Alias for user_preferences
  RATING = 'rating',
  WATCHLIST = 'watchlist',
  FRIENDS = 'friends',
  RECOMMENDATION = 'recommendation',
  RECOMMENDATIONS = 'recommendations', // Alias for recommendation
  SHARED_RECOMMENDATIONS = 'shared_recommendations',
  FEEDBACK = 'feedback',
  AUTH = 'auth',
  CONFIG = 'config',
  OTHER = 'other'
}

// Log operation types
export type OperationType = 'query' | 'get' | 'add' | 'set' | 'update' | 'delete' | 'batch' | 'transaction';

// Options for logging
export type FirestoreLogOptions = {
  path?: string;
  operation?: OperationType | string;
  count?: number;
  constraints?: string;
  error?: string;
  status?: 'success' | 'not_found' | 'error';
  [key: string]: any;
};

// Whether to enable logging (can be controlled through localStorage)
const isLoggingEnabled = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('firestoreLoggingEnabled') !== 'false';
  }
  return true;
};

// Whether to log to console
const shouldLogToConsole = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('firestoreLogToConsole') === 'true';
  }
  return false;
};

// Log a message with the given level, category, and options
export function logFirestoreOperation(
  level: LogLevel, 
  category: LogCategory, 
  message: string, 
  options: FirestoreLogOptions = {}
) {
  if (!isLoggingEnabled()) return;
  
  // Create the log entry
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    category,
    message,
    ...options
  };
  
  // Log to console if enabled
  if (shouldLogToConsole() || level === LogLevel.ERROR) {
    const style = getConsoleStyle(level);
    console.log(
      `%c[Firestore:${category}] ${message}`,
      style,
      options
    );
  }
  
  // Store in memory log (could be saved to IndexedDB/localStorage in a real implementation)
  addToMemoryLog(logEntry);
}

// Get the console style for the log level
function getConsoleStyle(level: LogLevel): string {
  switch(level) {
    case LogLevel.ERROR:
      return 'color: red; font-weight: bold';
    case LogLevel.WARN:
      return 'color: orange';
    case LogLevel.INFO:
      return 'color: blue';
    case LogLevel.DEBUG:
    default:
      return 'color: gray';
  }
}

// In-memory log storage
const memoryLog: any[] = [];
const MAX_LOG_SIZE = 1000;

// Add a log entry to the in-memory log
function addToMemoryLog(entry: any) {
  memoryLog.push(entry);
  
  // Trim the log if it gets too large
  if (memoryLog.length > MAX_LOG_SIZE) {
    memoryLog.shift();
  }
}

// Get the in-memory log
export function getMemoryLog() {
  return [...memoryLog];
}

// Clear the in-memory log
export function clearMemoryLog() {
  memoryLog.length = 0;
}

// Helper functions for common log operations
export function logQuery(category: LogCategory, message: string, options: FirestoreLogOptions = {}) {
  logFirestoreOperation(LogLevel.INFO, category, message, {
    operation: 'query',
    ...options
  });
}

export function logWrite(category: LogCategory, message: string, options: FirestoreLogOptions = {}) {
  logFirestoreOperation(LogLevel.INFO, category, message, {
    ...options
  });
}

export function logSuccess(category: LogCategory, message: string, options: FirestoreLogOptions = {}) {
  logFirestoreOperation(LogLevel.INFO, category, message, {
    status: 'success',
    ...options
  });
}

export function logError(category: LogCategory, message: string, options: FirestoreLogOptions = {}) {
  logFirestoreOperation(LogLevel.ERROR, category, message, {
    status: 'error',
    ...options
  });
}

export function logFirestoreError(error: Error, location: string, additionalInfo: any = {}) {
  logFirestoreOperation(LogLevel.ERROR, LogCategory.OTHER, `Error in ${location}: ${error.message}`, {
    status: 'error',
    error: error.message,
    stack: error.stack,
    ...additionalInfo
  });
}

export function logDebug(level: LogLevel, message: string, options: FirestoreLogOptions = {}) {
  logFirestoreOperation(level, LogCategory.OTHER, message, options);
}

// Log a user preferences operation
export function logPreferenceOperation(
  level: LogLevel, 
  message: string, 
  options: {
    operationType: string;
    additionalInfo?: any;
  }
) {
  logFirestoreOperation(level, LogCategory.USER_PREFERENCES, message, {
    operation: options.operationType,
    ...options.additionalInfo
  });
}

// Log a rating operation
export function logRatingOperation(
  level: LogLevel, 
  message: string, 
  options: {
    operationType: string;
    additionalInfo?: any;
  }
) {
  logFirestoreOperation(level, LogCategory.RATING, message, {
    operation: options.operationType,
    ...options.additionalInfo
  });
}

// Log a watchlist operation
export function logWatchlistOperation(
  level: LogLevel, 
  message: string, 
  options: {
    operationType: string;
    additionalInfo?: any;
  }
) {
  logFirestoreOperation(level, LogCategory.WATCHLIST, message, {
    operation: options.operationType,
    ...options.additionalInfo
  });
}

// Log a feedback operation
export function logFeedbackOperation(
  level: LogLevel, 
  message: string, 
  options: {
    operationType: string;
    additionalInfo?: any;
  }
) {
  logFirestoreOperation(level, LogCategory.FEEDBACK, message, {
    operation: options.operationType,
    ...options.additionalInfo
  });
}

// Log a friends operation
export function logFriendsOperation(
  level: LogLevel, 
  message: string, 
  options: {
    operationType: string;
    additionalInfo?: any;
  }
) {
  logFirestoreOperation(level, LogCategory.FRIENDS, message, {
    operation: options.operationType,
    ...options.additionalInfo
  });
}

// Log a recommendations operation
export function logRecommendationsOperation(
  level: LogLevel, 
  message: string, 
  options: {
    operationType: string;
    additionalInfo?: any;
  }
) {
  logFirestoreOperation(level, LogCategory.RECOMMENDATION, message, {
    operation: options.operationType,
    ...options.additionalInfo
  });
}

// Log an auth operation
export function logAuthOperation(
  level: LogLevel, 
  message: string, 
  options: {
    operationType: string;
    additionalInfo?: any;
  }
) {
  logFirestoreOperation(level, LogCategory.AUTH, message, {
    operation: options.operationType,
    ...options.additionalInfo
  });
}

// Enable/disable logging
export function setLoggingEnabled(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('firestoreLoggingEnabled', enabled ? 'true' : 'false');
  }
}

// Enable/disable console logging
export function setLogToConsole(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('firestoreLogToConsole', enabled ? 'true' : 'false');
  }
}

// Initialize with default settings
export function initializeLogger() {
  if (typeof window !== 'undefined') {
    // Enable logging by default
    if (localStorage.getItem('firestoreLoggingEnabled') === null) {
      localStorage.setItem('firestoreLoggingEnabled', 'true');
    }
    
    // Disable console logging by default (except for errors)
    if (localStorage.getItem('firestoreLogToConsole') === null) {
      localStorage.setItem('firestoreLogToConsole', 'false');
    }
  }
}

// Initialize logger on import
initializeLogger();