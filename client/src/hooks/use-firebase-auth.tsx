import { useCallback } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuth } from './use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from './use-toast';

export function useFirebaseAuth() {
  const { loginMutation, logoutMutation } = useAuth();
  const { toast } = useToast();

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      // First sign in with Firebase
      const result: UserCredential = await signInWithPopup(auth, googleProvider);
      
      // Get the user info
      const user = result.user;
      const idToken = await user.getIdToken();
      
      // Get Google access token for additional API access if needed
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      
      // Send token to our backend to create or get the user
      const response = await apiRequest('POST', '/api/auth/google', {
        email: user.email,
        name: user.displayName,
        uid: user.uid,
        photoURL: user.photoURL
      }, idToken);
      
      // If successful, manually set the user in our auth context
      const userData = await response.json();
      loginMutation.mutate(userData, {
        onSuccess: () => {
          toast({
            title: 'Signed in successfully',
            description: `Welcome ${userData.name || ''}!`,
          });
        }
      });
      
      return { user: userData };
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      toast({
        title: 'Authentication Failed',
        description: error.message || 'Could not sign in with Google',
        variant: 'destructive',
      });
      throw error;
    }
  }, [loginMutation, toast]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      // Also sign out from our backend
      await logoutMutation.mutateAsync();
      
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out',
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: 'Sign out Failed',
        description: error.message || 'Could not sign out',
        variant: 'destructive',
      });
      throw error;
    }
  }, [logoutMutation, toast]);

  return {
    signInWithGoogle,
    signOut,
  };
}