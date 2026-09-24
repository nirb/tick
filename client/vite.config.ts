import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const buildId = Date.now().toString();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const targetApi = env.VITE_API_URL || 'https://tick-api.bejeranos.workers.dev';

  return {
    define: {
      'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId),
    },
    plugins: [
      react(),
      {
        name: 'generate-version-json',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'version.json',
            source: JSON.stringify(
              {
                version: buildId,
                buildTime: new Date().toISOString(),
              },
              null,
              2
            ),
          });
        },
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const pathname = req.url ? req.url.split('?')[0] : '';
            if (pathname === '/version.json') {
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
              res.end(
                JSON.stringify({
                  version: buildId,
                  buildTime: new Date().toISOString(),
                })
              );
              return;
            }
            next();
          });
        },
      },
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: targetApi,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
