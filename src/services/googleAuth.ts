import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  Auth
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton safely
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

// Configure Google Auth Provider with requested scopes
export const createGoogleProvider = (forceConsent = true) => {
  const p = new GoogleAuthProvider();
  p.addScope('https://www.googleapis.com/auth/gmail.send');
  p.addScope('https://www.googleapis.com/auth/userinfo.email');
  p.setCustomParameters({
    prompt: forceConsent ? 'consent select_account' : 'select_account',
    access_type: 'offline'
  });
  return p;
};

// Session storage keys for OAuth access token persistence across page reloads
const SESSION_TOKEN_KEY = 'fabcore_google_access_token';
const SESSION_EXPIRY_KEY = 'fabcore_google_token_expiry';

const getStoredToken = (): string | null => {
  try {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const expiryStr = sessionStorage.getItem(SESSION_EXPIRY_KEY);
    if (token && expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      // Valid if more than 60 seconds remain before expiration
      if (Date.now() < expiry - 60000) {
        return token;
      }
      clearStoredToken();
    }
  } catch (e) {
    console.warn('Storage read failed', e);
  }
  return null;
};

const setStoredToken = (token: string, expiresInSeconds = 3500) => {
  try {
    const expiry = Date.now() + expiresInSeconds * 1000;
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    sessionStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
  } catch (e) {
    console.warn('Storage write failed', e);
  }
};

const clearStoredToken = () => {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_EXPIRY_KEY);
  } catch (e) {
    // Ignore storage clear error
  }
};

// Cached token initialized from active session if valid
let cachedAccessToken: string | null = getStoredToken();
let isSigningIn = false;

/**
 * Checks if the given access token has the necessary Gmail scopes.
 */
export const verifyTokenScopes = async (
  token: string
): Promise<{ hasGmailScope: boolean; scopes: string[]; email?: string }> => {
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
    if (!res.ok) {
      return { hasGmailScope: true, scopes: [] };
    }
    const data = await res.json();
    const scopes: string[] = (data.scope || '').split(' ').filter(Boolean);
    const hasGmailScope = scopes.some(
      s =>
        s === 'https://www.googleapis.com/auth/gmail.send' ||
        s === 'https://mail.google.com/' ||
        s.includes('gmail.send')
    );
    return { hasGmailScope, scopes, email: data.email };
  } catch (err) {
    console.warn('Unable to verify tokeninfo:', err);
    return { hasGmailScope: true, scopes: [] };
  }
};

/**
 * Initialize auth state listener. Call on application or component mount.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || getStoredToken();
      if (token) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      clearStoredToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign-In with popup. Must be called from user interaction (button click).
 */
export const googleSignIn = async (forceConsent = true): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const provider = createGoogleProvider(forceConsent);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google authentication succeeded but no access token was returned.');
    }

    cachedAccessToken = credential.accessToken;
    // Persist to session storage so refresh does not force re-login (Google tokens are valid for 1 hour)
    setStoredToken(cachedAccessToken, 3500);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve the current in-memory access token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || getStoredToken();
};

/**
 * Sign out and clear in-memory token.
 */
export const logoutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  clearStoredToken();
};
