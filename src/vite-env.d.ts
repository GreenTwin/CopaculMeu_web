/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. https://your-app.up.railway.app (no trailing slash needed) */
  readonly VITE_BACKEND_HOST?: string;
  /** 'live' (default) or 'demo' */
  readonly VITE_DEFAULT_MODE?: 'live' | 'demo';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}
