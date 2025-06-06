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
const WAITERS_DATA_KEY = 'pos_waiters_data';
const BILL_REQUESTS_KEY = 'pos_bill_requests';
const SETTINGS_KEY = 'pos_settings';
const TABLES_DATA_KEY = 'pos_tables_data';
const REPORTS_DATA_KEY = 'pos_reports_data';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds

const DB_NAME = 'pos-system-db';
const DB_VERSION = 6;

// Add connection management
let dbConnection = null;
let connectionPromise = null;
let isInitializing = false;

const getConnection = async () => {
  if (isInitializing) {
    return connectionPromise;
  }

  if (dbConnection && !dbConnection.closed) {
    return dbConnection;
  }

  if (connectionPromise) {
    return await connectionPromise;
  }

  isInitializing = true;

  try {
    console.log('Opening new database connection...');
    connectionPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log('Upgrading database from version', oldVersion, 'to', newVersion);
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('phone_number', 'phone_number', { unique: true });
          userStore.createIndex('role', 'role', { unique: false });
        }

        if (!db.objectStoreNames.contains('dashboard')) {
          const dashboardStore = db.createObjectStore('dashboard', { keyPath: 'id', autoIncrement: true });
          dashboardStore.createIndex('timestamp', 'timestamp', { unique: false });
          dashboardStore.createIndex('synced', 'synced', { unique: false });
        }

        ['orders', 'receipts', 'syncQueue', 'waiters', 'billRequests', 'menuItems', 'tables'].forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            if (storeName === 'orders' || storeName === 'billRequests') {
              store.createIndex('synced', 'synced', { unique: false });
              store.createIndex('timestamp', 'timestamp', { unique: false });
            }
          }
        });
      },
      blocked(currentVersion, blockedVersion, event) {
        console.log('Database blocked:', { currentVersion, blockedVersion, event });
        if (dbConnection) {
          dbConnection.close();
          dbConnection = null;
        }
      },
      blocking(currentVersion, blockedVersion, event) {
        console.log('Database blocking:', { currentVersion, blockedVersion, event });
        if (dbConnection) {
          dbConnection.close();
          dbConnection = null;
        }
      },
      terminated() {
        console.log('Database connection terminated');
        dbConnection = null;
        connectionPromise = null;
        isInitializing = false;
      }
    });

    dbConnection = await connectionPromise;
    console.log('Database connection established:', dbConnection.version);
    return dbConnection;
  } catch (error) {
    console.error('Error getting database connection:', error);
    dbConnection = null;
    connectionPromise = null;
    throw error;
  } finally {
    isInitializing = false;
    connectionPromise = null;
  }
};

