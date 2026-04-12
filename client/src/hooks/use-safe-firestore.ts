/**
 * Stub for useSafeFirestore — Firestore has been replaced with PostgreSQL.
 * Kept for interface compatibility with existing callers.
 */
import { useState } from 'react';

export function useSafeFirestore() {
  const [isLoading, _setIsLoading] = useState(false);
  const [error, _setError] = useState<null>(null);

  const setDocument = async (
    _path: string,
    _data: any,
    _options?: any
  ): Promise<boolean> => {
    return true;
  };

  const getDocument = async (
    _path: string
  ): Promise<any | null> => {
    return null;
  };

  const deleteDocument = async (
    _path: string
  ): Promise<boolean> => {
    return true;
  };

  const saveUserPreferences = async (
    _userId: string | number,
    _preferences: any,
    _options?: any
  ): Promise<boolean> => {
    return true;
  };

  return {
    isLoading,
    error,
    setDocument,
    getDocument,
    deleteDocument,
    saveUserPreferences,
  };
}
