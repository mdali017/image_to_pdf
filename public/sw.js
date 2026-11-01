/// <reference lib="webworker" />

const CACHE_NAME = 'image-to-pdf-v1';

const STATIC_ASSETS = [
  '/',
];

// Install: cache static shell
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  (self as any).skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  (self as any).clients.claim();
});

// Fetch: network-first for navigation, cache-first for assets
self.addEventListener('fetch', (event: any) => {
  const { request } = event;

  // Skip non-GET
  if (request.method !== 'GET') return;

  // For navigation requests: network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/') as Promise<Response>)
    );
    return;
  }

  // For static assets: cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (request.url.includes('/icons/') || request.url.includes('/_next/static/'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

export {};

