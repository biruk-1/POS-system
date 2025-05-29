import { 
  userOperations, 
  orderOperations, 
  receiptOperations, 
  settingsOperations,
  menuOperations,
  tableOperations,
  reportOperations,
  syncOperations
} from './db';
import axios from 'axios';
import { openDB, deleteDB } from 'idb';

// Storage keys
const ORDERS_STORAGE_KEY = 'pos_offline_orders';
const RECEIPTS_STORAGE_KEY = 'pos_offline_receipts';
const SYNC_QUEUE_KEY = 'pos_offline_sync_queue';
const USER_DATA_KEY = 'pos_user_data';
const MENU_ITEMS_KEY = 'pos_menu_items';
const USERS_DATA_KEY = 'pos_users_data';
const WAITERS_DATA_KEY = 'pos_waiters_data'; // New key for waiters
const BILL_REQUESTS_KEY = 'pos_bill_requests'; // New key for bill requests
const SETTINGS_KEY = 'pos_settings';
const TABLES_DATA_KEY = 'pos_tables_data';
const REPORTS_DATA_KEY = 'pos_reports_data';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds

const DB_NAME = 'pos-offline-db';
const DB_VERSION = 2;

// Add connection management
let dbConnection = null;
let connectionPromise = null;
let isInitializing = false;

const getConnection = () => {
  return new Promise((resolve, reject) => {
    console.log('Opening new database connection...');
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Error getting database connection:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('menuItems')) {
        db.createObjectStore('menuItems', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('tables')) {
        db.createObjectStore('tables', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingSync')) {
        db.createObjectStore('pendingSync', { keyPath: 'id' });
      }
    };
  });
};

// Helper function to safely execute database operations with retries
const executeDbOperation = async (operation, storeName, mode = 'readonly') => {
  let retries = 3;
  while (retries > 0) {
    try {
      const db = await getConnection();
      const tx = db.transaction(storeName, mode);
      const result = await operation(tx.store);
      await tx.done;
      return result;
    } catch (error) {
      console.error(`Database operation failed (${retries} retries left):`, error);
      retries--;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Reset connection on error
      dbConnection = null;
    }
  }
};

// Storage quota management
const checkStorageQuota = async () => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const percentageUsed = (estimate.usage / estimate.quota) * 100;
      console.log(`Storage quota used: ${percentageUsed.toFixed(2)}%`);
      
      if (percentageUsed > 90) {
        await cleanupStorage();
      }
      
      return percentageUsed < 95;
    }
    return true;
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return true;
  }
};

// Cleanup old data
const cleanupStorage = async () => {
  try {
    const db = await getConnection();
    
    const tx = db.transaction('syncQueue', 'readwrite');
    const syncStore = tx.objectStore('syncQueue');
    const oldItems = await syncStore.index('created_at').getAll(IDBKeyRange.upperBound(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days old
    ));
    
    for (const item of oldItems) {
      await syncStore.delete(item.id);
    }
    
    await tx.done;
    console.log('Cleaned up old sync queue items');
  } catch (error) {
    console.error('Error cleaning up storage:', error);
  }
};

// Timeout handling for database operations
const withTimeout = (promise, timeout = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeout)
    )
  ]);
};

// Initialize offline storage
export const initializeOfflineStorage = async () => {
  try {
    console.log('Initializing offline storage...');
    const db = await getConnection();
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing offline storage:', error);
    throw error;
  }
};

// Initialize offline event listeners
export const initOfflineListeners = (onlineCallback, offlineCallback) => {
  if (!window._listenersInitialized) {
    initializeOfflineStorage();
    
    window.addEventListener('online', onlineCallback);
    window.addEventListener('offline', offlineCallback);
    
    window._listenersInitialized = true;
  }
  
  return () => {
    window.removeEventListener('online', onlineCallback);
    window.removeEventListener('offline', offlineCallback);
    window._listenersInitialized = false;
  };
};

// User data operations
export const saveUserData = async (userData) => {
  try {
    const db = await getConnection();
    
    const userToSave = {
      id: userData.id,
      username: userData.username,
      password: userData.password,
      role: userData.role,
      name: userData.name,
      phone_number: userData.phone_number,
      pin_code: userData.pin_code,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };
    
    await db.put('users', userToSave);
    
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userToSave));
    
    const currentUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    const updatedUsers = currentUsers.filter(u => u.id !== userData.id);
    updatedUsers.push(userToSave);
    localStorage.setItem(USERS_DATA_KEY, JSON.stringify(updatedUsers));
    
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
};

