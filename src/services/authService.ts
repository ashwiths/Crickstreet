import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export { FirebaseUser };

/**
 * Signs in a user using Email and Password.
 */
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    console.log('[Email Auth] Initiating Firebase email sign-in for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('[Email Auth] Sign-in successful for UID:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(mapFirebaseError(error));
  }
}

/**
 * Creates a new user using Email, Password, and Display Name.
 */
export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<FirebaseUser> {
  try {
    console.log('[Email Auth] Initiating Firebase user creation for:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('[Email Auth] User created. Updating profile display name:', displayName);
    await updateProfile(user, { displayName });

    console.log('[Email Auth] Profile updated. Syncing to Firestore...');
    await syncUserProfile(user);

    return user;
  } catch (error: any) {
    throw new Error(mapFirebaseError(error));
  }
}

/**
 * Exchanges a Google ID Token for Firebase User Credentials and signs in.
 */
export async function signInWithGoogleToken(idToken: string): Promise<FirebaseUser> {
  try {
    console.log('[Google Auth] Initiating Firebase Token Exchange with Google ID Token:', idToken ? `${idToken.substring(0, 20)}...` : 'UNDEFINED');
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    console.log('[Google Auth] Firebase Response (User successfully signed in):', JSON.stringify({
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      photoURL: userCredential.user.photoURL,
    }, null, 2));
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
    console.log('[Google Auth] Syncing user profile with Firestore database for UID:', user.uid);
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log('[Google Auth] Creating new user document in Firestore...');
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
      });
      console.log('[Google Auth] Firestore User document successfully created.');
    } else {
      console.log('[Google Auth] Firestore User document already exists. No creation required.');
    }
  } catch (error: any) {
    console.error('[Google Auth] Firestore sync error details:', error);
    throw new Error(error.message || 'Failed to sync user profile with database.');
  }
}

/**
 * Signs the current user out of Firebase.
 */
export async function logoutUser(): Promise<void> {
  try {
    console.log('[Google Auth] Logging out user from Firebase...');
    await signOut(auth);
    console.log('[Google Auth] User logged out successfully.');
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
  console.error('[Google Auth] Firebase error occurred. Code:', code, 'Message:', error.message);
  switch (code) {
    case 'auth/invalid-email':
      return 'Authentication failed: The email address is invalid.';
    case 'auth/user-disabled':
      return 'Authentication failed: This account has been disabled.';
    case 'auth/user-not-found':
      return 'Authentication failed: No user exists with this email address.';
    case 'auth/wrong-password':
      return 'Authentication failed: Incorrect password.';
    case 'auth/email-already-in-use':
      return 'Authentication failed: This email address is already registered.';
    case 'auth/weak-password':
      return 'Authentication failed: The password is too weak. Must be at least 6 characters.';
    case 'auth/invalid-credential':
      return 'Authentication failed: Invalid credentials provided.';
    case 'auth/operation-not-allowed':
      return 'Authentication failed: The requested authentication method is not enabled in Firebase.';
    case 'auth/network-request-failed':
      return 'Network Error: Please check your internet connection and try again.';
    default:
      return error?.message || 'Firebase authentication failed. Please try again.';
  }
}
