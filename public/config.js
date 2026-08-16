// Runtime configuration. In a container this file is rewritten on startup by
// docker-entrypoint.sh with the values of the service's environment variables,
// so one image can be promoted across environments without a rebuild.
//
// The `__PLACEHOLDER__` values below are what ships in the repo: `resolveApiUrl`
// in src/services/api-client.ts ignores any value still wrapped in double
// underscores and falls back to Vite's build-time env, which is what you want
// during local `npm run dev`.
window.__APP_CONFIG__ = {
  apiUrl: '__VITE_API_URL__',
}
