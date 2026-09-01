import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// FRONTEND_PORT / BACKEND_PORT let both halves of the stack move off their
// defaults (53000 / 59190) via plain env vars — e.g. because something else
// on the host already owns one of them. Defaults are the IANA dynamic/private
// range so they don't collide with common dev-tool ports in the first place.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const FRONTEND_PORT = Number(env.FRONTEND_PORT) || 53000
  const BACKEND_PORT = env.BACKEND_PORT || '59190'
  const backendUrl = env.VITE_BACKEND_URL || `http://localhost:${BACKEND_PORT}`

  return {
    plugins: [react()],
    define: {
      // Lets client-side code (error banners) report the *actual* configured
      // backend port instead of a hardcoded default.
      'import.meta.env.VITE_BACKEND_PORT': JSON.stringify(BACKEND_PORT),
    },
    server: {
      host: '0.0.0.0',
      port: FRONTEND_PORT,
      proxy: {
        // Swagger UI and the OpenAPI spec are served by the backend, so they need
        // proxying too — otherwise the in-app Swagger link 404s on the dev origin.
        ...Object.fromEntries(
          ['/api', '/swagger-ui', '/swagger-ui.html', '/v3/api-docs'].map((route) => [
            route,
            {
              target: backendUrl,
              changeOrigin: true,
            },
          ]),
        ),
      },
    },
  }
})
