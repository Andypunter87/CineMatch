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
    source: VibePreference['source'] = 'user_custom'
  ): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }
    try {
      await apiRequest('POST', '/api/vibes', { customVibe: vibeText, source });
      return true;
    } catch (err) {
      console.error('Error saving vibe preference:', err);
      setError('Failed to save vibe preference');
      return false;
    }
  };

  const savePersonalizedMoods = async (moods: string[]): Promise<boolean> => {
    if (!user || !moods.length) return false;
    try {
      await Promise.all(
        moods.map((mood) =>
          apiRequest('POST', '/api/vibes', { customVibe: mood, source: 'ai_generated' })
        )
      );
      return true;
    } catch (err) {
      console.error('Error saving personalized moods:', err);
      setError('Failed to save personalized moods');
      return false;
    }
  };

  const getTopVibePreferences = async (_limit: number = 10): Promise<VibePreference[]> => {
    if (!user) return [];
    try {
      const res = await apiRequest('GET', '/api/vibes');
      const data = await res.json();
      const vibes = Array.isArray(data) ? data : data.vibes || [];
      return vibes.map((v: Record<string, unknown>) => ({
        text: v.customVibe as string,
        frequency: (v.count as number) || 1,
        lastUsed: (v.lastUsed as string) || new Date().toISOString(),
        source: 'user_custom' as VibePreference['source'],
      }));
    } catch {
      return [];
    }
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
