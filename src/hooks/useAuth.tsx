import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
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

// Web Client ID from Google Cloud Console
const WEB_CLIENT_ID = '461731506048-bi2g4kvn0mjue2c2dv3htljek599101n.apps.googleusercontent.com';
const IOS_CLIENT_ID = undefined;
const ANDROID_CLIENT_ID = undefined;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isExpoGo =
    Constants?.appOwnership === 'expo' ||
    Constants?.executionEnvironment === 'storeClient' ||
    (Constants?.executionEnvironment as string) === ExecutionEnvironment.StoreClient ||
    (typeof Constants?.linkingUri === 'string' && Constants.linkingUri.startsWith('exp://'));

  const owner = Constants.expoConfig?.owner || 'anonymous';
  const slug = Constants.expoConfig?.slug || 'Crickstreet';
  const proxyUrl = `https://auth.expo.io/@${owner}/${slug}/oauthredirect`;

  // Resolve the redirect URI dynamically based on the execution environment
  const redirectUri = Platform.select({
    web: makeRedirectUri({
      path: 'oauthredirect',
    }),
    default: isExpoGo
      ? proxyUrl
      : makeRedirectUri({
          scheme: 'crickstreet',
          path: 'oauthredirect',
        }),
  }) as string;

  // Log the generated redirect URI in terminal logs for console verification
  useEffect(() => {
    console.log('[Google Auth] Constants appOwnership:', Constants?.appOwnership);
    console.log('[Google Auth] Constants executionEnvironment:', Constants?.executionEnvironment);
    console.log('[Google Auth] Constants linkingUri:', Constants?.linkingUri);
    console.log('[Google Auth] Resolved isExpoGo:', isExpoGo);
    console.log('[Google Auth] Active Redirect URI:', redirectUri);
  }, [redirectUri, isExpoGo]);

  // Initialize the Google Auth Session Request hook
  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
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
