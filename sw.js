// 서비스 워커 - 오프라인 지원
const CACHE_NAME = 'mukho-travel-v7';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/map.js',
  './js/data.js',
  './manifest.json'
];

// 설치: 핵심 파일 캐싱 (외부 CDN은 런타임 캐싱)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 요청 가로채기: 캐시 우선, 네트워크 폴백
self.addEventListener('fetch', (event) => {
  // 카카오맵 SDK/타일은 서비스 워커가 가로채지 않음 (브라우저 기본 처리)
  if (event.request.url.includes('kakao.com')) {
    return;
  }

  // 나머지 리소스: 캐시 우선
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
