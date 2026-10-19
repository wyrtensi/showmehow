// npm run serve: serves dist/ under BASE_PATH (default /) on PORT (default 4321).
// Directories get index.html, misses get 404.html with status 404.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalizeBase } from '../src/lib/paths.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8'
};

async function fileAt(path) {
  try {
    const s = await stat(path);
    if (s.isFile()) return path;
    if (s.isDirectory()) {
      const index = join(path, 'index.html');
      if ((await stat(index).catch(() => null))?.isFile()) return index;
    }
  } catch {
    // missing
  }
  return null;
}

export function createDistServer({ dir = join(ROOT, 'dist'), base = '/' } = {}) {
  const root = resolve(dir);
  const b = normalizeBase(base);
  return createServer(async (req, res) => {
    const send = async (status, file, headers = {}) => {
      const body = file ? await readFile(file) : Buffer.from('Not found');
      res.writeHead(status, { 'content-type': file ? TYPES[extname(file).toLowerCase()] || 'application/octet-stream' : 'text/plain; charset=utf-8', 'cache-control': 'no-cache', ...headers });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { allow: 'GET, HEAD' }); res.end(); return; }
      const url = new URL(req.url, 'http://localhost');
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { pathname = null; }
      if (pathname === '/' && b !== '/') { res.writeHead(302, { location: b }); res.end(); return; }
      let file = null;
      if (pathname && (pathname.startsWith(b) || pathname + '/' === b) && !pathname.includes('\0')) {
        const rel = pathname.slice(Math.min(b.length, pathname.length));
        const target = resolve(root, '.' + sep + rel);
        if (target === root || target.startsWith(root + sep)) {
          if (!pathname.endsWith('/') && (await stat(target).catch(() => null))?.isDirectory()) {
            res.writeHead(301, { location: `${url.pathname}/${url.search}` });
            res.end();
            return;
          }
          file = await fileAt(target);
        }
      }
      if (file) return await send(200, file);
      const notFound = await fileAt(join(root, '404.html'));
      return await send(404, notFound);
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(error && error.message));
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const i = process.argv.indexOf('--dir');
  const dir = i > 0 ? resolve(process.argv[i + 1]) : join(ROOT, 'dist');
  if (/^[A-Za-z]:[\\/]/.test(process.env.BASE_PATH || '')) {
    console.error(`BASE_PATH is "${process.env.BASE_PATH}", a Windows path; Git Bash rewrote it. Run with MSYS_NO_PATHCONV=1.`);
    process.exit(1);
  }
  const base = normalizeBase(process.env.BASE_PATH || '/');
  const port = Number(process.env.PORT || 4321);
  createDistServer({ dir, base }).listen(port, () => {
    console.log(`Serving ${dir} at http://localhost:${port}${base}`);
  });
}
