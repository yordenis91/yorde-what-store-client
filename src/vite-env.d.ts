/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Runtime configuration injected by public/config.js before the bundle loads. */
interface Window {
  __APP_CONFIG__?: {
    apiUrl?: string
  }
}
