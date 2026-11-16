/* ZJU 叫牌 —— 离线缓存 */
const CACHE = 'zju-bid-v5.1.0';
const ASSETS = [
  './', './index.html', './app.js', './engine.js',
  './core/calls.js', './core/auction.js', './core/context.js',
  './core/hand.js', './core/rules.js', './core/recommend.js',
  './data/bridge-data.js',
  './manifest.json', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-1024.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   // API 请求不缓存

  const isDoc = e.request.mode === 'navigate' ||
    url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isDoc) {
    // 页面 network-first：改版后刷新立即生效，断网时回缓存
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(e.request).then(hit => hit || caches.match('./index.html'))
      )
    );
    return;
  }

  // 静态资源 stale-while-revalidate：先用缓存，后台更新
  e.respondWith(
    caches.match(e.request).then(hit => {
      const update = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => null);
      return hit || update.then(res => res ||
        caches.match('./index.html').then(fb => fb || new Response('离线', { status: 503 })));
    })
  );
});
