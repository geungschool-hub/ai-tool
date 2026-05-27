// 할 일 관리 — Service Worker (캐싱 전용, 외부 통신 없음)
// 앱 셸을 캐시해 오프라인 동작과 빠른 재실행을 지원합니다.
// 데이터는 모두 브라우저 localStorage에만 있으며, SW는 어떤 데이터도 외부로 전송하지 않습니다.

const CACHE = "todo-geung-v3";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 캐시 우선, 없으면 네트워크(앱 셸 갱신용). 외부 도메인 요청은 건드리지 않음.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    )
  );
});
