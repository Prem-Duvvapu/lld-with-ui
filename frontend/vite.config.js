import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // Swagger UI and the OpenAPI spec are served by the backend, so they need
      // proxying too — otherwise the in-app Swagger link 404s on the dev origin.
      ...Object.fromEntries(
        ['/api', '/swagger-ui', '/swagger-ui.html', '/v3/api-docs'].map((route) => [
          route,
          {
            target: process.env.VITE_BACKEND_URL || 'http://localhost:9090',
            changeOrigin: true,
          },
        ]),
      ),
    },
  },
})

