/**
 * Type definitions for user preferences
 * These are used to store country and streaming service preferences
 * both during onboarding and for general profile management
 */

export interface UserPreferences {
  country: string;
  streamingServices: string[];
  lastUpdated?: string | Date;
}