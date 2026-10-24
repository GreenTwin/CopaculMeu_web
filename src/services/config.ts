export interface AppConfig {
  mode: 'demo' | 'live';
  backendHost: string;
}

const STORAGE_KEY_MODE = 'copaculmeu_mode';
const STORAGE_KEY_HOST = 'copaculmeu_backend_host';

export function getAppConfig(): AppConfig {
  const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
  const savedHost = localStorage.getItem(STORAGE_KEY_HOST);

  return {
    mode: savedMode === 'live' ? 'live' : 'demo',
    backendHost: savedHost || 'http://localhost:8080',
  };
}

export function saveAppConfig(config: AppConfig): void {
  localStorage.setItem(STORAGE_KEY_MODE, config.mode);
  localStorage.setItem(STORAGE_KEY_HOST, config.backendHost.trim().replace(/\/+$/, ''));
}
