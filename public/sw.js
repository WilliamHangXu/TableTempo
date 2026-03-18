const CACHE_NAME = "table-tempo-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const cacheKey = event.request.mode === "navigate" ? "/index.html" : event.request;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
        }

        return response;
      })
      .catch(async () => {
        const fallback =
          event.request.mode === "navigate"
            ? await caches.match("/index.html")
            : await caches.match(event.request);

        if (fallback) {
          return fallback;
        }

        if (event.request.mode === "navigate") {
          const cachedIndex = await caches.match("/index.html");

          if (cachedIndex) {
            return cachedIndex;
          }
        }

        return Response.error();
      })
  );
});
