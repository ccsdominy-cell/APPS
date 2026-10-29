// mygcsehub — root service worker
// Scope: / (hub only — subject apps at /APPS/ have their own SW)
const CACHE = 'mygcsehub-v1';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-192.png'
];

// ── Install: cache the hub shell ──────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: remove stale caches ────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for hub shell, pass through everything else ────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Don't intercept cross-origin (Google Fonts etc.) — let browser handle
  if (url.origin !== location.origin) return;

  // Don't intercept subject apps — their own SW handles /APPS/
  if (url.pathname.startsWith('/APPS')) return;

  // Don't intercept GCSE-RS (no SW there)
  if (url.pathname.startsWith('/GCSE-RS')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET responses for the hub shell
        if (e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
