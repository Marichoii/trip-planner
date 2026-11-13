import { loadEnv } from 'vite';
import { createHandler } from './mochi-handler.js';

// Runs only inside the Node development server. Private env stays in this closure.
export function mochiApiPlugin(deps = {}) {
  return {
    name: 'mochi-local-api',
    apply: 'serve',
    configureServer(server) {
      const env = deps.env || {
        ...loadEnv(server.config.mode, server.config.envDir, ''),
        ...process.env,
      };
      const handlers = new Map(
        ['session', 'itinerary', 'refine', 'chat', 'analyze'].map((operation) => [
          '/api/ai/' + operation,
          createHandler(operation, { ...deps, env }),
        ]),
      );
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (pathname !== '/api/ai' && !pathname?.startsWith('/api/ai/')) return next();
        const handler = handlers.get(pathname);
        if (!handler) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ error: { code: 'not_found' } }));
          return;
        }
        handler(req, res).catch(() => {
          // Never pass raw server errors to Vite's browser overlay.
          if (res.writableEnded || res.destroyed) return;
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ error: { code: 'unavailable' } }));
        });
      });
    },
  };
}
