// Servidor de teste: simula um site publicado exclusivamente em /trip-planner/.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};
http
  .createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (!path.startsWith('/trip-planner/')) {
      res.writeHead(404).end('Not found');
      return;
    }
    const relative = decodeURIComponent(path.slice('/trip-planner/'.length)) || 'index.html';
    const file = resolve(root, relative);
    if (!file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404).end('Not found');
    }
  })
  .listen(4173, '127.0.0.1');
