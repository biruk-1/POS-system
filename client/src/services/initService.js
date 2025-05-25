import { initializeOfflineStorage } from './offlineService';

// Register service worker
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered with scope:', registration.scope);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Check if we've shown the update notification recently
            const lastUpdateCheck = localStorage.getItem('lastUpdateCheck');
            const now = Date.now();
            
            // Only show update notification if it's been more than 1 hour since last check
            if (!lastUpdateCheck || (now - parseInt(lastUpdateCheck)) > 3600000) {
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
              localStorage.setItem('lastUpdateCheck', now.toString());
            }
          }
        });
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Initialize offline functionality
export const initializeOfflineFunctionality = async () => {
  try {
    // Register service worker
    const swRegistration = await registerServiceWorker();
    
    // Initialize IndexedDB
    const dbInitialized = await initializeOfflineStorage();
    
    if (!dbInitialized) {
      console.error('Failed to initialize IndexedDB');
      return false;
    }
    
    // Set up online/offline handlers
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Request notification permission
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing offline functionality:', error);
    return false;
  }
};

// Handle online status
const handleOnline = async () => {
  console.log('Application is online');
  
  // Trigger sync
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      await navigator.serviceWorker.ready;
      await navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_ORDERS'
      });
    } catch (error) {
      console.error('Error triggering sync:', error);
    }
  }
};

// Handle offline status
const handleOffline = () => {
  console.log('Application is offline');
};

// Request background sync
export const requestBackgroundSync = async () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-orders');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Error registering background sync:', error);
    }
  }
};

// Request push notification subscription
export const requestPushSubscription = async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY' // Replace with your VAPID public key
      });
      console.log('Push notification subscription:', subscription);
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }
  return null;
}; 