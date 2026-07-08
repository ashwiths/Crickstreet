import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { useState, useEffect } from 'react';

// Complete WebBrowser redirect session handler for Auth Session
WebBrowser.maybeCompleteAuthSession();

// Client IDs from Google Cloud Console
export const WEB_CLIENT_ID = '461731506048-bi2g4kvn0mjue2c2dv3htljek599101n.apps.googleusercontent.com';
export const IOS_CLIENT_ID = undefined;
export const ANDROID_CLIENT_ID = undefined; // Set this if you generate an Android OAuth client in Google Console for Dev Builds

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

  // Detect Expo Go environment
  const isExpoGo =
    Constants?.appOwnership === 'expo' ||
    Constants?.executionEnvironment === 'storeClient' ||
    (Constants?.executionEnvironment as string) === ExecutionEnvironment.StoreClient ||
    (typeof Constants?.linkingUri === 'string' && Constants.linkingUri.startsWith('exp://'));

  const owner = Constants.expoConfig?.owner || 'ashwiths'; // Default to 'ashwiths' based on workspace
  const slug = Constants.expoConfig?.slug || 'Crickstreet';
  const proxyUrl = `https://auth.expo.io/@${owner}/${slug}/oauthredirect`;

  // Dynamically generate redirect URI depending on platform and Expo Go execution environment
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

  // Log active configurations for transparency
  useEffect(() => {
    console.log('[Google Auth] Active Redirect URI:', redirectUri);
    console.log('[Google Auth] resolved isExpoGo:', isExpoGo);
  }, [redirectUri, isExpoGo]);

  // Initialize the Google Auth Session Request hook
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    redirectUri,
    responseType: 'id_token',
  });

  // Handle OAuth response updates
  useEffect(() => {
    async function handleGoogleResponse() {
      if (!response) return;

      console.log('[Google Auth] OAuth Response Type:', response.type);

      if (response.type === 'success') {
        const params = (response as any).params ?? {};
        const authentication = (response as any).authentication ?? {};

        const token =
          authentication?.idToken ||
          params?.id_token ||
          params?.idToken;

        if (!token) {
          setError(
            'Google Sign-In failed: No ID Token was returned. Please verify your redirect URI is registered in Google Cloud Console.'
          );
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
        console.log('[Google Auth] Auth session cancelled/dismissed by user.');
        setError('User Cancelled Login: The sign-in flow was dismissed before completion.');
        setLoading(false);
      }
    }

    handleGoogleResponse();
  }, [response]);

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setIdToken(null);

      // Verify request is initialized
      if (!request && Platform.OS !== 'web') {
        console.warn('[Google Auth] Authorization request is not ready yet.');
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