export const getUserData = async (userId) => {
  try {
    const db = await getConnection();
    const user = await db.get('users', userId);
    
    if (!user) {
      const cachedUser = JSON.parse(localStorage.getItem(USER_DATA_KEY) || 'null');
      if (cachedUser && cachedUser.id === userId) {
        return cachedUser;
      }
    }
    
    return user;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Initialize offline functionality
export const initializeOfflineFunctionality = async () => {
  try {
    if (window._dbInitialized) {
      console.log('Offline functionality already initialized');
      return true;
    }

    console.log('Initializing offline functionality...');
    await initializeOfflineStorage();
    return true;
  } catch (error) {
    console.error('Failed to initialize offline functionality:', error);
    return false;
  }
};

// Get user by username
export const getUserByUsername = async (username) => {
  try {
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    const userFromLocalStorage = cachedUsers.find(user => user.username === username);
    if (userFromLocalStorage) {
      console.log('User found in localStorage');
      return userFromLocalStorage;
    }
    
    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('username');
    
    const user = await index.get(username);
    console.log('User found in IndexedDB:', user);
    return user;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return cachedUsers.find(user => user.username === username);
  }
};

// Save all users data
export const saveUsersData = async (users) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    
    // Filter out users with duplicate phone numbers, keeping the most recent one
    const uniqueUsers = users.reduce((acc, user) => {
      if (!user.phone_number || user.phone_number === '') {
        acc.push(user);
        return acc;
      }
      
      const existingUserIndex = acc.findIndex(u => u.phone_number === user.phone_number);
      if (existingUserIndex === -1) {
        acc.push(user);
      } else if (new Date(user.last_login || 0) > new Date(acc[existingUserIndex].last_login || 0)) {
        acc[existingUserIndex] = user;
      }
      return acc;
    }, []);
    
    await Promise.all(uniqueUsers.map(user => {
      return store.put({
        id: user.id,
        username: user.username,
        role: user.role,
        pin_code: user.pin_code,
        phone_number: user.phone_number || '',
        name: user.name || '',
        created_at: user.created_at || new Date().toISOString(),
        last_login: user.last_login || new Date().toISOString()
      });
    }));
    
    await tx.done;
    localStorage.setItem(USERS_DATA_KEY, JSON.stringify(uniqueUsers));
    return true;
  } catch (error) {
    console.error('Error saving users data:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem(USERS_DATA_KEY, JSON.stringify(users));
      return true;
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError);
      return false;
    }
  }
};

// Get all users data
export const getUsersData = async () => {
  try {
    const db = await getConnection();
    const users = await db.getAll('users');
    
    if (users.length === 0) {
      return JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    }
    
    return users;
  } catch (error) {
    console.error('Error getting users data:', error);
    return JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
  }
};

// Save waiters data
export const saveWaitersData = async (waiters) => {
  try {
    const db = await getConnection();
    
    await Promise.all(waiters.map(waiter => 
      db.put('waiters', {
        id: waiter.id,
        name: waiter.name,
        username: waiter.username,
        role: 'waiter',
        created_at: new Date().toISOString()
      })
    ));
    
    localStorage.setItem(WAITERS_DATA_KEY, JSON.stringify(waiters));
    return true;
  } catch (error) {
    console.error('Error saving waiters data:', error);
    return false;
  }
};

// Get waiters data
export const getOfflineWaiters = async () => {
  try {
    const db = await getConnection();
    const waiters = await db.getAll('waiters');
    
    if (waiters.length === 0) {
      return JSON.parse(localStorage.getItem(WAITERS_DATA_KEY) || '[]');
    }
    
    return waiters;
  } catch (error) {
    console.error('Error getting offline waiters:', error);
    return JSON.parse(localStorage.getItem(WAITERS_DATA_KEY) || '[]');
  }
};

