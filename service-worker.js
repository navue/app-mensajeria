const CACHE_NAME = "app-mensajeria-cache-v2.3.0";
const urlsToCache = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/db.js",
  "./assets/images/fondo.jpg",
  "./assets/images/foto.png",
  "./offline.html",
];

/* ---------------- INSTALL ---------------- */
self.addEventListener("install", (event) => {
  console.log("Service Worker: Instalando...");
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cacheando archivos...");
      return cache.addAll(urlsToCache);
    }),
  );
});

/* ---------------- ACTIVATE ---------------- */
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activado");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Borrando cache viejo:", cache);
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

/* ---------------- FETCH ---------------- */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });
        }
        return response;
      })
      .catch(async () => {
        return (
          (await caches.match(event.request)) || caches.match("./offline.html")
        );
      }),
  );
});