// Helper function to safely execute database operations with retries
const executeDbOperation = async (operation, storeName, mode = 'readonly') => {
  let retries = 3;
  while (retries > 0) {
    try {
      const db = await getConnection();
      // Verify store exists
      if (!db.objectStoreNames.contains(storeName)) {
        console.warn(`Store ${storeName} not found, attempting to reinitialize database`);
        await clearDatabase();
        await initializeOfflineStorage();
        throw new Error(`Store ${storeName} not found, database reinitialized`);
      }
      const tx = db.transaction(storeName, mode);
      const result = await operation(tx.store);
      await tx.done;
      return result;
    } catch (error) {
      console.error(`Database operation failed (${retries} retries left):`, error);
      retries--;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
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

// Clear database
export const clearDatabase = async () => {
  try {
    console.log('Clearing database...');
    await deleteDB(DB_NAME);
    console.log('Database cleared successfully');
    dbConnection = null; // Reset connection
    return true;
  } catch (error) {
    console.error('Error clearing database:', error);
    return false;
  }
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
    window._dbInitialized = true;
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

// Save user for offline access
export const saveUserForOffline = async (userData) => {
  try {
    console.log('Saving user data for offline access:', userData);
    
    if (userData.role === 'cashier' && !userData.phone_number) {
      throw new Error('Phone number is required for cashier');
    }

    const db = await getConnection();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');

    const existingUser = await store.get(userData.id);
    
    if (existingUser) {
      await store.put({
        ...existingUser,
        ...userData,
        phone_number: userData.phone_number || existingUser.phone_number
      });
    } else {
      await store.add({
        ...userData,
        phone_number: userData.phone_number || null
      });
    }

    await tx.complete;
    console.log('User data saved successfully for offline access');
  } catch (error) {
    console.error('Error in saveUserForOffline:', error);
  }
};

// Save users data
export const saveUsersData = async (users) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    
    for (const user of users) {
      try {
        if (user.phone_number) {
          const phoneIndex = store.index('phone_number');
          const existingUser = await phoneIndex.get(user.phone_number);
          
          if (existingUser && existingUser.id !== user.id) {
            console.warn(`Skipping user ${user.id} - phone number ${user.phone_number} already exists`);
            continue;
          }
        }
        
        await store.put({
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name || '',
          phone_number: user.phone_number || '',
          created_at: user.created_at || new Date().toISOString(),
          last_updated: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error saving user ${user.id}:`, error);
      }
    }
    
    await tx.done;
    
    try {
      localStorage.setItem(USERS_DATA_KEY, JSON.stringify(users));
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving users data:', error);
    return false;
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
export const saveBillRequestOffline = async (requests) => {
  try {
    await checkStorageQuota();
    const db = await getConnection();
    const tx = db.transaction('billRequests', 'readwrite');
    const store = tx.objectStore('billRequests');

    if (Array.isArray(requests)) {
      for (const request of requests) {
        await store.put({
          ...request,
          synced: false,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      await store.put({
        ...requests,
        synced: false,
        timestamp: new Date().toISOString()
      });
    }
    
    await tx.done;
    console.log('Bill requests saved offline');
  } catch (error) {
    console.error('Error saving bill requests offline:', error);
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
export const saveOrderOffline = async (orders) => {
  try {
    await checkStorageQuota();
    const db = await getConnection();
    const tx = db.transaction('orders', 'readwrite');
    const store = tx.objectStore('orders');

    if (Array.isArray(orders)) {
      for (const order of orders) {
        await store.put({
          ...order,
          synced: false,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      await store.put({
        ...orders,
        synced: false,
        timestamp: new Date().toISOString()
      });
    }
    
    await tx.done;
    console.log('Orders saved offline');
  } catch (error) {
    console.error('Error saving orders offline:', error);
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
    await executeDbOperation(
      async (store) => {
        for (const item of items) {
          await store.put({
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            created_at: new Date().toISOString()
          });
        }
      },
      'menuItems',
      'readwrite'
    );
    localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Error saving menu items offline:', error);
    return false;
  }
};

export const getMenuItemsOffline = async () => {
  try {
    const items = await executeDbOperation(
      async (store) => await store.getAll(),
      'menuItems'
    );
    return items.length > 0 ? items : JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
  } catch (error) {
    console.error('Error getting menu items offline:', error);
    return JSON.parse(localStorage.getItem(MENU_ITEMS_KEY) || '[]');
  }
};

// Tables operations
export const saveTablesOffline = async (tables) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('tables', 'readwrite');
    const store = tx.objectStore('tables');
    
    await Promise.all(tables.map(table => {
      return store.put({
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        status: table.status || 'available',
        last_updated: new Date().toISOString()
      });
    }));
    
    await tx.done;
    localStorage.setItem(TABLES_DATA_KEY, JSON.stringify(tables));
    return true;
  } catch (error) {
    console.error('Error saving tables offline:', error);
    try {
      localStorage.setItem(TABLES_DATA_KEY, JSON.stringify(tables));
      return true;
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError);
      return false;
    }
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
    if (!data) return;
    
    const db = await getConnection();
    if (!db.objectStoreNames.contains('dashboard')) {
      console.warn('Dashboard store not found, reinitializing database');
      await clearDatabase();
      await initializeOfflineStorage();
      throw new Error('Dashboard store not found, database reinitialized');
    }
    
    const tx = db.transaction('dashboard', 'readwrite');
    const store = tx.objectStore('dashboard');
    
    const dashboardData = {
      ...data,
      timestamp: new Date().toISOString(),
      synced: true,
      id: 1
    };
    
    await store.put(dashboardData);
    await tx.done;
    console.log('Dashboard data saved offline successfully');
  } catch (error) {
    console.error('Error saving dashboard data offline:', error);
    throw error;
  }
};

export const getOfflineDashboardData = async () => {
  try {
    const db = await getConnection();
    if (!db.objectStoreNames.contains('dashboard')) {
      console.warn('Dashboard store not found, reinitializing database');
      await clearDatabase();
      await initializeOfflineStorage();
      return null; // Return null as no data exists after reinitialization
    }
    
    const tx = db.transaction('dashboard', 'readonly');
    const store = tx.objectStore('dashboard');
    
    const data = await store.get(1);
    await tx.done;
    
    return data;
  } catch (error) {
    console.error('Error getting dashboard data offline:', error);
    throw error;
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
        } else if (item.type === 'bill_request') {
          response = await fetch('/api/bill-requests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(item.data)
          });
        }
        
        if (response && response.ok) {
          await db.put('syncQueue', {
            ...item,
            status: 'synced',
            synced_at: new Date().toISOString()
          });
          
          if (item.type === 'order') {
            await db.put('orders', {
              ...item.data,
              isOffline: false,
              synced_at: new Date().toISOString()
            });
          } else if (item.type === 'bill_request') {
            await db.put('billRequests', {
              ...item.data,
              isOffline: false,
              synced_at: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error(`Error syncing ${item.type}:`, error);
        
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

// Initialize sync interval
export const initializeSyncInterval = () => {
  if (navigator.onLine) {
    syncWithServer().catch(console.error);
    
    setInterval(() => {
      if (navigator.onLine) {
        syncWithServer().catch(console.error);
      }
    }, 5 * 60 * 1000);
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