export interface AppConfig {
  backendHost: string;
  locationMode: 'live' | 'manual';
}

// Build-time defaults (set in Vercel / .env).
export const DEFAULT_BACKEND_HOST = (
  import.meta.env.VITE_BACKEND_HOST || 'http://localhost:8080'
).trim().replace(/\/+$/, '');

const STORAGE_KEY_HOST = 'copaculmeu_backend_host';
const STORAGE_KEY_LOCATION_MODE = 'copaculmeu_location_mode';

/**
 * Validates whether a provided string is a safe HTTP or HTTPS URL.
 */
export function isValidBackendUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getAppConfig(): AppConfig {
  let backendHost = DEFAULT_BACKEND_HOST;

  // Security Hardening: Only permit localStorage host overrides in development mode.
  // In production, the backend host is strictly pinned to DEFAULT_BACKEND_HOST to prevent
  // credential interception or redirection attacks.
  if (import.meta.env.DEV) {
    const savedHost = localStorage.getItem(STORAGE_KEY_HOST);
    if (savedHost && isValidBackendUrl(savedHost)) {
      backendHost = savedHost.trim().replace(/\/+$/, '');
    }
  }

  const savedLocationMode = localStorage.getItem(STORAGE_KEY_LOCATION_MODE);

  return {
    backendHost,
    locationMode: savedLocationMode === 'manual' ? 'manual' : 'live',
  };
}

export function saveAppConfig(config: AppConfig): void {
  // Only persist custom backend host in development mode when URL is valid
  if (import.meta.env.DEV && isValidBackendUrl(config.backendHost)) {
    localStorage.setItem(STORAGE_KEY_HOST, config.backendHost.trim().replace(/\/+$/, ''));
  }
  localStorage.setItem(STORAGE_KEY_LOCATION_MODE, config.locationMode || 'live');
}
