import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export { FirebaseUser };

/**
 * Exchanges a Google ID Token for Firebase User Credentials and signs in.
 */
export async function signInWithGoogleToken(idToken: string): Promise<FirebaseUser> {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(mapFirebaseError(error));
  }
}

/**
 * Ensures the authenticated user's profile is synchronized in Firestore.
 */
export async function syncUserProfile(user: FirebaseUser): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
      });
    }
  } catch (error: any) {
    console.error('[authService] Firestore sync error:', error);
    throw new Error(error.message || 'Failed to sync user profile with database.');
  }
}

/**
 * Signs the current user out of Firebase.
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(mapFirebaseError(error));
  }
}

/**
 * Registers a callback for Firebase Auth state changes.
 */
export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Maps Firebase Auth errors to user-friendly messages.
 */
export function mapFirebaseError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
      return 'Authentication failed: Invalid credentials provided.';
    case 'auth/user-disabled':
      return 'Authentication failed: This account has been disabled.';
    case 'auth/operation-not-allowed':
      return 'Authentication failed: Google sign-in is not enabled in the Firebase console.';
    case 'auth/network-request-failed':
      return 'Network Error: Please check your internet connection and try again.';
    default:
      return error?.message || 'Firebase authentication failed. Please try again.';
  }
}
