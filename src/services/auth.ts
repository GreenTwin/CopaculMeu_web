import type { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/auth';
import { getAppConfig } from './config';

export const TOKEN_STORAGE_KEY = 'token';
export const USER_STORAGE_KEY = 'copaculmeu_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setSession(auth: AuthResponse): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, auth.accessToken);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(auth.user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * User login against backend server
 */
export async function loginUser(credentials: LoginRequest): Promise<AuthResponse> {
  const config = getAppConfig();

  const res = await fetch(`${config.backendHost}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Email sau parolă incorectă.');
    }
    const errText = await res.text();
    let msg = 'Eroare la autentificare.';
    try {
      const json = JSON.parse(errText);
      msg = json.message || msg;
    } catch {
      // use default msg
    }
    throw new Error(msg);
  }

  const authData: AuthResponse = await res.json();
  setSession(authData);
  return authData;
}

/**
 * User registration against backend server
 */
export async function registerUser(data: RegisterRequest): Promise<User> {
  const config = getAppConfig();

  const res = await fetch(`${config.backendHost}/api/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = 'Eroare la înregistrare.';
    try {
      const json = JSON.parse(errText);
      msg = json.message || msg;
    } catch {
      if (res.status === 400) {
        msg = 'Adresa de email este deja utilizată sau datele sunt invalide.';
      }
    }
    throw new Error(msg);
  }

  return await res.json();
}

/**
 * Retrieve current authenticated user profile using stored JWT
 */
export async function fetchCurrentUser(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) return null;

  const config = getAppConfig();

  try {
    const res = await fetch(`${config.backendHost}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const user: User = await res.json();
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      return user;
    } else if (res.status === 401) {
      // Token expired or invalid
      clearSession();
      return null;
    }
  } catch (err) {
    console.warn('Could not verify session with backend:', err);
  }

  return getStoredUser();
}

/**
 * Google social sign-in against backend server
 */
export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const config = getAppConfig();
  const res = await fetch(`${config.backendHost}/api/auth/google`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    let message = 'Social sign-in failed';
    try {
      const json = await res.json();
      if (typeof json.message === 'string' && json.message) {
        message = json.message;
      }
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }

  const authData: AuthResponse = await res.json();
  setSession(authData);
  return authData;
}

export async function issueSocialNonce(): Promise<string> {
  const config = getAppConfig();
  const res = await fetch(`${config.backendHost}/api/auth/social/nonce`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Social sign-in failed');
  }
  const body = (await res.json()) as { nonce?: string };
  if (!body.nonce) {
    throw new Error('Social sign-in failed');
  }
  return body.nonce;
}

let googleScript: Promise<void> | null = null;

export function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (!googleScript) {
    googleScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        googleScript = null;
        reject(new Error('Social sign-in failed'));
      };
      document.head.appendChild(script);
    });
  }
  return googleScript;
}

export async function logoutUser(): Promise<void> {
  const token = getStoredToken();
  const config = getAppConfig();

  if (token) {
    try {
      await fetch(`${config.backendHost}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore network errors on logout
    }
  }

  clearSession();
}

/**
 * Confirm user email with 6-digit activation code via backend server
 * POST /api/users/activate (with fallback to /api/auth/activate)
 */
export async function confirmEmailCode(email: string, code: string): Promise<void> {
  const config = getAppConfig();

  let res = await fetch(`${config.backendHost}/api/users/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
  });

  if (!res.ok && res.status === 404) {
    res = await fetch(`${config.backendHost}/api/auth/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), code: code.trim() }),
    });
  }

  if (!res.ok) {
    let msg = 'Cod de activare invalid sau expirat.';
    try {
      const json = await res.json();
      msg = json.message || json.error || msg;
    } catch {
      // keep default
    }
    throw new Error(msg);
  }
}

/**
 * Resend activation code to user's email via backend server
 */
export async function resendActivationCode(email: string): Promise<void> {
  const config = getAppConfig();

  let res = await fetch(`${config.backendHost}/api/users/resend-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!res.ok && (res.status === 404 || res.status === 405)) {
    res = await fetch(`${config.backendHost}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
  }

  if (!res.ok) {
    let msg = 'Nu s-a putut retrimite codul de verificare.';
    try {
      const json = await res.json();
      msg = json.message || json.error || msg;
    } catch {
      // keep default
    }
    throw new Error(msg);
  }
}
