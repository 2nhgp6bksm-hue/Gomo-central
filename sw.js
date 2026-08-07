const CACHE_NAME = "gomo-central-v18-14";
const OFFLINE_URL = "/index.html";
const APP_SHELL = [
  "/",
  OFFLINE_URL,
  "/assets/styles-v1.5.css?v=18.14",
  "/assets/app-v1.5.js?v=18.14",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/last-war-knowledge.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_URL, response.clone()))
            );
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()))
          );
        }
        return response;
      });
    })
  );
});
