import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { RecommendationRequest } from '@shared/schema';

export interface ChatSession {
  id: string;
  userId: number;
  messages: Array<{
    id: string;
    sender: 'cineMate' | 'user';
    text: string;
    timestamp: string;
  }>;
  preferences: RecommendationRequest;
  customVibes?: string[];
  personalizedMoods?: string[];
  createdAt: string;
  updatedAt: string;
  completed: boolean;
}

export interface VibePreference {
  text: string;
  frequency: number;
  lastUsed: string;
  source: 'user_custom' | 'ai_generated' | 'predefined';
}

export function useChatPersistence() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveChatSession = async (
    sessionData: Omit<ChatSession, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      await apiRequest('POST', '/api/chat-sessions', {
        messages: sessionData.messages,
        preferences: sessionData.preferences,
        customVibes: sessionData.customVibes || [],
        personalizedMoods: sessionData.personalizedMoods || [],
        completed: sessionData.completed,
      });
      return true;
    } catch (err) {
      console.error('Error saving chat session:', err);
      setError('Failed to save chat session');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveVibePreference = async (
    vibeText: string,
    _source: VibePreference['source'] = 'user_custom'
  ): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }
    // Vibe preferences are persisted as part of chat sessions (customVibes field)
    // This is a no-op stub kept for interface compatibility
    console.log(`Vibe preference noted: "${vibeText}"`);
    return true;
  };

  const savePersonalizedMoods = async (moods: string[]): Promise<boolean> => {
    if (!user || !moods.length) return false;
    // Personalized moods are persisted as part of chat sessions
    // This is a no-op stub kept for interface compatibility
    console.log(`Personalized moods noted: ${moods.join(', ')}`);
    return true;
  };

  const getTopVibePreferences = async (_limit: number = 10): Promise<VibePreference[]> => {
    // Not implemented — vibes are embedded in chat sessions
    return [];
  };

  return {
    saveChatSession,
    saveVibePreference,
    savePersonalizedMoods,
    getTopVibePreferences,
    isSaving,
    error,
  };
}
