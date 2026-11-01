// `pnpm control`: builds the UI, then serves it on 127.0.0.1:4317 and starts the Control Center
// server (127.0.0.1:4318) in the same process. One Ctrl+C stops both.
import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import { startLocal } from './server/main.ts';
import { portFrom, UI_PORT } from './server/security.ts';
import { uiConfig } from './web/ui-config.ts';

/** Starts the API with the UI server and closes it with it. If the API cannot start, neither does the UI. */
function controlServer(): Plugin {
  const attach = async (server: ViteDevServer | PreviewServer) => {
    const api = await startLocal(process.env);
    server.httpServer?.once('close', () => void api.close());
    server.httpServer?.once('listening', () => {
      console.log(`\nOrrery Control Center: open http://127.0.0.1:${UI_PORT} (server on 127.0.0.1:${api.address.port}, loopback only). Press Ctrl+C to stop both.\n`);
    });
  };
  return { name: 'orrery-control-server', apply: 'serve', configureServer: attach, configurePreviewServer: attach };
}

export default defineConfig(() => {
  const config = uiConfig({ uiPort: UI_PORT, apiPort: portFrom(process.env.PU_CONTROL_PORT) });
  return { ...config, plugins: [...(config.plugins ?? []), controlServer()] };
});
