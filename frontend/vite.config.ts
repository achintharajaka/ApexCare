import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative assets work on GitHub Pages repository subpaths
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // Gracefully handle backend restart or transient SSE disconnects
            const code = (err as any).code;
            if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EPIPE') {
              if (res && !res.headersSent && typeof (res as any).writeHead === 'function') {
                (res as any).writeHead(503, { 'Content-Type': 'application/json' });
                (res as any).end(JSON.stringify({ error: 'Backend server temporarily unavailable', code }));
              }
              return;
            }
            console.error('[vite proxy error]:', err);
          });
        },
      },
    },
  },
});
