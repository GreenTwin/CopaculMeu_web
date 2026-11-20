/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. https://your-app.up.railway.app (no trailing slash needed) */
  readonly VITE_BACKEND_HOST?: string;
  /** 'live' (default) or 'demo' */
  readonly VITE_DEFAULT_MODE?: 'live' | 'demo';
  /** Public Google web client id */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
          nonce: string;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
          use_fedcm_for_prompt?: boolean;
        }) => void;
        renderButton: (
          parent: HTMLElement,
          options: {
            type?: string;
            theme?: string;
            size?: string;
            text?: string;
            shape?: string;
            width?: number;
            logo_alignment?: string;
          }
        ) => void;
        cancel: () => void;
      };
    };
  };
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}
