// Service Worker for POS System
const CACHE_NAME = 'pos-system-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/index.css',
  '/src/App.jsx'
];

// Install a service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Cache addAll error:', error);
          // Continue even if some resources fail to cache
          return Promise.resolve();
        });
      })
  );
});

// Cache and return requests
self.addEventListener('fetch', event => {
  // Skip non-HTTP/HTTPS URLs, extension requests, and other problematic URLs
  if (!event.request.url.startsWith('http') || 
      event.request.url.includes('chrome-extension') ||
      event.request.url.includes('extensions.aitopia.ai')) {
    return;
  }

  // Skip cross-origin requests to avoid CORS issues
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  
  if (!sameOrigin && !event.request.url.includes('unsplash.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request to avoid consuming it
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Try to cache the response, but don't block on it
            caches.open(CACHE_NAME)
              .then(cache => {
                try {
                  // Only cache GET requests to avoid issues
                  if (fetchRequest.method === 'GET') {
                    cache.put(event.request, responseToCache).catch(error => {
                      console.warn('Failed to cache resource:', error);
                    });
                  }
                } catch (error) {
                  console.warn('Error during cache operation:', error);
                }
              })
              .catch(error => {
                console.warn('Failed to open cache:', error);
              });

            return response;
          })
          .catch(error => {
            console.error('Fetch error:', error);
            // You might want to return a custom offline page here
            return new Response('Network error happened', {
              status: 408,
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Update a service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
}); 