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
 * User login against backend or demo fallback
 */
export async function loginUser(credentials: LoginRequest): Promise<AuthResponse> {
  const config = getAppConfig();

  if (config.mode === 'live') {
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

  // --- DEMO MODE AUTHENTICATION ---
  await new Promise((resolve) => setTimeout(resolve, 350)); // simulate network delay

  if (!credentials.email || !credentials.password) {
    throw new Error('Te rugăm să completezi emailul și parola.');
  }

  const demoUser: User = {
    id: 'demo-usr-' + Date.now(),
    email: credentials.email,
    name: credentials.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Voluntar Demo',
    role: credentials.email.includes('admin') ? 'ADMIN' : 'USER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const demoAuth: AuthResponse = {
    accessToken: 'demo-jwt-token-' + Date.now(),
    tokenType: 'Bearer',
    expiresIn: 86400,
    user: demoUser,
  };

  setSession(demoAuth);
  return demoAuth;
}

/**
 * User registration against backend or demo fallback
 */
export async function registerUser(data: RegisterRequest): Promise<User> {
  const config = getAppConfig();

  if (config.mode === 'live') {
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

  // --- DEMO MODE REGISTRATION ---
  await new Promise((resolve) => setTimeout(resolve, 400));

  if (!data.email || !data.password || !data.name) {
    throw new Error('Te rugăm să completezi toate câmpurile obligatorii.');
  }

  if (data.password.length < 8) {
    throw new Error('Parola trebuie să aibă minim 8 caractere.');
  }

  return {
    id: 'demo-reg-' + Date.now(),
    email: data.email,
    name: data.name,
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieve current authenticated user profile using stored JWT
 */
export async function fetchCurrentUser(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) return null;

  const config = getAppConfig();

  if (config.mode === 'live') {
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
  }

  return getStoredUser();
}

/**
 * User logout
 */
export async function logoutUser(): Promise<void> {
  const token = getStoredToken();
  const config = getAppConfig();

  if (config.mode === 'live' && token) {
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
 * Confirm user email with 6-digit activation code
 */
export async function confirmEmailCode(email: string, code: string): Promise<void> {
  const config = getAppConfig();

  if (config.mode === 'live') {
    try {
      const res = await fetch(`${config.backendHost}/api/users/confirm-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) return;
    } catch {
      // Graceful fallback
    }
  }

  // Simulate network verification
  await new Promise((resolve) => setTimeout(resolve, 450));

  if (!code || code.trim().length !== 6) {
    throw new Error('Codul de activare trebuie să aibă exact 6 cifre.');
  }
}

/**
 * Resend activation code to user's email
 */
export async function resendActivationCode(email: string): Promise<void> {
  const config = getAppConfig();

  if (config.mode === 'live') {
    try {
      await fetch(`${config.backendHost}/api/users/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return;
    } catch {
      // Graceful fallback
    }
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 400));
}
