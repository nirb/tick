import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const targetApi = env.VITE_API_URL || 'https://tick-api.bejeranos.workers.dev';

  return {
    plugins: [react()],
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
