const CACHE_NAME = "app-mensajeria-cache";

const urlsToCache = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./manifest.json",
  "./assets/images/fondo.png",
  "./assets/images/foto.png",
  "./offline.html"
];

// INSTALL: guarda archivos iniciales
self.addEventListener("install", (event) => {
  console.log("Service Worker: Instalando...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cacheando archivos...");
      return cache.addAll(urlsToCache);
    })
  );
});

// ACTIVATE: limpia cache viejo
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
        })
      );
    })
  );
});

// FETCH: estrategia inteligente, busca primero en la red y luego en cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          return response || caches.match("./offline.html");
        });
      })
  );
});