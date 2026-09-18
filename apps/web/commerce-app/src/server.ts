/**
 * The deployable server. Turns the built request handler into a listening process.
 *
 * WHY THIS FILE EXISTS. `vite build` produces `dist/server/server.js`, which is a
 * request HANDLER — `node dist/server/server.js` exits immediately because
 * nothing binds a port. TanStack Start 1.168 has no preset or adapter system:
 * the only hook is `server.entry`, which becomes the rolldown input. So the
 * adapter is ours, and it is about sixty lines of `node:http` with no new
 * dependency.
 *
 * (`srvx` would be shorter and is not resolvable here: under pnpm's strict
 * layout it exists only as a transitive dependency, so it cannot even be
 * bundled without becoming an explicit dependency of this package.)
 *
 * WHY THE `import.meta.env.PROD` GUARD. The dev server imports this same module,
 * so without the guard `vite dev` would ALSO open this listener — two servers,
 * one port, confusing failures.
 *
 * ADAPTED FROM `apps/web/safety-app/src/server.ts`, which is the file to fix if
 * any of this turns out to be wrong — five apps now carry this same sixty
 * lines, and the duplication is tracked rather than hidden.
 *
 * WHY STATIC FILES ARE SERVED HERE. Wrapping the handler alone gives a page that
 * server-renders and then never hydrates, because `/assets/*.js` 404s. The page
 * looks fine and is dead, which is the worst failure shape available.
 */
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

/**
 * `createStartHandler` returns a PLAIN FUNCTION `(request, opts) => Response`.
 * The `{ fetch }` shape at the bottom is a different thing: it is what the dev
 * and preview plugins expect of the default export (`serverEntry.default.fetch`).
 * Confusing the two gives "handler.fetch is not a function" at the first request
 * — the server boots and listens, and every request throws.
 */
const handler = createStartHandler(defaultStreamHandler);

const TYPES: Record<string, string> = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json',
};

if (import.meta.env.PROD) {
  const port = Number(process.env.PORT ?? 3000);
  const clientDir = join(import.meta.dirname ?? process.cwd(), '..', 'client');

  createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    // Static assets first. `normalize` + the prefix check is what stops
    // `/assets/../../.env` from being a file-read primitive.
    if (req.method === 'GET' || req.method === 'HEAD') {
      const candidate = normalize(join(clientDir, url.pathname));
      if (candidate.startsWith(clientDir)) {
        try {
          if (statSync(candidate).isFile()) {
            res.writeHead(200, {
              'content-type': TYPES[extname(candidate)] ?? 'application/octet-stream',
              // Vite fingerprints asset filenames, so they are safe to cache hard.
              'cache-control': url.pathname.startsWith('/assets/')
                ? 'public, max-age=31536000, immutable'
                : 'no-cache',
            });
            if (req.method === 'HEAD') return res.end();
            return createReadStream(candidate).pipe(res);
          }
        } catch {
          /* not a file — fall through to the app */
        }
      }
    }

    // Everything else is the app. Two server-rendered pages and no API route
    // today — the body handling below is kept because `/api/resolve` is the
    // next thing this app grows, and an adapter that cannot take a request
    // body fails at the first POST rather than at build time.
    const body =
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : (Readable.toWeb(req) as ReadableStream);

    const response = await handler(
      new Request(url, {
        method: req.method,
        headers: req.headers as any,
        body,
        // Required by undici whenever a body is a stream: it says "I will not
        // wait for a response before finishing the request body".
        ...(body ? { duplex: 'half' } : {}),
      } as any),
    );

    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (!response.body) return res.end();
    // Piping rather than buffering is what keeps SSE streaming end to end.
    Readable.fromWeb(response.body as any).pipe(res);
  }).listen(port, () => {
    console.log(`thornbury web listening on ${port}`);
  });
}

export default { fetch: (request: Request) => handler(request) };
