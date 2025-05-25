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

// Offline service for handling operations when network is down
// Storage keys
const ORDERS_STORAGE_KEY = 'pos_offline_orders';
const RECEIPTS_STORAGE_KEY = 'pos_offline_receipts';
const SYNC_QUEUE_KEY = 'pos_offline_sync_queue';
const USER_DATA_KEY = 'pos_user_data';
const MENU_ITEMS_KEY = 'pos_menu_items';
const USERS_DATA_KEY = 'pos_users_data';
const SETTINGS_KEY = 'pos_settings';
const TABLES_DATA_KEY = 'pos_tables_data';
const REPORTS_DATA_KEY = 'pos_reports_data';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds

const DB_NAME = 'pos-system-db';
const DB_VERSION = 1;

// Add connection management
let dbConnection = null;
let connectionPromise = null;

const getConnection = async () => {
  try {
    // Return existing connection if valid
    if (dbConnection && dbConnection.version) {
      return dbConnection;
    }

    // Return existing promise if connection is in progress
    if (connectionPromise) {
      return await connectionPromise;
    }

    // Create new connection
    connectionPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        console.log('Creating/upgrading database stores...');
        
        // Create users store if it doesn't exist
        if (!db.objectStoreNames.contains('users')) {
          console.log('Creating users store');
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('phone_number', 'phone_number', { unique: true });
          userStore.createIndex('role', 'role', { unique: false });
        }

        // Create other stores
        ['orders', 'receipts', 'syncQueue'].forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          }
        });
      },
      blocked() {
        console.log('Database blocked, waiting for other connections to close...');
      },
      blocking() {
        console.log('Database blocking other connections...');
        dbConnection?.close();
      },
      terminated() {
        console.log('Database connection terminated');
        dbConnection = null;
        connectionPromise = null;
      }
    });

    dbConnection = await connectionPromise;
    connectionPromise = null;
    return dbConnection;
  } catch (error) {
    console.error('Error getting database connection:', error);
    dbConnection = null;
    connectionPromise = null;
    throw error;
  }
};

// Add storage quota management
const checkStorageQuota = async () => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const percentageUsed = (estimate.usage / estimate.quota) * 100;
      console.log(`Storage quota used: ${percentageUsed.toFixed(2)}%`);
      
      // If storage is more than 90% full, try to clean up
      if (percentageUsed > 90) {
        await cleanupStorage();
      }
      
      return percentageUsed < 95; // Return true if we have enough space
    }
    return true; // If we can't check quota, assume we have space
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return true; // Assume we have space if we can't check
  }
};

// Cleanup old data
const cleanupStorage = async () => {
  try {
    const db = await getConnection();
    
    // Clean up old sync queue items
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

// Add timeout handling for database operations
const withTimeout = (promise, timeout = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeout)
    )
  ]);
};

// Initialize offline storage with better connection handling
export const initializeOfflineStorage = async () => {
  try {
    console.log('Initializing offline storage...');
    const db = await getConnection();
    window._dbInitialized = true;
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing offline storage:', error);
    window._dbInitialized = false;
    throw error;
  }
};

// Initialize offline event listeners
export const initOfflineListeners = (onlineCallback, offlineCallback) => {
  // Only initialize if not already initialized
  if (!window._listenersInitialized) {
    initializeOfflineStorage();
    
    window.addEventListener('online', onlineCallback);
    window.addEventListener('offline', offlineCallback);
    
    window._listenersInitialized = true;
  }
  
  // Return cleanup function
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
    
    // Save to users store with all necessary fields
    const userToSave = {
      id: userData.id,
      username: userData.username,
      password: userData.password, // Store password for offline login
      role: userData.role,
      name: userData.name,
      phone_number: userData.phone_number,
      pin_code: userData.pin_code,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };
    
    // Save to IndexedDB
    await db.put('users', userToSave);
    
    // Also save to localStorage for quick access
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userToSave));
    
    // Update the users list in localStorage
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
      // Try to get from localStorage as fallback
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

// Helper function to get database instance
const getDB = async () => {
  try {
    if (window._db) {
      return window._db;
    }
    return await initializeOfflineStorage();
  } catch (error) {
    console.error('Error getting database:', error);
    throw error;
  }
};

// Update getUserByUsername to be more efficient
export const getUserByUsername = async (username) => {
  try {
    // First try localStorage for faster access
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    const userFromLocalStorage = cachedUsers.find(user => user.username === username);
    if (userFromLocalStorage) {
      console.log('User found in localStorage');
      return userFromLocalStorage;
    }
    
    // If not in localStorage, try IndexedDB
    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('username');
    
    if (!index) {
      console.error('Username index not found, falling back to localStorage');
      return userFromLocalStorage;
    }
    
    const user = await index.get(username);
    console.log('User found in IndexedDB:', user);
    return user;
  } catch (error) {
    console.error('Error getting user by username:', error);
    // Fallback to localStorage
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    return cachedUsers.find(user => user.username === username);
  }
};