// Save bill requests
export const saveBillRequestOffline = async (billRequest) => {
  try {
    const db = await getConnection();
    
    const billToSave = {
      id: billRequest.id || Date.now().toString(),
      order_id: billRequest.order_id,
      table_number: billRequest.table_number,
      status: billRequest.status || 'pending',
      requested_at: new Date().toISOString(),
      isOffline: true
    };
    
    await db.put('billRequests', billToSave);
    
    await db.add('syncQueue', {
      type: 'bill_request',
      data: billToSave,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    
    localStorage.setItem(BILL_REQUESTS_KEY, JSON.stringify(billToSave));
    return billToSave.id;
  } catch (error) {
    console.error('Error saving bill request offline:', error);
    throw error;
  }
};

// Get bill requests
export const getOfflineBillRequests = async () => {
  try {
    const db = await getConnection();
    return await db.getAll('billRequests');
  } catch (error) {
    console.error('Error getting offline bill requests:', error);
    return JSON.parse(localStorage.getItem(BILL_REQUESTS_KEY) || '[]');
  }
};

// Save settings
export const saveSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Get settings
export const getSettings = () => {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
};

// Orders operations
export const saveOrderOffline = async (orderData) => {
  try {
    const db = await getConnection();
    
    const orderToSave = {
      id: orderData.id || Date.now().toString(),
      items: orderData.items.map(item => ({
        ...item,
        price: parseFloat(item.price || 0),
        quantity: parseInt(item.quantity || 0)
      })),
      total_amount: parseFloat(orderData.total || orderData.total_amount || 0),
      waiter_id: orderData.waiter_id,
      status: orderData.status || 'pending',
      created_at: orderData.created_at || new Date().toISOString(),
      isOffline: true
    };
    
    await db.put('orders', orderToSave);
    
    await db.add('syncQueue', {
      type: 'order',
      data: orderToSave,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    
    return orderToSave.id;
  } catch (error) {
    console.error('Error saving order offline:', error);
    throw error;
  }
};

export const getOfflineOrders = async () => {
  try {
    const db = await getConnection();
    const orders = await db.getAll('orders');
    return orders || [];
  } catch (error) {
    console.error('Error getting orders from IndexedDB:', error);
    throw new Error('Failed to load orders from offline storage');
  }
};

// Receipts operations
export const saveReceiptOffline = async (receiptData) => {
  try {
    const db = await getConnection();
    
    const receiptId = await db.add('receipts', {
      ...receiptData,
      created_at: new Date().toISOString(),
      isOffline: true
    });
    
    await db.add('syncQueue', {
      type: 'receipt',
      data: receiptData,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    
    return receiptId;
  } catch (error) {
    console.error('Error saving receipt offline:', error);
    throw error;
  }
};

export const getOfflineReceipts = async () => {
  try {
    const db = await getConnection();
    return await db.getAll('receipts');
  } catch (error) {
    console.error('Error getting offline receipts:', error);
    throw error;
  }
};

// Menu items operations
export const saveMenuItemsOffline = async (items) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('menuItems', 'readwrite');
    const store = tx.objectStore('menuItems');
    
    // Clear existing items
    await store.clear();
    
    // Add new items
    await Promise.all(items.map(item => store.put(item)));
    
    await tx.done;
    return true;
  } catch (error) {
    console.error('Error saving menu items to IndexedDB:', error);
    throw new Error('Failed to save menu items to offline storage');
  }
};

export const getMenuItemsOffline = async () => {
  try {
    const db = await getConnection();
    const items = await db.getAll('menuItems');
    return items || [];
  } catch (error) {
    console.error('Error getting menu items from IndexedDB:', error);
    throw new Error('Failed to load menu items from offline storage');
  }
};

// Tables operations
export const saveTablesOffline = async (tables) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('tables', 'readwrite');
    const store = tx.objectStore('tables');
    
    // Clear existing tables
    await store.clear();
    
    // Add new tables
    await Promise.all(tables.map(table => store.put(table)));
    
    await tx.done;
    return true;
  } catch (error) {
    console.error('Error saving tables to IndexedDB:', error);
    throw new Error('Failed to save tables to offline storage');
  }
};

export const getTablesOffline = async () => {
  try {
    const db = await getConnection();
    const tables = await db.getAll('tables');
    return tables || [];
  } catch (error) {
    console.error('Error getting tables from IndexedDB:', error);
    throw new Error('Failed to load tables from offline storage');
  }
};

// Dashboard data operations
export const saveDashboardDataOffline = async (data) => {
  try {
    await reportOperations.saveReport({
      id: 'dashboard',
      type: 'dashboard',
      data,
      date: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving dashboard data offline:', error);
    return false;
  }
};

export const getOfflineDashboardData = async () => {
  try {
    const report = await reportOperations.getReport('dashboard');
    return report?.data || null;
  } catch (error) {
    console.error('Error getting dashboard data offline:', error);
    return null;
  }
};

// Sync operations
export const syncWithServer = async () => {
  if (!navigator.onLine) {
    console.log('Device is offline, skipping sync');
    return { success: false, message: 'Device is offline' };
  }

  try {
    const db = await getConnection();
    const pendingItems = await db.getAllFromIndex('syncQueue', 'status', 'pending');
    
    if (pendingItems.length === 0) {
      console.log('No pending items to sync');
      return { success: true, message: 'No pending items to sync' };
    }

    console.log(`Found ${pendingItems.length} items to sync`);
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No auth token found, skipping sync');
      return { success: false, message: 'No auth token found' };
    }

    // Verify token is valid before proceeding
    try {
      const baseURL = 'http://localhost:5001';
      const verifyResponse = await fetch(`${baseURL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!verifyResponse.ok) {
        console.log('Token verification failed, skipping sync');
        return { success: false, message: 'Invalid token' };
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      return { success: false, message: 'Error verifying token' };
    }
    
    for (const item of pendingItems) {
      try {
        let response;
        const baseURL = 'http://localhost:5001';
        
        if (item.type === 'order') {
          response = await fetch(`${baseURL}/api/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              ...item.data,
              total_amount: parseFloat(item.data.total || 0),
              items: item.data.items.map(i => ({
                ...i,
                price: parseFloat(i.price || 0),
                quantity: parseInt(i.quantity || 0)
              }))
            })
          });
        } else if (item.type === 'order_status_update') {
          response = await fetch(`${baseURL}/api/orders/${item.data.order_id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              status: item.data.status
            })
          });
        } else if (item.type === 'receipt') {
          response = await fetch(`${baseURL}/api/receipts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(item.data)
          });
        } else if (item.type === 'bill_request') {
          response = await fetch(`${baseURL}/api/bill-requests`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(item.data)
          });
        }
        
        if (response && response.ok) {
          const responseData = await response.json();
          
          await db.put('syncQueue', {
            ...item,
            status: 'synced',
            synced_at: new Date().toISOString()
          });
          
          if (item.type === 'order') {
            await db.put('orders', {
              ...item.data,
              ...responseData,
              isOffline: false,
              synced_at: new Date().toISOString()
            });
          } else if (item.type === 'order_status_update') {
            const order = await db.get('orders', item.data.order_id);
            if (order) {
              await db.put('orders', {
                ...order,
                status: item.data.status,
                isOffline: false,
                synced_at: new Date().toISOString()
              });
            }
          } else if (item.type === 'bill_request') {
            await db.put('billRequests', {
              ...item.data,
              ...responseData,
              isOffline: false,
              synced_at: new Date().toISOString()
            });
          }
          
          console.log(`Successfully synced ${item.type} with ID: ${item.data.id || item.data.order_id}`);
        } else {
          throw new Error(`Server responded with status: ${response?.status}`);
        }
      } catch (error) {
        console.error(`Error syncing ${item.type}:`, error);
        
        // Only increment retry count if we have a network error
        const isNetworkError = error.message.includes('Failed to fetch') || 
                             error.message.includes('NetworkError') ||
                             error.message.includes('ERR_INTERNET_DISCONNECTED');
        
        if (isNetworkError) {
          await db.put('syncQueue', {
            ...item,
            retry_count: (item.retry_count || 0) + 1,
            last_error: error.message,
            last_retry: new Date().toISOString()
          });
        }
      }
    }
    
    return { success: true, message: `Synced ${pendingItems.length} items` };
  } catch (error) {
    console.error('Error in sync process:', error);
    return { success: false, message: error.message };
  }
};

