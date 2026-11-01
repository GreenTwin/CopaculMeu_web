export interface AppConfig {
  mode: 'demo' | 'live';
  backendHost: string;
  locationMode: 'live' | 'manual';
}

// Build-time defaults (set in Vercel / .env). Values saved in Settings (localStorage) take precedence.
export const DEFAULT_BACKEND_HOST = (
  import.meta.env.VITE_BACKEND_HOST || 'http://localhost:8080'
).trim().replace(/\/+$/, '');

const DEFAULT_MODE: AppConfig['mode'] =
  import.meta.env.VITE_DEFAULT_MODE === 'demo' ? 'demo' : 'live';

const STORAGE_KEY_MODE = 'copaculmeu_mode';
const STORAGE_KEY_HOST = 'copaculmeu_backend_host';
const STORAGE_KEY_LOCATION_MODE = 'copaculmeu_location_mode';

export function getAppConfig(): AppConfig {
  const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
  const savedHost = localStorage.getItem(STORAGE_KEY_HOST);
  const savedLocationMode = localStorage.getItem(STORAGE_KEY_LOCATION_MODE);

  return {
    mode: savedMode === 'live' || savedMode === 'demo' ? savedMode : DEFAULT_MODE,
    backendHost: savedHost || DEFAULT_BACKEND_HOST,
    locationMode: savedLocationMode === 'manual' ? 'manual' : 'live',
  };
}

export function saveAppConfig(config: AppConfig): void {
  localStorage.setItem(STORAGE_KEY_MODE, config.mode);
  localStorage.setItem(STORAGE_KEY_HOST, config.backendHost.trim().replace(/\/+$/, ''));
  localStorage.setItem(STORAGE_KEY_LOCATION_MODE, config.locationMode || 'live');
}