// Save all users data for admin functionality
export const saveUsersData = async (users) => {
  try {
    const db = await getConnection();
    
    // Save each user to IndexedDB
    await Promise.all(users.map(user => 
      db.put('users', {
        id: user.id,
        username: user.username,
        role: user.role,
        pin_code: user.pin_code,
        phone_number: user.phone_number,
        created_at: new Date().toISOString()
      })
    ));
    
    // Also save to localStorage for quick access
    localStorage.setItem(USERS_DATA_KEY, JSON.stringify(users));
    return true;
  } catch (error) {
    console.error('Error saving users data:', error);
    return false;
  }
};

// Get all users data for admin functionality
export const getUsersData = async () => {
  try {
    const db = await getConnection();
    const users = await db.getAll('users');
    
    if (users.length === 0) {
      // Try to get from localStorage as fallback
      return JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    }
    
    return users;
  } catch (error) {
    console.error('Error getting users data:', error);
    return JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
  }
};

// Save settings for admin functionality
export const saveSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Get settings for admin functionality
export const getSettings = () => {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
};

// Orders operations
export const saveOrderOffline = async (orderData) => {
  try {
    const db = await getConnection();
    
    // Ensure orderData has an ID and proper structure
    const orderToSave = {
      id: orderData.id || Date.now().toString(),
      items: orderData.items,
      total: orderData.total,
      waiter_id: orderData.waiter_id,
      status: orderData.status || 'pending',
      created_at: orderData.created_at || new Date().toISOString(),
      isOffline: true
    };
    
    // Save to orders store
    await db.put('orders', orderToSave);
    
    // Add to sync queue
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
    return await db.getAll('orders');
  } catch (error) {
    console.error('Error getting offline orders:', error);
    throw error;
  }
};

// Receipts operations
export const saveReceiptOffline = async (receiptData) => {
  try {
    const db = await getConnection();
    
    // Save to receipts store
    const receiptId = await db.add('receipts', {
      ...receiptData,
      created_at: new Date().toISOString(),
      isOffline: true
    });
    
    // Add to sync queue
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
    await Promise.all(items.map(item => menuOperations.saveMenuItem(item)));
    return true;
  } catch (error) {
    console.error('Error saving menu items offline:', error);
    return false;
  }
};

export const getMenuItemsOffline = async () => {
  try {
    return await menuOperations.getAllMenuItems();
  } catch (error) {
    console.error('Error getting menu items offline:', error);
    return [];
  }
};

// Tables operations
export const saveTablesOffline = async (tables) => {
  try {
    await Promise.all(tables.map(table => tableOperations.saveTable(table)));
    return true;
  } catch (error) {
    console.error('Error saving tables offline:', error);
    return false;
  }
};

