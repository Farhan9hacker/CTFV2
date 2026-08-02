const CACHE_NAME = 'black-beacon-v2008';
const CACHED_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/wasm/legacy.wasm',
  '/api/root',
];
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(['/index.html', '/style.css']).catch(function () {});
    })
  );
  self.skipWaiting();
});
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', function (event) {
  const url = new URL(event.request.url);
  if (url.pathname === '/beacon' || url.pathname === '/beacon/') {
    event.respondWith(
      fetch('/pages/beacon.html').then(function (response) {
        const headers = new Headers(response.headers);
        headers.set('X-Sparrow-Signal', 'beacon-active');
        return new Response(response.body, {
          status:  response.status,
          headers: headers,
        });
      }).catch(function () {
        return new Response('<h1>The beacon is dark.</h1>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }
  if (url.pathname === '/api/root') {
    const sessionToken = [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({
        sub: 'pirate',
        role: 'crew',
        iss: 'blackbeacon',
        exp: 9999999999
      })),
      'signature'
    ].join('.');
    event.respondWith(
      new Response(JSON.stringify({ token: sessionToken }), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
    return;
  }
  event.respondWith(
    fetch(event.request).catch(function () {
      return caches.match(event.request);
    })
  );
});
self.addEventListener('message', function (event) {
  if (event.data === 'ARCHIVE_QUERY') {
    if (event.source) {
      event.source.postMessage({
        type:   'ARCHIVE_RESPONSE',
        status: 'SYNCHRONIZED'
      });
    }
  } else if (event.data === 'PING') {
    if (event.source) {
      event.source.postMessage({
        type:  'PONG',
        cache: CACHE_NAME,
      });
    }
  }
});
