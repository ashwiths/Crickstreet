import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  FirebaseUser,
  signInWithGoogleToken,
  syncUserProfile,
  logoutUser,
  subscribeToAuthState,
  signInWithEmail as apiSignInWithEmail,
  signUpWithEmail as apiSignUpWithEmail,
} from '../services/authService';
import { useGoogleAuth } from './useGoogleAuth';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Hook for Google OAuth flow
  const {
    idToken,
    loading: googleLoading,
    error: googleError,
    signIn: triggerGoogleSignIn,
    clearError: clearGoogleError,
  } = useGoogleAuth();

  // 1. Authenticate with Firebase once the Google OAuth token is retrieved successfully
  useEffect(() => {
    async function exchangeToken() {
      if (!idToken) return;

      try {
        setLoading(true);
        setError(null);
        await signInWithGoogleToken(idToken);
      } catch (err: any) {
        setError(err.message || 'Firebase authentication failed.');
        setLoading(false);
      }
    }

    exchangeToken();
  }, [idToken]);

  // 2. Map Google Auth Session error states to the main Auth Context error
  useEffect(() => {
    if (googleError) {
      setError(googleError);
    }
  }, [googleError]);

  // 3. Listen to Firebase auth changes and sync user records
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setLoading(true);
          setError(null);
          setUser(firebaseUser);
          // Sync user info (UID, displayName, email, photoURL) to Firestore in background
          try {
            await syncUserProfile(firebaseUser);
          } catch (syncErr: any) {
            console.warn('[Auth] Non-fatal user profile sync error:', syncErr.message);
          }
        } else {
          setUser(null);
        }
      } catch (err: any) {
        setError(err.message || 'Authentication failed.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      await triggerGoogleSignIn();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google Sign-in.');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      await apiSignInWithEmail(email, password);
    } catch (err: any) {
      setError(err.message || 'Email Sign-in failed.');
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      setLoading(true);
      setError(null);
      await apiSignUpWithEmail(email, password, displayName);
    } catch (err: any) {
      setError(err.message || 'Email Sign-up failed.');
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await logoutUser();
    } catch (err: any) {
      setError(err.message || 'Logout failed.');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
    clearGoogleError();
  };

  // The application is considered loading if either Firebase state subscription or Google oauth is active
  const isCombinedLoading = loading || googleLoading;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: isCombinedLoading,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
