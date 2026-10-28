import { defineConfig } from 'vite';

const ROUTES = {
  '/api/register': ['makeRegister', 'POST'],
  '/api/score': ['makeScore', 'POST'],
  '/api/board': ['makeBoard', 'GET'],
  '/api/me': ['makeMe', 'GET'],
  '/api/turnuva': ['makeTournament', 'POST'],
};

// Yerel geliştirme: /api/* isteklerini Vercel handler'larına yönlendirir.
// Env değişkenleri yoksa getRedis() bellek içi Redis döner.
function localApi() {
  let handlers = null;
  return {
    name: 'sezgi-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        const route = ROUTES[url.pathname];
        if (!route) return next();
        try {
          if (!handlers) {
            const h = await server.ssrLoadModule('/api/_lib/handlers.js');
            const { getRedis } = await server.ssrLoadModule('/api/_lib/redis.js');
            const deps = { redis: getRedis(), now: () => new Date() };
            handlers = Object.fromEntries(Object.entries(ROUTES).map(([p, [make]]) => [p, h[make](deps)]));
          }
          if (req.method !== route[1]) { res.statusCode = 405; return res.end(); }
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const request = new Request(url, {
            method: req.method,
            headers: req.headers,
            body: req.method === 'GET' ? undefined : Buffer.concat(chunks),
          });
          const response = await handlers[url.pathname](request);
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [localApi()],
});
