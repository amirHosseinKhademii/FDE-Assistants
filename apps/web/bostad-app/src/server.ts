/**
 * The deployable server: turns the built request handler into a listening
 * process. `vite build` emits a request HANDLER only, and TanStack Start has no
 * adapter for plain Node, so this is the adapter (node:http, no extra deps).
 *
 * It binds loopback. The `import.meta.env.PROD` guard keeps `vite dev` from
 * opening a second listener on the same port.
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
  const port = Number(process.env.PORT ?? 3500);
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

    // Everything else is the app: SSR pages and the /api/profile route.
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
  }).listen(port, '127.0.0.1', () => {
    console.log(`bostad web listening on ${port}`);
  });
}

export default { fetch: (request: Request) => handler(request) };