export const getTablesOffline = async () => {
  try {
    return await tableOperations.getAllTables();
  } catch (error) {
    console.error('Error getting tables offline:', error);
    return [];
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
  try {
    const db = await getConnection();
    const pendingItems = await db.getAllFromIndex('syncQueue', 'status', 'pending');
    
    for (const item of pendingItems) {
      try {
        let response;
        const token = localStorage.getItem('token');
        
        if (item.type === 'order') {
          response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(item.data)
          });
        } else if (item.type === 'receipt') {
          response = await fetch('/api/receipts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(item.data)
          });
        }
        
        if (response && response.ok) {
          // Update sync queue status
          await db.put('syncQueue', {
            ...item,
            status: 'synced',
            synced_at: new Date().toISOString()
          });
          
          // If it's an order, update the order status
          if (item.type === 'order') {
            await db.put('orders', {
              ...item.data,
              isOffline: false,
              synced_at: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error(`Error syncing ${item.type}:`, error);
        
        // Update retry count
        await db.put('syncQueue', {
          ...item,
          retry_count: (item.retry_count || 0) + 1,
          last_error: error.message,
          last_retry: new Date().toISOString()
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in sync process:', error);
    throw error;
  }
};

// Initialize sync interval when online
export const initializeSyncInterval = () => {
  if (navigator.onLine) {
    // Initial sync
    syncWithServer().catch(console.error);
    
    // Set up periodic sync
    setInterval(() => {
      if (navigator.onLine) {
        syncWithServer().catch(console.error);
      }
    }, 5 * 60 * 1000); // Sync every 5 minutes
  }
};

// Helper function to check if we're online
export const isOnline = () => {
  return navigator.onLine;
};

// Helper function to get pending sync count
export const getPendingSyncCount = async () => {
  try {
    const pendingItems = await syncOperations.getPendingSyncItems();
    return pendingItems.length;
  } catch (error) {
    console.error('Error getting pending sync count:', error);
    return 0;
  }
};

// Add a new function specifically for cashier login
export const getCashierByPhone = async (phoneNumber) => {
  try {
    // First try localStorage for faster access
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    const cashierFromLocalStorage = cachedUsers.find(user => 
      user.phone_number === phoneNumber && user.role === 'cashier'
    );
    
    if (cashierFromLocalStorage) {
      console.log('Cashier found in localStorage');
      return cashierFromLocalStorage;
    }
    
    // If not in localStorage, try IndexedDB
    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('phone_number');
    
    if (!index) {
      console.error('Phone number index not found, falling back to localStorage');
      return cashierFromLocalStorage;
    }
    
    const user = await index.get(phoneNumber);
    if (user && user.role === 'cashier') {
      console.log('Cashier found in IndexedDB:', user);
      return user;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cashier by phone:', error);
    // Fallback to localStorage
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    return cachedUsers.find(user => 
      user.phone_number === phoneNumber && user.role === 'cashier'
    );
  }
};

// Save user data for offline access
export const saveUserForOffline = async (userData) => {
  try {
    console.log('Saving user data for offline access:', userData);
    
    // Validate required fields for cashier
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

    // Save to localStorage first
    try {
      // Get existing users
      const currentUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
      
      // Remove existing user if present (by id and phone number for cashiers)
      const updatedUsers = currentUsers.filter(u => {
        if (userData.role === 'cashier') {
          return u.id !== userData.id && u.phone_number !== userData.phone_number;
        }
        return u.id !== userData.id;
      });
      
      // Add new user data
      updatedUsers.push(userToSave);
      
      // Save updated users list
      localStorage.setItem(USERS_DATA_KEY, JSON.stringify(updatedUsers));
      
      // For cashiers, also save as current user
      if (userData.role === 'cashier') {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userToSave));
      }
      
      console.log('Saved user data to localStorage');
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError);
      throw localStorageError; // Rethrow as we need at least one storage to work
    }

    // Save to IndexedDB with retries
    let retries = 3;
    while (retries > 0) {
      try {
        const db = await getConnection();
        const tx = db.transaction('users', 'readwrite');
        
        // For cashiers, also update by phone number index
        if (userData.role === 'cashier') {
          const index = tx.store.index('phone_number');
          const existingByPhone = await index.get(userData.phone_number);
          if (existingByPhone && existingByPhone.id !== userData.id) {
            await tx.store.delete(existingByPhone.id);
          }
        }
        
        await tx.store.put(userToSave);
        await tx.done;
        console.log('User saved successfully to IndexedDB');
        return true;
      } catch (dbError) {
        console.error(`Error saving to IndexedDB (${retries} retries left):`, dbError);
        retries--;
        if (retries === 0) {
          // If IndexedDB fails but localStorage worked, we can continue
          console.log('Failed to save to IndexedDB, but data is in localStorage');
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        dbConnection = null;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveUserForOffline:', error);
    throw error;
  }
};

// Update getUserByPhone to be more reliable
export const getUserByPhone = async (phoneNumber) => {
  try {
    console.log('Getting user by phone:', phoneNumber);
    
    if (!phoneNumber) {
      console.error('Phone number is required');
      return null;
    }
    
    // First try localStorage for faster access
    try {
      const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
      const userFromLocalStorage = cachedUsers.find(user => 
        user.phone_number === phoneNumber && user.role === 'cashier'
      );
      
      if (userFromLocalStorage) {
        console.log('User found in localStorage');
        return userFromLocalStorage;
      }
    } catch (localStorageError) {
      console.error('Error reading from localStorage:', localStorageError);
    }

    // Try IndexedDB with retries
    let retries = 3;
    while (retries > 0) {
      try {
        const db = await getConnection();
        const tx = db.transaction('users', 'readonly');
        const store = tx.objectStore('users');
        
        // Try phone number index first
        try {
          const index = store.index('phone_number');
          const user = await index.get(phoneNumber);
          if (user && user.role === 'cashier') {
            console.log('User found in IndexedDB via index');
            // Update localStorage cache
            const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
            const updatedUsers = cachedUsers.filter(u => u.id !== user.id);
            updatedUsers.push(user);
            localStorage.setItem(USERS_DATA_KEY, JSON.stringify(updatedUsers));
            return user;
          }
        } catch (indexError) {
          console.warn('Index lookup failed, falling back to full scan:', indexError);
        }
        
        // Fallback to scanning all users
        const allUsers = await store.getAll();
        const user = allUsers.find(u => 
          u.phone_number === phoneNumber && u.role === 'cashier'
        );
        
        if (user) {
          console.log('User found in IndexedDB via scan');
          // Update localStorage cache
          const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
          const updatedUsers = cachedUsers.filter(u => u.id !== user.id);
          updatedUsers.push(user);
          localStorage.setItem(USERS_DATA_KEY, JSON.stringify(updatedUsers));
          return user;
        }
        
        console.log('User not found in database');
        return null;
      } catch (dbError) {
        console.error(`Database error (${retries} retries left):`, dbError);
        retries--;
        if (retries === 0) {
          console.log('All retries failed, returning null');
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        dbConnection = null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in getUserByPhone:', error);
    return null;
  }
};

// Add a new function to check if a user exists in offline storage
export const checkUserExists = async (phoneNumber) => {
  try {
    const db = await getConnection();
    const users = await db.getAll('users');
    
    // Check in IndexedDB
    const existsInIndexedDB = users.some(user => 
      user.phone_number === phoneNumber && user.role === 'cashier'
    );
    
    if (existsInIndexedDB) return true;
    
    // Check in localStorage
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    return cachedUsers.some(user => 
      user.phone_number === phoneNumber && user.role === 'cashier'
    );
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
}; 