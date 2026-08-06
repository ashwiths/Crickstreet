import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useState } from 'react';
import { Platform } from 'react-native';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebase';

// Client IDs from Google Cloud Console
export const WEB_CLIENT_ID = '461731506048-bi2g4kvn0mjue2c2dv3htljek599101n.apps.googleusercontent.com';
export const ANDROID_CLIENT_ID = '461731506048-utrameeu9h0b505pmlhempb6pdg87rcf.apps.googleusercontent.com';
export const IOS_CLIENT_ID = undefined;

// Configure the native Google Sign-in provider
GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: false,
});

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

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setIdToken(null);

      if (Platform.OS === 'web') {
        console.log('[Google Auth] Web environment detected. Using Firebase signInWithPopup...');
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
        setLoading(false);
        return;
      }

      console.log('[Google Auth] Starting native Google Sign-In...');
      
      // Ensure Google Play Services are available
      console.log('[Google Auth] Checking if Google Play Services are available...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Clear any previous Google Sign-In session to force the account selector sheet to display every time
      try {
        console.log('[Google Auth] Clearing previous Google session to force account picker...');
        await GoogleSignin.signOut();
      } catch (signOutError) {
        console.log('[Google Auth] No active Google session found or signOut failed, proceeding...');
      }
      
      // Perform native sign-in
      console.log('[Google Auth] Launching native account selector...');
      const response = await GoogleSignin.signIn();
      
      console.log('[Google Auth] Native OAuth Result:', JSON.stringify(response, null, 2));

      // Extract ID Token (supports both newer v11+ response.data and legacy response shapes)
      const token = response.data?.idToken || (response as any).idToken;

      console.log('[Google Auth] Resolved Token:', token ? `${token.substring(0, 20)}...` : 'UNDEFINED');

      if (!token) {
        throw new Error('No ID Token returned from the native Google Sign-In SDK.');
      }

      setIdToken(token);
      setLoading(false);
    } catch (err: any) {
      console.error('[Google Auth] Native Sign-In Error Details:', err);
      let friendlyError = 'Google Sign-In failed. Please try again.';

      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        friendlyError = 'User Cancelled Login: The sign-in flow was dismissed before completion.';
        console.log('[Google Auth] User cancelled login.');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        friendlyError = 'Google Sign-In is already in progress.';
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
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
