import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const useExpressProxy = Boolean(
  process.env.DATABASE_URL || process.env.REPL_ID || process.env.ENABLE_API_PROXY === 'true'
);

function localSandboxApiPlugin(): Plugin {
  return {
    name: 'aistudio-local-api-fallback',
    configureServer(server) {
      server.middlewares.use('/api', (_req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, mode: 'aistudio-local' }));
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(!useExpressProxy ? [localSandboxApiPlugin()] : []),
  ],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 3000,
    allowedHosts: true,
    ...(useExpressProxy
      ? {
          proxy: {
            '/api': {
              target: 'http://localhost:3001',
              changeOrigin: true,
            },
          },
        }
      : {}),
  },
});
