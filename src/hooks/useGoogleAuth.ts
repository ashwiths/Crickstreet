import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { useState, useEffect } from 'react';

// Complete WebBrowser redirect session handler for Auth Session
WebBrowser.maybeCompleteAuthSession();

// Client IDs from Google Cloud Console
export const WEB_CLIENT_ID = '461731506048-bi2g4kvn0mjue2c2dv3htljek599101n.apps.googleusercontent.com';
export const IOS_CLIENT_ID = undefined;
export const ANDROID_CLIENT_ID = '461731506048-utrameeu9h0b505pmlhempb6pdg87rcf.apps.googleusercontent.com';

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

  // Modern Expo SDK 54 direct deep-linking redirect URI (no proxy)
  const redirectUri = makeRedirectUri({
    scheme: 'crickstreet',
    path: 'oauthredirect',
  });

  console.log("Platform:", Platform.OS);
  console.log("Redirect URI:", redirectUri);
  console.log("Android Client ID:", ANDROID_CLIENT_ID);
  console.log("Web Client ID:", WEB_CLIENT_ID);

  // Initialize the Google Auth Session Request hook
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    redirectUri,
    responseType: 'id_token',
  });

  // Handle OAuth response updates and log details for debugging
  useEffect(() => {
    async function handleGoogleResponse() {
      if (!response) return;

      console.log('[Google Auth] Active Redirect URI:', redirectUri);
      console.log('[Google Auth] OAuth Response:', JSON.stringify(response, null, 2));
      console.log('[Google Auth] OAuth Result Type:', response.type);

      if (response.type === 'success') {
        const params = (response as any).params ?? {};
        const authentication = (response.authentication as any) ?? {};

        console.log('[Google Auth] Token Response:', JSON.stringify(authentication, null, 2));

        const token =
          authentication?.idToken ||
          params?.id_token ||
          params?.idToken;

        if (!token) {
          const errMsg = 'Google Sign-In failed: No ID Token was returned. Verify your redirect URI is registered in Google Console.';
          console.error('[Google Auth]', errMsg);
          setError(errMsg);
          setLoading(false);
          return;
        }

        setIdToken(token);
        setLoading(false);
      } else if (response.type === 'error') {
        const oauthError = (response as any).error;
        const errorDescription = oauthError?.description || oauthError?.message || '';
        console.error('[Google Auth] OAuth Session error details:', oauthError);

        let mappedError = 'Google Sign-In failed. Please try again.';
        if (errorDescription.includes('disallowed_useragent')) {
          mappedError =
            'Access Blocked: Google has blocked this browser/environment. If you are using Expo Go on Android, please verify that you use a Development Build instead.';
        } else if (errorDescription.includes('redirect_uri_mismatch')) {
          mappedError = `Invalid Redirect URI: The URI "${redirectUri}" is not registered in your Google Cloud Console OAuth Client credentials.`;
        } else if (oauthError?.message) {
          mappedError = `Google OAuth Error: ${oauthError.message}`;
        }

        setError(mappedError);
        setLoading(false);
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
        console.log('[Google Auth] Auth session cancelled/dismissed by user. Response:', JSON.stringify(response, null, 2));
        setError('User Cancelled Login: The sign-in flow was dismissed before completion.');
        setLoading(false);
      }
    }

    handleGoogleResponse();
  }, [response, redirectUri]);

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setIdToken(null);

      // Verify request is initialized
      if (!request && Platform.OS !== 'web') {
        console.warn('[Google Auth] Authorization request is not ready yet. Generating direct scheme request...');
      }

      await promptAsync();
    } catch (err: any) {
      console.error('[Google Auth] promptAsync invocation error:', err);
      let friendlyMessage = 'Failed to initialize Google Sign-in flow.';
      if (err?.message?.includes('Network')) {
        friendlyMessage = 'Network Error: Please check your internet connection and try again.';
      } else if (err?.message) {
        friendlyMessage = `Google initialization error: ${err.message}`;
      }
      setError(friendlyMessage);
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
