import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = '/root/project/agent-mobile/agent-mobile-app/dist';
const PORT = 9928;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json', '.webp': 'image/webp',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.map', '.svg']);

const gzipCache = new Map();

async function serveFile(res, file, acceptsGzip) {
  let data = await readFile(file);
  const mime = MIME[extname(file)] || 'application/octet-stream';
  if (acceptsGzip && COMPRESSIBLE.has(extname(file)) && data.length > 1024) {
    let gz = gzipCache.get(file);
    if (!gz) {
      gz = gzipSync(data, { level: 9 });
      gzipCache.set(file, gz);
    }
    res.writeHead(200, { 'Content-Type': mime, 'Content-Encoding': 'gzip', 'Vary': 'Accept-Encoding' });
    res.end(gz);
  } else {
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  }
}

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const acceptsGzip = /gzip/.test(req.headers['accept-encoding'] || '');
  let path = decodeURIComponent((req.url || '/').split('?')[0]);
  if (path === '/') return res.writeHead(302, { Location: '/pulse' }).end();
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    await serveFile(res, file, acceptsGzip);
  } catch {
    try {
      await serveFile(res, file + '.html', acceptsGzip);
    } catch {
      res.writeHead(404).end('Not Found');
    }
  }
}).listen(PORT, () => console.log(`Pulse static server on :${PORT} (gzip enabled)`));
