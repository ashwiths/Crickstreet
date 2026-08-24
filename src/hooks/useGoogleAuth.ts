import { useState, useEffect } from 'react';
import { Platform, TurboModuleRegistry, NativeModules } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebase';

WebBrowser.maybeCompleteAuthSession();

// Client IDs from Google Cloud Console
export const WEB_CLIENT_ID = '461731506048-bi2g4kvn0mjue2c2dv3htljek599101n.apps.googleusercontent.com';
export const ANDROID_CLIENT_ID = '461731506048-utrameeu9h0b505pmlhempb6pdg87rcf.apps.googleusercontent.com';
export const IOS_CLIENT_ID = undefined;

let GoogleSigninInstance: any = null;
let statusCodesInstance: any = null;
let isConfigured = false;

function getGoogleSigninModule() {
  if (GoogleSigninInstance) {
    return { GoogleSignin: GoogleSigninInstance, statusCodes: statusCodesInstance };
  }

  if (Platform.OS === 'web') {
    return { GoogleSignin: null, statusCodes: null };
  }

  try {
    const hasNativeModule =
      (TurboModuleRegistry?.get && TurboModuleRegistry.get('RNGoogleSignin')) ||
      NativeModules?.RNGoogleSignin;

    if (hasNativeModule) {
      const googleSigninModule = require('@react-native-google-signin/google-signin');
      GoogleSigninInstance = googleSigninModule.GoogleSignin;
      statusCodesInstance = googleSigninModule.statusCodes;

      if (GoogleSigninInstance && !isConfigured) {
        GoogleSigninInstance.configure({
          webClientId: WEB_CLIENT_ID,
          offlineAccess: false,
        });
        isConfigured = true;
      }
      return { GoogleSignin: GoogleSigninInstance, statusCodes: statusCodesInstance };
    }
  } catch (err) {
    console.warn('[Google Auth] Failed to load @react-native-google-signin/google-signin:', err);
  }

  return { GoogleSignin: null, statusCodes: null };
}

export interface GoogleAuthResult {
  idToken: string | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  clearError: () => void;
}

export function useGoogleAuth(): GoogleAuthResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  // Expo Auth Session hook for Expo Go / Web / Fallback
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.params?.id_token || (response as any).authentication?.idToken;
      if (token) {
        console.log('[Google Auth] Received ID Token from Expo AuthSession');
        setIdToken(token);
      }
      setLoading(false);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setLoading(false);
    } else if (response?.type === 'error') {
      console.error('[Google Auth] AuthSession Error:', response.error);
      setError(response.error?.message || 'Google Sign-In failed.');
      setLoading(false);
    }
  }, [response]);

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setIdToken(null);

      // 1. Web Environment: Use Firebase signInWithPopup
      if (Platform.OS === 'web') {
        console.log('[Google Auth] Web environment detected. Using Firebase signInWithPopup...');
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
        setLoading(false);
        return;
      }

      const { GoogleSignin, statusCodes } = getGoogleSigninModule();

      // 2. Native Binary with RNGoogleSignin registered (Development Client / Standalone Build)
      if (GoogleSignin) {
        console.log('[Google Auth] Starting native Google Sign-In SDK...');
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

        try {
          await GoogleSignin.signOut();
        } catch {
          // Ignore if no prior session
        }

        const res = await GoogleSignin.signIn();
        const token = res.data?.idToken || (res as any).idToken;

        if (!token) {
          throw new Error('No ID Token returned from the native Google Sign-In SDK.');
        }

        setIdToken(token);
        setLoading(false);
        return;
      }

      // 3. Expo Go fallback: Use Expo AuthSession browser OAuth
      console.log('[Google Auth] Native module not in binary (Expo Go). Using Expo AuthSession...');
      const authResult = await promptAsync();

      if (authResult?.type === 'success') {
        const token = authResult.params?.id_token || (authResult as any).authentication?.idToken;
        if (token) {
          setIdToken(token);
        }
      } else if (authResult?.type === 'cancel' || authResult?.type === 'dismiss') {
        console.log('[Google Auth] User cancelled browser login.');
      } else if (authResult?.type === 'error') {
        throw new Error(authResult.error?.message || 'Google Sign-In failed.');
      }
      setLoading(false);
    } catch (err: any) {
      console.error('[Google Auth] Sign-In Error Details:', err);
      const { statusCodes } = getGoogleSigninModule();
      let friendlyError = 'Google Sign-In failed. Please try again.';

      if (statusCodes && err.code === statusCodes.SIGN_IN_CANCELLED) {
        friendlyError = 'User Cancelled Login: The sign-in flow was dismissed before completion.';
        console.log('[Google Auth] User cancelled login.');
      } else if (statusCodes && err.code === statusCodes.IN_PROGRESS) {
        friendlyError = 'Google Sign-In is already in progress.';
      } else if (statusCodes && err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        friendlyError = 'Network Error: Google Play Services are not available or outdated on this device.';
      } else if (err.message) {
        friendlyError = `Google OAuth Error: ${err.message}`;
      } else {
        friendlyError = `Google OAuth Error code: ${err.code || 'unknown'}`;
      }

      setError(friendlyError);
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    idToken,
    loading,
    error,
    signIn,
    clearError,
  };
}

