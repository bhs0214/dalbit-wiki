/* 달빛여관 Service Worker
   - 앱 셸(HTML/아이콘/매니페스트) 프리캐시 → 진짜 오프라인 동작
   - 구글 폰트·유니버설 이미지는 런타임 캐시(첫 온라인 방문 후 오프라인에서도 표시)
   - api.anthropic.com 등 POST 요청은 절대 캐시하지 않음
   버전을 올리면(아래 CACHE) 옛 캐시는 자동 정리됩니다. */
const CACHE = 'dalbit-v1';

const APP_SHELL = [
  './',
  './index.html',
  './dalbit-offline.html',
  './dalbit-novel.html',
  './dalbit-roleplay.html',
  './dalbit-chat-rp.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './favicon-32.png',
  './og-cover.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // GET만 처리. POST(=AI 호출 등)는 항상 네트워크로 통과시켜 캐시/간섭하지 않음.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 구글 폰트 + 외부 이미지(Unsplash 등): stale-while-revalidate
  const isFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
  const isImg = req.destination === 'image' && url.origin !== self.location.origin;
  if (isFont || isImg) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  // 같은 출처 HTML(페이지 이동): network-first → 오프라인이면 캐시
  if (url.origin === self.location.origin && req.mode === 'navigate') {
    e.respondWith(networkFirst(req));
    return;
  }

  // 그 외 같은 출처 정적 자원: cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(cacheFirst(req));
    return;
  }
});

function ignoreSearch(req) { return { ignoreSearch: true }; }

async function cacheFirst(req) {
  const cached = await caches.match(req, ignoreSearch(req));
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch (err) {
    return cached || Response.error();
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await caches.match(req, ignoreSearch(req));
    return cached || caches.match('./index.html');
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const network = fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || network;
}
