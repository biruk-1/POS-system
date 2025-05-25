const CACHE_NAME = 'pos-cache-v1';
const OFFLINE_URL = '/offline.html';
const API_CACHE_NAME = 'pos-api-cache-v1';
const AUTH_CACHE_NAME = 'pos-auth-cache-v1';

const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/offline.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper function to check if a request is a login request
const isLoginRequest = (url) => {
  return url.includes('/api/auth/login') || 
         url.includes('/api/auth/pin-login') || 
         url.includes('/api/auth/cashier-login');
};

// Helper function to check if a request is for a static asset
const isStaticAsset = (url) => {
  return STATIC_RESOURCES.some(asset => url.includes(asset));
};

// Helper function to check if a request is for an API endpoint
const isApiRequest = (url) => {
  return url.includes('/api/');
};

// Helper function to get cached credentials
const getCachedCredentials = async () => {
  try {
    const cache = await caches.open(AUTH_CACHE_NAME);
    const response = await cache.match('/api/auth/login');
    if (response) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error getting cached credentials:', error);
    return null;
  }
};

// Fetch event - handle offline/online requests
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Return a custom offline response for API requests
          return new Response(JSON.stringify({ error: 'You are offline' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Handle static resources
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If offline and requesting a page, return offline page
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Helper function to sync orders
const syncOrders = async () => {
  try {
    const db = await openDB('pos-system-db', 1);
    const pendingOrders = await db.getAllFromIndex('syncQueue', 'status', 'pending');
    
    for (const order of pendingOrders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(order.data)
        });
        
        if (response.ok) {
          await db.put('syncQueue', {
            ...order,
            status: 'synced'
          });
        }
      } catch (error) {
        console.error('Error syncing order:', error);
      }
    }
  } catch (error) {
    console.error('Error in sync process:', error);
  }
};

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