// Initialize sync interval
export const initializeSyncInterval = () => {
  if (navigator.onLine) {
    console.log('Initial sync on startup');
    syncWithServer().catch(console.error);
    
    // Check for pending items every 5 minutes when online
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        console.log('Running scheduled sync');
        syncWithServer().catch(console.error);
      } else {
        console.log('Device is offline, skipping scheduled sync');
      }
    }, 5 * 60 * 1000);

    // Clean up interval when window is unloaded
    window.addEventListener('unload', () => {
      clearInterval(syncInterval);
    });
  }
};

// Check if online
export const isOnline = () => {
  return navigator.onLine;
};

// Get pending sync count
export const getPendingSyncCount = async () => {
  try {
    const pendingItems = await syncOperations.getPendingSyncItems();
    return pendingItems.length;
  } catch (error) {
    console.error('Error getting pending sync count:', error);
    return 0;
  }
};

// Get cashier by phone
export const getCashierByPhone = async (phoneNumber) => {
  try {
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    const cashierFromLocalStorage = cachedUsers.find(user => 
      user.phone_number === phoneNumber && user.role === 'cashier'
    );
    
    if (cashierFromLocalStorage) {
      console.log('Cashier found in localStorage');
      return cashierFromLocalStorage;
    }
    
    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('phone_number');
    
    const user = await index.get(phoneNumber);
    if (user && user.role === 'cashier') {
      console.log('Cashier found in IndexedDB:', user);
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cashier by phone:', error);
    return cachedUsers.find(user => 
      user.phone_number === phoneNumber && user.role === 'cashier'
    );
  }
};

// Save user for offline access
export const saveUserForOffline = async (userData) => {
  try {
    console.log('Saving user data for offline access:', userData);
    
    if (userData.role === 'cashier' && !userData.phone_number) {
      throw new Error('Phone number is required for cashier');
    }

    const userToSave = {
      id: userData.id,
      username: userData.username || null,
      password: userData.password,
      role: userData.role,
      name: userData.name || '',
      phone_number: userData.phone_number || '',
      pin_code: userData.pin_code || '',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };

    // Save to IndexedDB first
    await executeDbOperation(
      async (store) => {
        await store.put(userToSave);
      },
      'users',
      'readwrite'
    );

    // Then save to localStorage as backup
    try {
      const currentUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
      const updatedUsers = currentUsers.filter(u => {
        if (userData.role === 'cashier') {
          return u.id !== userData.id && u.phone_number !== userData.phone_number;
        }
        return u.id !== userData.id;
      });
      
      updatedUsers.push(userToSave);
      localStorage.setItem(USERS_DATA_KEY, JSON.stringify(updatedUsers));
      
      if (userData.role === 'cashier') {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userToSave));
      }
      
      console.log('Saved user data to localStorage');
      return userToSave;
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError);
      // Continue even if localStorage fails since we have IndexedDB
      return userToSave;
    }
  } catch (error) {
    console.error('Error in saveUserForOffline:', error);
    throw error;
  }
};

