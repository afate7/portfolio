/**
 * Portfolio Local Server
 * - Serves the static site on port 3456
 * - Runs the Admin API on port 3457
 * - No npm install needed — uses only Node.js built-ins
 *
 * Usage:  node server.js
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const ROOT       = __dirname;
const SITE_PORT  = 3456;
const ADMIN_PORT = 3457;

// ── MIME types ───────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md':   'text/plain; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

// ── SSE live-reload clients ───────────────────────────────
const sseClients = new Set();

// Watch content/ directory and broadcast change events
const contentDir = path.join(ROOT, 'content');
fs.watch(contentDir, { recursive: true }, (event, filename) => {
  if (!filename || filename.includes('.DS_Store')) return;
  const msg = `data: ${JSON.stringify({ event, file: filename })}\n\n`;
  sseClients.forEach(client => {
    try { client.write(msg); } catch (e) { sseClients.delete(client); }
  });
});

// ── Static file server (port 3456) ──────────────────────────
const staticServer = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;

  // ── GET /css/theme.css ── dynamic theme stylesheet from theme.json
  if (req.method === 'GET' && pathname === '/css/theme.css') {
    try {
      const themeFile = path.join(ROOT, 'content', 'settings', 'theme.json');
      const theme = JSON.parse(fs.readFileSync(themeFile, 'utf8'));
      const r = parseInt(theme.borderRadius) || 12;

      // Font family mapping
      const fontMap = {
        'Inter':             "'Inter', system-ui, -apple-system, sans-serif",
        'DM Sans':           "'DM Sans', system-ui, sans-serif",
        'Plus Jakarta Sans': "'Plus Jakarta Sans', system-ui, sans-serif",
        'Manrope':           "'Manrope', system-ui, sans-serif",
        'Space Grotesk':     "'Space Grotesk', system-ui, sans-serif",
        'Lora':              "'Lora', Georgia, serif",
        'Playfair Display':  "'Playfair Display', Georgia, serif",
        'Merriweather':      "'Merriweather', Georgia, serif",
      };
      const fontStack = fontMap[theme.fontFamily] || fontMap['Inter'];

      // Button border-radius based on style
      const btnRadius = theme.buttonStyle === 'pill' ? '9999px'
                      : theme.buttonStyle === 'square' ? '4px'
                      : Math.round(r * 0.67) + 'px'; // default rounded

      // Google Fonts import for non-default fonts
      const googleFontImports = {
        'DM Sans':           'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
        'Plus Jakarta Sans': 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
        'Manrope':           'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap',
        'Space Grotesk':     'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
        'Lora':              'https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap',
        'Playfair Display':  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
        'Merriweather':      'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
      };
      const fontImport = googleFontImports[theme.fontFamily]
        ? `@import url('${googleFontImports[theme.fontFamily]}');\n\n`
        : '';

      const css = fontImport + `:root {
  --clr-accent:       ${theme.accentColor || '#2563eb'};
  --clr-accent-hover: ${theme.accentHover || '#1d4ed8'};
  --clr-accent-soft:  ${theme.accentSoft  || '#eff6ff'};
  --clr-bg:           ${theme.bgColor     || '#fafafa'};
  --clr-bg-alt:       ${theme.bgAlt       || '#f4f4f0'};
  --clr-surface:      ${theme.surfaceColor|| '#ffffff'};
  --clr-border:       ${theme.borderColor || '#e8e8e4'};
  --clr-text:         ${theme.textColor   || '#111110'};
  --clr-text-muted:   ${theme.textMuted   || '#6b6b67'};
  --clr-text-faint:   ${theme.textFaint   || '#a8a8a4'};
  --font-sans:        ${fontStack};
  --radius-sm:        ${Math.max(2, Math.round(r * 0.33))}px;
  --radius-md:        ${Math.max(4, Math.round(r * 0.67))}px;
  --radius-lg:        ${r}px;
  --radius-xl:        ${Math.round(r * 1.33)}px;
  --radius-2xl:       ${Math.round(r * 2)}px;
  --radius-full:      9999px;
  --btn-radius:       ${btnRadius};
}
.btn { border-radius: var(--btn-radius) !important; }
.nav__cta { border-radius: var(--btn-radius) !important; }
`;
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(css);
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end('/* theme error */');
    }
    return;
  }

  // ── GET /__reload ── SSE live-reload stream (same-origin, no CORS needed)
  if (req.method === 'GET' && pathname === '/__reload') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Serve static files
  let filePath = path.join(ROOT, pathname === '/' || pathname === '' ? '/index.html' : pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      filePath = indexPath;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Server Error');
  }
});

