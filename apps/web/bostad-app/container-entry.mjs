/**
 * Container entry for the bostad app. Lives OUTSIDE src/ on purpose: the app
 * source is not touched for deployment. It runs the built server unchanged and
 * adds the two things a container needs that the source does not give it:
 *
 *  1. HOST. src/server.ts listens on 127.0.0.1, which is right on a dev box and
 *     unreachable from Container Apps ingress. The listen call is rewritten to
 *     HOST (0.0.0.0 in the image). Only the literal loopback host is rewritten.
 *  2. GET /healthz, answered before the app router, for probes and HEALTHCHECK.
 *
 * Nothing here reads secrets. Runtime config comes from the container env.
 */
import http from 'node:http';
import net from 'node:net';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = process.env.HOST || '0.0.0.0';

const realListen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  const i = args.findIndex((a) => a === '127.0.0.1');
  if (i !== -1) args[i] = HOST;
  return realListen.apply(this, args);
};

const realCreateServer = http.createServer;
http.createServer = function (...args) {
  const hasOptions = typeof args[0] !== 'function';
  const listener = hasOptions ? args[1] : args[0];
  const wrapped = (req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
      return res.end('ok');
    }
    return listener?.(req, res);
  };
  return hasOptions ? realCreateServer(args[0], wrapped) : realCreateServer(wrapped);
};
// src/server.ts imports createServer by name; make the patched export visible to it.
syncBuiltinESMExports();

const here = dirname(fileURLToPath(import.meta.url));
await import(join(here, 'dist', 'server', 'server.js'));
