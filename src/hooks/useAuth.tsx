import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { auth, db } from '../services/firebase';

// Complete WebBrowser redirect session handler for Auth Session
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// PLACEHOLDERS: Replace these with your actual Client IDs from Firebase Console / Google Cloud Console.
const WEB_CLIENT_ID = '461731506048-bi2g4kvn0mjue2c2dv3htljek599101n.apps.googleusercontent.com';
const IOS_CLIENT_ID = 'YOUR_GOOGLE_IOS_CLIENT_ID';
const ANDROID_CLIENT_ID = 'YOUR_GOOGLE_ANDROID_CLIENT_ID';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Generate the redirect URI explicitly for reliable routing matching
  const redirectUri = makeRedirectUri({
    scheme: 'crickstreet',
    path: 'oauthredirect',
  });

  // Log the generated redirect URI in terminal logs
  useEffect(() => {
    console.log('[Google Auth] Active Redirect URI:', redirectUri);
  }, [redirectUri]);

  // Filter out placeholder Client IDs so they don't break Google's OAuth endpoints
  const cleanIosClientId =
    IOS_CLIENT_ID && IOS_CLIENT_ID !== 'YOUR_GOOGLE_IOS_CLIENT_ID'
      ? IOS_CLIENT_ID
      : undefined;
  const cleanAndroidClientId =
    ANDROID_CLIENT_ID && ANDROID_CLIENT_ID !== 'YOUR_GOOGLE_ANDROID_CLIENT_ID'
      ? ANDROID_CLIENT_ID
      : undefined;

  // Initialize the Google Auth Session Request hook
  // responseType: 'id_token' forces Google to return the id_token directly in the
  // redirect params rather than requiring a token-exchange step.
  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    iosClientId: cleanIosClientId,
    androidClientId: cleanAndroidClientId,
    redirectUri,
    responseType: 'id_token',
  });

  // 1. Listen to Google Auth Response changes
  useEffect(() => {
    async function handleGoogleResponse() {
      if (!response) return;

      // ── Debug logs ─────────────────────────────────────────────
      console.log('[Google Auth] response.type       :', response.type);
      console.log(
        '[Google Auth] response.authentication:',
        JSON.stringify(
          (response as any).authentication ?? null,
        ),
      );
      console.log(
        '[Google Auth] response.params       :',
        JSON.stringify((response as any).params ?? null),
      );
      // ────────────────────────────────────────────────────────────

      if (response.type === 'success') {
        // Expo SDK 54 returns the id_token in snake_case inside response.params.
        // response.authentication?.idToken is populated only in native builds that
        // go through a token-exchange; in Expo Go it is usually null.
        const params = (response as any).params ?? {};
        const authentication = (response as any).authentication ?? {};

        const idToken: string | undefined =
          authentication?.idToken ||       // native builds (token exchange complete)
          params?.id_token ||              // Expo Go / web redirect (snake_case key)
          params?.idToken;                 // fallback camelCase (older SDK versions)

        console.log('[Google Auth] idToken resolved   :', idToken ? `${idToken.substring(0, 20)}...` : 'UNDEFINED');

        if (!idToken) {
          setError('Google Sign-In failed: No ID Token received.');
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError(null);

          // Authenticate with Firebase Auth using Google credentials
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
        } catch (err: any) {
          console.error('[Google Auth] Firebase signInWithCredential error:', err);
          setError(err.message || 'Firebase authentication failed.');
          setLoading(false);
        }
      } else if (response.type === 'error') {
        console.error('[Google Auth] Auth Session error:', (response as any).error);
        setError(
          (response as any).error?.message ||
            'Google Sign-In failed. Please try again.',
        );
        setLoading(false);
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
        console.log('[Google Auth] Auth Session cancelled/dismissed.');
        setLoading(false);
      }
    }

    handleGoogleResponse();
  }, [response]);

  // 2. Synchronize Firebase Auth State with Firestore User Record
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setLoading(true);
          setError(null);

          // Reference to the user's Firestore document
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            // Document does not exist: create the user profile
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              createdAt: serverTimestamp(),
            });
          }

          setUser(firebaseUser);
        } else {
          setUser(null);
        }
      } catch (err: any) {
        setError(err.message || 'Firestore database synchronization failed.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await promptAsync();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google Sign-in flow.');
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut(auth);
    } catch (err: any) {
      setError(err.message || 'Logout failed.');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInWithGoogle,
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
