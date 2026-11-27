import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let cachedAccessToken: string | null = null;

onAuthStateChanged(auth, (firebaseUser) => {
  if (!firebaseUser) {
    cachedAccessToken = null;
  }
});

export interface GoogleSignInPayload {
  email: string;
  username: string;
  avatarUrl: string | null;
  idToken: string;
  accessToken: string | null;
}

export async function signInWithGooglePopup(): Promise<GoogleSignInPayload> {
  const provider = new GoogleAuthProvider();
  for (const scope of SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  cachedAccessToken = credential?.accessToken ?? null;

  const fbUser: FirebaseUser = result.user;
  const email = fbUser.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('Google account did not provide an email address.');
  }

  const idToken = await fbUser.getIdToken();
  const username = fbUser.displayName?.trim() || email.split('@')[0] || 'Crafter';

  return {
    email,
    username: username.slice(0, 50),
    avatarUrl: fbUser.photoURL ?? null,
    idToken,
    accessToken: cachedAccessToken,
  };
}

export function getCachedGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

export async function signOutGoogle(): Promise<void> {
  cachedAccessToken = null;
  try {
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch {
    // Ignore signOut errors when not signed in via Firebase
  }
}
