// Vite settings shared by `pnpm control` (vite.config.ts) and the browser tests, which run the
// same build against a server on a temporary release file.
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'vite';

/**
 * Strict CSP for the built UI: only its own scripts and styles, API calls to its own origin
 * (the /api proxy), no framing. The dev server (HMR) cannot run under it, so it is preview-only.
 */
export const UI_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export function uiConfig({ uiPort, apiPort, outDir }: { uiPort: number; apiPort: number; outDir?: string }): UserConfig {
  const network = {
    host: '127.0.0.1',
    port: uiPort,
    strictPort: true, // never silently move to another port: the API trusts exactly this origin
    // Vite's default CORS reflects any localhost origin, on /api too. The API must never send CORS headers.
    cors: false,
    // changeOrigin stays false: the API sees Host 127.0.0.1:<uiPort> and the page's own Origin.
    proxy: { '/api': { target: `http://127.0.0.1:${apiPort}` } },
  };
  return {
    root: fileURLToPath(new URL('.', import.meta.url)),
    plugins: [react()],
    logLevel: 'warn',
    build: { outDir: outDir ?? 'dist', emptyOutDir: true, sourcemap: false },
    server: network,
    preview: { ...network, headers: UI_HEADERS },
  };
}
