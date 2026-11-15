import { defineConfig, loadEnv } from 'vite';
import { Readable } from 'node:stream';

// Local dev: serve /api/emergency-ai from the same function Vercel runs, so `npm run dev` + a .env file is enough.
// The key is read here on the dev server only. Vite never sends .env values to the browser unless they start with VITE_.
function localApi() {
  return {
    name: 'local-emergency-ai',
    configureServer(server) {
      server.middlewares.use('/api/emergency-ai', async (req, res) => {
        try {
          const api = await server.ssrLoadModule('/api/emergency-ai.js');
          const handler = api[req.method];
          if (!handler) { res.statusCode = 405; return res.end(); }
          const body = req.method === 'POST' ? await new Promise(ok => { let b = ''; req.on('data', c => (b += c)); req.on('end', () => ok(b)); }) : undefined;
          const request = new Request(`http://${req.headers.host}/api/emergency-ai`, { method: req.method, headers: req.headers, body });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          if (response.body) Readable.fromWeb(response.body).pipe(res); else res.end();
        } catch (e) {
          server.config.logger.error(`[emergency-ai] ${e.message}`);
          res.statusCode = 500; res.end();
        }
      });
    },
  };
}

// base './' so the built site also works from GitHub Pages or any subfolder
export default defineConfig(({ mode }) => {
  // load ANTHROPIC_API_KEY / GEMINI_API_KEY etc. from .env into this server process only
  const env = loadEnv(mode, process.cwd(), '');
  for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_FALLBACK_MODELS', 'ALLOWED_ORIGINS']) if (env[k] && !process.env[k]) process.env[k] = env[k];
  return {
    base: './',
    server: { port: 5173, open: true },
    plugins: [localApi()],
  };
});
