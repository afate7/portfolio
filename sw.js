/**
 * Service Worker — Portfolio PWA
 * Strategy: Cache-first for assets, Network-first for pages
 * Offline fallback included
 */

// BUILD is auto-stamped by tools/build.mjs on every build so each deploy
// invalidates stale caches for returning visitors.
const BUILD         = 'bmrgkoezf';
const CACHE_NAME    = 'portfolio-' + BUILD;
const STATIC_CACHE  = 'portfolio-static-' + BUILD;
const DYNAMIC_CACHE = 'portfolio-dynamic-' + BUILD;

// Files to precache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/blog/index.html',
  '/blog/post.html',
  '/projects/index.html',
  '/css/main.css',
  '/js/main.js',
  '/manifest.json',
  // Google Fonts cached versions will be handled dynamically
];

// ============================================================
// INSTALL: Precache app shell
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => {
        console.log('[SW] App shell cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(err => console.warn('[SW] Precache error:', err))
  );
});

// ============================================================
// ACTIVATE: Clean up old caches
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// ============================================================
// FETCH: Routing strategy
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser-extension URLs
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Strategy: Cache-first for static assets (CSS, JS, fonts, images)
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy: Network-first for HTML pages (keeps content fresh)
  if (isHTMLPage(request)) {
    event.respondWith(networkFirstHTML(request));
    return;
  }

  // Strategy: Stale-while-revalidate for everything else
  event.respondWith(staleWhileRevalidate(request));
});

// ============================================================
// HELPERS
// ============================================================
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    request.destination === 'style'  ||
    request.destination === 'script' ||
    request.destination === 'font'   ||
    request.destination === 'image'  ||
    /\.(css|js|woff2?|ttf|svg|png|jpg|webp|avif|ico)$/i.test(url.pathname)
  );
}

function isHTMLPage(request) {
  return (
    request.destination === 'document' ||
    request.headers.get('Accept')?.includes('text/html')
  );
}

// Cache-first: serve from cache, fallback to network + cache result
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

// Network-first: try network, fall back to cache, then offline page
async function networkFirstHTML(request) {
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback: serve the closest cached HTML page
    const fallback = await caches.match('/index.html') ||
                     await caches.match('/');
    if (fallback) return fallback;

    return new Response(offlinePage(), {
      headers: { 'Content-Type': 'text/html' },
      status: 503,
    });
  }
}

// Stale-while-revalidate: return cache immediately, update in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise;
}

// Inline offline fallback page
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline · Ahmed Alfateh</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #fafafa; color: #111;
      min-height: 100dvh;
      display: flex; align-items: center; justify-content: center;
      padding: 2rem; text-align: center;
    }
    .wrap { max-width: 400px; }
    .icon { font-size: 4rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.025em; margin-bottom: 0.75rem; }
    p { color: #666; line-height: 1.7; margin-bottom: 1.5rem; }
    a {
      display: inline-block;
      background: #111; color: #fafafa;
      padding: 0.625rem 1.5rem; border-radius: 999px;
      font-size: 0.875rem; font-weight: 500; text-decoration: none;
      transition: opacity 0.2s;
    }
    a:hover { opacity: 0.75; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="icon">📡</div>
    <h1>You're offline</h1>
    <p>It looks like you've lost your connection. Some pages are available from cache, try navigating to them, or come back when you're reconnected.</p>
    <a href="/">Go to homepage</a>
  </div>
</body>
</html>`;
}

// ============================================================
// BACKGROUND SYNC (for contact form submissions)
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'contact-form') {
    event.waitUntil(syncContactForm());
  }
});

async function syncContactForm() {
  // Placeholder: implement with IndexedDB queue for real form sync
  console.log('[SW] Background sync: contact-form');
}
