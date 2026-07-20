const CACHE_NAME = "quran-mushaf-cache-v4";

// Assets to cache immediately on install (App Shell)
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js",
  "./manifest.json",
  // Font Awesome CDN
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  // Google Fonts
  "https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Amiri:ital,wght@0,400;0,700&family=Cairo:wght@300;400;600;700&display=swap"
];

// Install Event: Cache all core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching App Shell...");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Smart offline fallback & caching
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. API Requests (Quran text, page data, surah list)
  // Cache them dynamically so pages already read work offline.
  if (requestUrl.hostname.includes("alquran.cloud")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // Save a clone of the response to the cache
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => {
            // If offline, try matching from cache
            return cache.match(event.request).then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              // If not in cache and offline, return a friendly JSON error
              return new Response(
                JSON.stringify({
                  code: 500,
                  status: "Offline",
                  data: { ayahs: [], message: "أنت غير متصل بالإنترنت ولم تقم بزيارة هذه الصفحة سابقاً." }
                }),
                { headers: { "Content-Type": "application/json" } }
              );
            });
          });
      })
    );
    return;
  }

  // 2. Audio Files from Islamic Network CDN
  // We cache audio files dynamically as they are played, so recently played audio works offline.
  if (requestUrl.hostname.includes("islamic.network")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return caches.open(CACHE_NAME).then((cache) => {
          return fetch(event.request)
            .then((response) => {
              // Cache audio files dynamically
              if (response.status === 200) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
            .catch(() => {
              // Return nothing if offline and not cached
            });
        });
      })
    );
    return;
  }

  // 3. Static Assets (App Shell) - Cache First falling back to Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache newly requested local assets (like dynamically loaded fonts, etc)
        if (event.request.method === "GET" && requestUrl.origin === location.origin) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        }
        return response;
      }).catch(() => {
        // Return index.html if request is navigation
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
