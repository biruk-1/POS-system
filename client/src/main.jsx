import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import './index.css';

// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
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
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

// Handle offline/online events
window.addEventListener('online', () => {
  console.log('Application is online');
  // Trigger sync
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_ORDERS'
    });
  }
});

window.addEventListener('offline', () => {
  console.log('Application is offline');
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
); 