// Get user by phone
export const getUserByPhone = async (phone) => {
  try {
    console.log('Getting user by phone:', phone);
    
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    const userFromLocalStorage = cachedUsers.find(user => user.phone_number === phone);
    if (userFromLocalStorage) {
      console.log('User found in localStorage');
      return userFromLocalStorage;
    }

    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    
    try {
      const index = store.index('phone_number');
      const user = await index.get(phone);
      console.log('User found in IndexedDB:', user);
      return user;
    } catch (indexError) {
      console.error('Index lookup failed, falling back to full scan:', indexError);
      const allUsers = await store.getAll();
      const user = allUsers.find(u => u.phone_number === phone);
      console.log('User found in full scan:', user);
      return user;
    }
  } catch (error) {
    console.error('Error getting user by phone:', error);
    return null;
  }
};

// Check if user exists
export const checkUserExists = async (phoneNumber) => {
  try {
    const db = await getConnection();
    const users = await db.getAll('users');
    
    const existsInIndexedDB = users.some(user => 
      user.phone_number === phoneNumber && user.role === 'cashier'
    );
    
    if (existsInIndexedDB) return true;
    
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    return cachedUsers.some(user => 
      user.phone_number === phoneNumber && user.role === 'cashier'
    );
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};

// Reset database
export const resetDatabase = async () => {
  try {
    console.log('Resetting database...');
    await deleteDB(DB_NAME);
    console.log('Database deleted successfully');
    
    // Reinitialize the database
    await initializeOfflineStorage();
    console.log('Database reinitialized successfully');
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    return false;
  }
};

// Update order status offline
export const updateOrderStatusOffline = async (orderId, newStatus) => {
  try {
    const db = await getConnection();
    const order = await db.get('orders', orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    const updatedOrder = {
      ...order,
      status: newStatus,
      updated_at: new Date().toISOString(),
      isOffline: true
    };

    // Update the order in IndexedDB
    await db.put('orders', updatedOrder);

    // Add to sync queue
    await db.add('syncQueue', {
      type: 'order_status_update',
      data: {
        order_id: orderId,
        status: newStatus,
        updated_at: new Date().toISOString()
      },
      status: 'pending',
      created_at: new Date().toISOString()
    });

    return updatedOrder;
  } catch (error) {
    console.error('Error updating order status offline:', error);
    throw error;
  }
};

// Get order by ID (works both online and offline)
export const getOrderById = async (orderId) => {
  try {
    const db = await getConnection();
    const order = await db.get('orders', orderId);
    
    if (order) {
      return order;
    }

    // If not found in IndexedDB, try to fetch from server if online
    if (navigator.onLine) {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await fetch(`http://localhost:5001/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const orderData = await response.json();
        // Cache the order for offline use
        await db.put('orders', {
          ...orderData,
          isOffline: false
        });
        return orderData;
      }
    }

    throw new Error('Order not found');
  } catch (error) {
    console.error('Error getting order by ID:', error);
    throw error;
  }
}; 