// ── Admin API server (port 3457) ────────────────────────────
const adminServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── GET /api/posts ── list all blog posts
  if (req.method === 'GET' && pathname === '/api/posts') {
    const dir = path.join(ROOT, 'content', 'blog');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    const posts = files.map(f => {
      const raw  = fs.readFileSync(path.join(dir, f), 'utf8');
      const data = parseFrontmatter(raw);
      return { slug: f.replace('.md', ''), ...data.meta, excerpt: data.meta.excerpt || '' };
    });
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    respond(res, 200, posts);
    return;
  }

  // ── GET /api/posts/:slug ── single post
  if (req.method === 'GET' && pathname.startsWith('/api/posts/')) {
    const slug = pathname.split('/api/posts/')[1];
    const file = path.join(ROOT, 'content', 'blog', `${slug}.md`);
    if (!fs.existsSync(file)) { respond(res, 404, { error: 'Not found' }); return; }
    const raw  = fs.readFileSync(file, 'utf8');
    const data = parseFrontmatter(raw);
    respond(res, 200, { slug, ...data.meta, body: data.body });
    return;
  }

  // ── PUT /api/posts/:slug ── save post
  if (req.method === 'PUT' && pathname.startsWith('/api/posts/')) {
    const slug = pathname.split('/api/posts/')[1];
    readBody(req, (body) => {
      try {
        const data = JSON.parse(body);
        const md   = toMarkdown(data);
        const file = path.join(ROOT, 'content', 'blog', `${slug}.md`);
        fs.writeFileSync(file, md, 'utf8');
        respond(res, 200, { ok: true, slug });
      } catch (e) { respond(res, 400, { error: e.message }); }
    });
    return;
  }

  // ── POST /api/posts ── create post
  if (req.method === 'POST' && pathname === '/api/posts') {
    readBody(req, (body) => {
      try {
        const data = JSON.parse(body);
        const slug = slugify(data.title || 'untitled');
        const md   = toMarkdown(data);
        const file = path.join(ROOT, 'content', 'blog', `${slug}.md`);
        fs.writeFileSync(file, md, 'utf8');
        respond(res, 201, { ok: true, slug });
      } catch (e) { respond(res, 400, { error: e.message }); }
    });
    return;
  }

  // ── DELETE /api/posts/:slug ── delete post
  if (req.method === 'DELETE' && pathname.startsWith('/api/posts/')) {
    const slug = pathname.split('/api/posts/')[1];
    const file = path.join(ROOT, 'content', 'blog', `${slug}.md`);
    if (!fs.existsSync(file)) { respond(res, 404, { error: 'Not found' }); return; }
    fs.unlinkSync(file);
    respond(res, 200, { ok: true });
    return;
  }

  // ── GET /api/projects ── list projects
  if (req.method === 'GET' && pathname === '/api/projects') {
    const dir   = path.join(ROOT, 'content', 'projects');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    const items = files.map(f => {
      const raw  = fs.readFileSync(path.join(dir, f), 'utf8');
      const data = parseFrontmatter(raw);
      return { slug: f.replace('.md', ''), ...data.meta };
    });
    items.sort((a, b) => (b.year || 0) - (a.year || 0));
    respond(res, 200, items);
    return;
  }

  // ── GET /api/projects/:slug ── single project
  if (req.method === 'GET' && pathname.startsWith('/api/projects/')) {
    const slug = pathname.split('/api/projects/')[1];
    const file = path.join(ROOT, 'content', 'projects', `${slug}.md`);
    if (!fs.existsSync(file)) { respond(res, 404, { error: 'Not found' }); return; }
    const raw  = fs.readFileSync(file, 'utf8');
    const data = parseFrontmatter(raw);
    respond(res, 200, { slug, ...data.meta, body: data.body });
    return;
  }

  // ── PUT /api/projects/:slug ── save project
  if (req.method === 'PUT' && pathname.startsWith('/api/projects/')) {
    const slug = pathname.split('/api/projects/')[1];
    readBody(req, (body) => {
      try {
        const data = JSON.parse(body);
        const md   = toMarkdown(data);
        const file = path.join(ROOT, 'content', 'projects', `${slug}.md`);
        fs.writeFileSync(file, md, 'utf8');
        respond(res, 200, { ok: true, slug });
      } catch (e) { respond(res, 400, { error: e.message }); }
    });
    return;
  }

  // ── POST /api/projects ── create project
  if (req.method === 'POST' && pathname === '/api/projects') {
    readBody(req, (body) => {
      try {
        const data = JSON.parse(body);
        const slug = slugify(data.title || 'untitled');
        const md   = toMarkdown(data);
        const file = path.join(ROOT, 'content', 'projects', `${slug}.md`);
        fs.writeFileSync(file, md, 'utf8');
        respond(res, 201, { ok: true, slug });
      } catch (e) { respond(res, 400, { error: e.message }); }
    });
    return;
  }

  // ── DELETE /api/projects/:slug ── delete project
  if (req.method === 'DELETE' && pathname.startsWith('/api/projects/')) {
    const slug = pathname.split('/api/projects/')[1];
    const file = path.join(ROOT, 'content', 'projects', `${slug}.md`);
    if (!fs.existsSync(file)) { respond(res, 404, { error: 'Not found' }); return; }
    fs.unlinkSync(file);
    respond(res, 200, { ok: true });
    return;
  }

  // ── GET /api/settings/:name ── get settings file
  if (req.method === 'GET' && pathname.startsWith('/api/settings/')) {
    const name = pathname.split('/api/settings/')[1];
    const file = path.join(ROOT, 'content', 'settings', `${name}.json`);
    if (!fs.existsSync(file)) { respond(res, 404, { error: 'Not found' }); return; }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    respond(res, 200, data);
    return;
  }

  // ── PUT /api/settings/:name ── save settings file
  if (req.method === 'PUT' && pathname.startsWith('/api/settings/')) {
    const name = pathname.split('/api/settings/')[1];
    readBody(req, (body) => {
      try {
        const data = JSON.parse(body);
        const file = path.join(ROOT, 'content', 'settings', `${name}.json`);
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
        respond(res, 200, { ok: true });
      } catch (e) { respond(res, 400, { error: e.message }); }
    });
    return;
  }

  // ── GET /api/upload (list uploads) ──
  if (req.method === 'GET' && pathname === '/api/uploads') {
    const dir = path.join(ROOT, 'assets', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f));
    respond(res, 200, files.map(f => ({ name: f, url: `/assets/uploads/${f}` })));
    return;
  }

  respond(res, 404, { error: 'Unknown endpoint' });
});

