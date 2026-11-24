/*
 * Service worker for the web app. scripts/add-service-worker.js fills in the two placeholders
 * below and writes the result to dist/sw.js.
 *
 * What it does:
 * - On install it stores the app (page, script, sound effects, icons) so the game opens offline.
 * - Pages are fetched from the network first, so a new release shows up as soon as there is a
 *   connection. The stored page is only a fallback for when the network fails or stalls.
 * - Stored files are served from the cache. Everything else (BGM, landing videos) is left to the
 *   browser untouched, which keeps media streaming exactly as it was. Offline, the game plays
 *   without BGM.
 */
const CACHE_VERSION = '__CACHE_VERSION__';
const PRECACHE_PATHS = __PRECACHE_PATHS__;

const CACHE_PREFIX = 'marumaru-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL_PATH = 'index.html';
const NAVIGATION_TIMEOUT_MS = 4000;

const toUrl = (path) => new URL(path, self.registration.scope).href;
const PRECACHE_URLS = new Set(PRECACHE_PATHS.map(toUrl));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        [...PRECACHE_URLS].map(async (url) => {
          // File names carry a content hash, so a copy kept by the previous version is still good.
          const kept = url === toUrl(APP_SHELL_PATH) ? undefined : await caches.match(url);
          if (kept) {
            await cache.put(url, kept);
            return;
          }

          const response = await fetch(new Request(url, { cache: 'reload' }));
          if (!response.ok) {
            throw new Error(`Could not store ${url}: ${response.status}`);
          }
          await cache.put(url, response);
        }),
      );
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) {
    return;
  }

  if (request.mode === 'navigate') {
    // A path with a file extension is a file opened directly, not a page of the app.
    if (!/\.[a-z0-9]+$/i.test(url.pathname)) {
      event.respondWith(respondToNavigation(request));
    }
    return;
  }

  const assetUrl = url.origin + url.pathname;
  if (PRECACHE_URLS.has(assetUrl)) {
    event.respondWith(respondWithStoredAsset(request, assetUrl));
  }
});

async function respondToNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const shell = await cache.match(toUrl(APP_SHELL_PATH));
  if (!shell) {
    return fetch(request);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAVIGATION_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } catch {
    return shell;
  } finally {
    clearTimeout(timer);
  }
}

async function respondWithStoredAsset(request, assetUrl) {
  const cache = await caches.open(CACHE_NAME);
  const stored = await cache.match(assetUrl);
  if (!stored) {
    return fetch(request);
  }

  const range = request.headers.get('range');
  return range ? createRangeResponse(stored, range) : stored;
}

// Audio elements ask for byte ranges, and Safari refuses anything but a 206 answer to them.
async function createRangeResponse(response, rangeHeader) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (match[1] === '' && match[2] === '')) {
    return response;
  }

  const body = await response.arrayBuffer();
  const size = body.byteLength;
  const start = match[1] === '' ? Math.max(0, size - Number(match[2])) : Number(match[1]);
  const end = match[1] === '' || match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (start >= size || start > end) {
    return new Response(null, { status: 416, statusText: 'Range Not Satisfiable', headers: { 'Content-Range': `bytes */${size}` } });
  }

  const headers = new Headers(response.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(body.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers });
}
