const CACHE_NAME = 'pos-system-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

const API_CACHE_NAME = 'pos-api-cache-v1';
const API_ROUTES = [
  '/api/items',
  '/api/tables',
  '/api/waiters',
  '/api/orders',
  '/api/dashboard/cashier'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache API routes
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('Caching API routes');
        return Promise.all(
          API_ROUTES.map(async route => {
            try {
              const response = await fetch(`http://localhost:5001${route}`, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json'
                }
              });
                if (response.ok) {
                  return cache.put(route, response);
              }
            } catch (error) {
              console.warn(`Failed to cache ${route}:`, error);
              // Don't throw the error, just log it
              return Promise.resolve();
                }
              })
        );
      })
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => 
              cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME
            )
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
      // Claim clients
      self.clients.claim()
    ])
  );
});

// Helper function to check if URL should be cached
const shouldCache = (url) => {
  const urlObj = new URL(url);
  // Skip caching for chrome-extension URLs and other non-HTTP(S) schemes
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    return false;
  }
  // Skip caching for certain file types
  if (url.match(/\.(mp4|webm|ogg|mp3|wav|pdf|doc|docx|xls|xlsx)$/i)) {
    return false;
  }
  return true;
};

// Fetch event - handle offline requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and non-cacheable URLs
  if (event.request.method !== 'GET' || !shouldCache(event.request.url)) {
    return;
  }

  // Skip WebSocket upgrade requests
  if (event.request.headers.get('upgrade') === 'websocket') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          // Cache successful responses
          if (response.ok) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          // On network failure, try to get from cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache, return offline response
          return new Response(
            JSON.stringify({
              error: 'You are offline and the requested data is not cached.'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Handle static asset requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(async (networkResponse) => {
            if (networkResponse.ok && shouldCache(event.request.url)) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response(
              'Network error happened',
              {
                status: 408,
                headers: { 'Content-Type': 'text/plain' },
              }
            );
          });
      })
  );
});

// Handle sync events for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Function to sync offline orders
async function syncOrders() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const offlineOrders = await cache.match('/api/offline-orders');
    
    if (offlineOrders) {
      const orders = await offlineOrders.json();
      
      // Try to sync each order
      await Promise.all(
        orders.map(async (order) => {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
                'Content-Type': 'application/json'
          },
              body: JSON.stringify(order)
        });
        
        if (response.ok) {
              // Remove synced order from offline storage
              const updatedOrders = orders.filter(o => o.id !== order.id);
              await cache.put(
                '/api/offline-orders',
                new Response(JSON.stringify(updatedOrders))
              );
        }
      } catch (error) {
            console.error(`Failed to sync order ${order.id}:`, error);
      }
        })
      );
    }
  } catch (error) {
    console.error('Error syncing orders:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Order',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('New Order', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/orders')
    );
  }
}); 