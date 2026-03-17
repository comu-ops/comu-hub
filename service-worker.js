// COMU Hub PWA — Service Worker
// Estratégia: Network First com fallback para cache
// Isso garante que os dados sempre estejam atualizados quando online,
// mas funciona offline com a última versão cacheada.

const CACHE_NAME = 'comu-hub-v1';
const DASHBOARD_FILES = [
  '/',
  '/comu-hub.html',
  '/comu-dashboard-executivo.html',
  '/comu-dashboard-tap.html',
  '/comu-dashboard-cap.html',
  '/comu-dashboard-cap-gestao.html',
  '/comu-dashboard-gestao-ams.html',
  '/comu-dashboard-comercial.html',
  '/comu-dashboard-funil.html',
  '/comu-dashboard-funnel.html',
  '/comu-dashboard-automacao.html',
  '/comu-dashboard-amostras.html',
  '/comu-dashboard-feed.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable-512.svg'
];

const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js'
];

// Install: pre-cache all dashboard files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching dashboard files');
      return cache.addAll([...DASHBOARD_FILES, ...EXTERNAL_ASSETS]);
    }).catch(err => {
      console.warn('[SW] Pre-cache partial failure (non-critical):', err);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network First strategy for HTML (always fresh data),
// Cache First for static assets (fonts, chart.js, icons)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // For HTML dashboard files: Network First (para dados sempre atualizados)
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Atualiza o cache com a versão mais recente
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline: usa a versão cacheada
          return caches.match(event.request);
        })
    );
    return;
  }

  // For static assets: Cache First (fonts, JS libs, icons)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

// Listen for messages to force update
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'REFRESH_CACHE') {
    caches.open(CACHE_NAME).then((cache) => {
      DASHBOARD_FILES.forEach((file) => {
        fetch(file).then((response) => {
          if (response.ok) cache.put(file, response);
        }).catch(() => {});
      });
    });
  }
});
