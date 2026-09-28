import http from 'node:http';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const port = Number(process.env.PORT || 4178);
const files = new Map([
  ['/sub2api-wecom.user.js', ['sub2api-wecom.user.js', 'application/javascript; charset=utf-8']],
  ['/preview.css', ['preview/preview.css', 'text/css; charset=utf-8']],
  ['/preview.js', ['preview/preview.js', 'application/javascript; charset=utf-8']],
]);
http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const entry = files.get(path) || (path === '/' || path.startsWith('/admin/') || path === '/profile' ? ['preview/index.html', 'text/html; charset=utf-8'] : null);
  if (!entry) { res.writeHead(404); res.end('Not found'); return; }
  try { const data = await readFile(new URL(entry[0], root)); res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store' }); res.end(data); }
  catch { res.writeHead(500); res.end('Run npm run build first.'); }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/admin/accounts (synthetic data only)`));