// ── Helpers ──────────────────────────────────────────────────
function respond(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req, cb) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => cb(body));
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta = {};
  let currentKey = null;

  match[1].split('\n').forEach(line => {
    if (/^\s+-\s+/.test(line)) {
      const val = line.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, '');
      if (currentKey && Array.isArray(meta[currentKey])) meta[currentKey].push(val);
      return;
    }
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.*)?$/);
    if (kv) {
      currentKey = kv[1];
      let val = (kv[2] || '').trim().replace(/^["']|["']$/g, '');
      if (val === '')       { meta[currentKey] = []; }
      else if (val === 'true')  { meta[currentKey] = true; }
      else if (val === 'false') { meta[currentKey] = false; }
      else if (/^\d+$/.test(val)) { meta[currentKey] = parseInt(val, 10); }
      else { meta[currentKey] = val; }
    }
  });

  return { meta, body: match[2].trim() };
}

function toMarkdown(data) {
  const { body, ...meta } = data;
  const lines = ['---'];
  for (const [k, v] of Object.entries(meta)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      v.forEach(item => lines.push(`  - ${item}`));
    } else if (typeof v === 'string' && v.includes('\n')) {
      lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('---', '', body || '');
  return lines.join('\n');
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ── Start servers ────────────────────────────────────────────
staticServer.listen(SITE_PORT, () => {
  console.log(`\n✅ Site:  http://localhost:${SITE_PORT}`);
});

adminServer.listen(ADMIN_PORT, () => {
  console.log(`✅ Admin: http://localhost:${ADMIN_PORT}  (API)`);
  console.log(`\n📝 Edit content in content/*.md, run \`node tools/build.mjs\`, then commit.\n`);
});
