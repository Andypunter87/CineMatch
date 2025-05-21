/**
 * Google Analytics tracking utility
 */

// Function to track events in Google Analytics
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  try {
    // Access the window object and gtag function
    const w = window as any;
    
    if (w.gtag) {
      w.gtag('event', eventName, eventParams);
      console.log(`Analytics event tracked: ${eventName}`, eventParams);
    }
  } catch (error) {
    console.error('Error tracking analytics event:', error);
  }
}

// Event name constants to ensure consistency
export const AnalyticsEvents = {
  // User events
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_UPDATED_PROFILE: 'user_updated_profile',
  
  // Onboarding events
  ONBOARDING_PREFERENCES_SET: 'onboarding_preferences_set',
  
  // Questionnaire events
  MOOD_SELECTED: 'mood_selected',
  TIME_SELECTED: 'time_selected',
  LOCATION_SELECTED: 'location_selected',
  AUDIENCE_SELECTED: 'audience_selected',
  RUNTIME_SELECTED: 'runtime_selected',
  QUESTIONNAIRE_COMPLETED: 'questionnaire_completed',
  
  // Watchlist events
  FILM_ADDED_TO_WATCHLIST: 'film_added_to_watchlist',
  FILM_REMOVED_FROM_WATCHLIST: 'film_removed_from_watchlist',
  FILM_MARKED_WATCHED: 'film_marked_watched',
  FILM_RATED: 'film_rated',
  FILM_REVIEWED: 'film_reviewed',
  
  // UX feedback and interaction events
  WATCHLIST_INTERACTION_FEEDBACK: 'watchlist_interaction_feedback',
  UI_FEEDBACK_PROVIDED: 'ui_feedback_provided',
  FILM_ACTION_CLICKED: 'film_action_clicked',
  
  // Recommendation feedback events
  RECOMMENDATION_LIKED: 'recommendation_liked',
  RECOMMENDATION_DISLIKED: 'recommendation_disliked',
  RECOMMENDATION_SOURCE_VIEWED: 'recommendation_source_viewed',
  
  // Recommendation generation events
  MORE_RECOMMENDATIONS_REQUESTED: 'more_recommendations_requested',
};