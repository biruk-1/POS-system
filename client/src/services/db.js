import { openDB } from 'idb';

const DB_NAME = 'pos-system-db';
const DB_VERSION = 6; // Match version with offlineService.js

// Initialize database
let dbPromise = null;
let isInitializing = false;

const initializeDB = async () => {
  if (isInitializing) {
    return dbPromise;
  }

  if (dbPromise) {
    return dbPromise;
  }

  isInitializing = true;

  try {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('phone_number', 'phone_number', { unique: true });
          userStore.createIndex('role', 'role', { unique: false });
        }

        // Orders store
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('status', 'status', { unique: false });
          orderStore.createIndex('created_at', 'created_at', { unique: false });
          orderStore.createIndex('cashier_id', 'cashier_id', { unique: false });
          orderStore.createIndex('isOffline', 'isOffline', { unique: false });
        }

        // Tables store
        if (!db.objectStoreNames.contains('tables')) {
          const tableStore = db.createObjectStore('tables', { keyPath: 'id' });
          tableStore.createIndex('status', 'status', { unique: false });
          tableStore.createIndex('number', 'number', { unique: true });
          tableStore.createIndex('capacity', 'capacity', { unique: false });
        }

        // Receipts store
        if (!db.objectStoreNames.contains('receipts')) {
          const receiptStore = db.createObjectStore('receipts', { keyPath: 'id' });
          receiptStore.createIndex('order_id', 'order_id', { unique: true });
          receiptStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // Menu items store
        if (!db.objectStoreNames.contains('menuItems')) {
          const menuStore = db.createObjectStore('menuItems', { keyPath: 'id' });
          menuStore.createIndex('category', 'category', { unique: false });
          menuStore.createIndex('type', 'type', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Waiters store
        if (!db.objectStoreNames.contains('waiters')) {
          const waiterStore = db.createObjectStore('waiters', { keyPath: 'id', autoIncrement: true });
          waiterStore.createIndex('username', 'username', { unique: true });
          waiterStore.createIndex('name', 'name', { unique: false });
        }

        // Bill requests store
        if (!db.objectStoreNames.contains('billRequests')) {
          const billStore = db.createObjectStore('billRequests', { keyPath: 'id', autoIncrement: true });
          billStore.createIndex('order_id', 'order_id', { unique: false });
          billStore.createIndex('status', 'status', { unique: false });
        }

        // Reports store
        if (!db.objectStoreNames.contains('reports')) {
          const reportStore = db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
          reportStore.createIndex('type', 'type', { unique: false });
          reportStore.createIndex('date', 'date', { unique: false });
        }

        // Create stores if they don't exist
        ['orders', 'receipts', 'syncQueue', 'waiters', 'billRequests', 'menuItems', 'tables', 'reports'].forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            if (storeName === 'reports') {
              store.createIndex('type', 'type', { unique: false });
              store.createIndex('date', 'date', { unique: false });
            }
          }
        });
      },
      blocked(currentVersion, blockedVersion, event) {
        console.log('Database blocked:', { currentVersion, blockedVersion, event });
        // Close any existing connections
        if (dbPromise) {
          dbPromise.then(db => db.close());
          dbPromise = null;
        }
      },
      blocking(currentVersion, blockedVersion, event) {
        console.log('Database blocking:', { currentVersion, blockedVersion, event });
        // Close this connection so other tabs can upgrade
        if (dbPromise) {
          dbPromise.then(db => db.close());
          dbPromise = null;
        }
      },
      terminated() {
        console.log('Database connection terminated');
        dbPromise = null;
        isInitializing = false;
      }
    });

    const db = await dbPromise;
    console.log('Database initialized successfully:', db.version);
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    dbPromise = null;
    throw error;
  } finally {
    isInitializing = false;
  }
};

// Helper function to get database instance
const getDB = async () => {
  if (!dbPromise) {
    await initializeDB();
  }
  return dbPromise;
};

// Initialize database on module load
initializeDB().catch(console.error);

// Users operations
const userOperations = {
  async saveUser(userData) {
    const db = await getDB();
    return db.put('users', userData);
  },

  async getUser(id) {
    const db = await getDB();
    return db.get('users', id);
  },

  async getUserByUsername(username) {
    const db = await getDB();
    return db.getFromIndex('users', 'username', username);
  },

  async getAllUsers() {
    const db = await getDB();
    return db.getAll('users');
  },

  async getUsersByRole(role) {
    const db = await getDB();
    return db.getAllFromIndex('users', 'role', role);
  }
};

// Orders operations
const orderOperations = {
  async saveOrder(orderData) {
    const db = await getDB();
    return db.put('orders', orderData);
  },

  async getOrder(id) {
    const db = await getDB();
    return db.get('orders', id);
  },

  async getOfflineOrders() {
    const db = await getDB();
    return db.getAllFromIndex('orders', 'isOffline', true);
  },

  async getOrdersByStatus(status) {
    const db = await getDB();
    return db.getAllFromIndex('orders', 'status', status);
  },

  async getOrdersByCashier(cashierId) {
    const db = await getDB();
    return db.getAllFromIndex('orders', 'cashier_id', cashierId);
  },

  async updateOrderStatus(id, status) {
    const db = await getDB();
    const order = await db.get('orders', id);
    if (order) {
      order.status = status;
      return db.put('orders', order);
    }
  }
};

// Receipts operations
const receiptOperations = {
  async saveReceipt(receiptData) {
    const db = await getDB();
    return db.put('receipts', receiptData);
  },

  async getReceipt(id) {
    const db = await getDB();
    return db.get('receipts', id);
  },

  async getReceiptByOrder(orderId) {
    const db = await getDB();
    return db.getFromIndex('receipts', 'order_id', orderId);
  }
};

// Settings operations
const settingsOperations = {
  async saveSettings(settings) {
    const db = await getDB();
    return db.put('settings', { id: 'main', ...settings });
  },

  async getSettings() {
    const db = await getDB();
    return db.get('settings', 'main');
  }
};

// Menu items operations
const menuOperations = {
  async saveMenuItem(item) {
    const db = await getDB();
    return db.put('menuItems', item);
  },

  async getMenuItem(id) {
    const db = await getDB();
    return db.get('menuItems', id);
  },

  async getAllMenuItems() {
    const db = await getDB();
    return db.getAll('menuItems');
  },

  async getMenuItemsByCategory(category) {
    const db = await getDB();
    return db.getAllFromIndex('menuItems', 'category', category);
  }
};

// Tables operations
const tableOperations = {
  async saveTable(table) {
    const db = await getDB();
    return db.put('tables', table);
  },

  async getTable(id) {
    const db = await getDB();
    return db.get('tables', id);
  },

  async getAllTables() {
    const db = await getDB();
    return db.getAll('tables');
  },

  async getTablesByStatus(status) {
    const db = await getDB();
    return db.getAllFromIndex('tables', 'status', status);
  }
};

// Reports operations
const reportOperations = {
  async saveReport(report) {
    const db = await getDB();
    return db.put('reports', report);
  },

  async getReport(id) {
    const db = await getDB();
    return db.get('reports', id);
  },

  async getReportsByType(type) {
    const db = await getDB();
    return db.getAllFromIndex('reports', 'type', type);
  }
};

// Sync queue operations
const syncOperations = {
  async addToSyncQueue(item) {
    const db = await getDB();
    return db.add('syncQueue', {
      ...item,
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString()
    });
  },

  async getPendingSyncItems() {
    const db = await getDB();
    return db.getAllFromIndex('syncQueue', 'status', 'pending');
  },

  async updateSyncItemStatus(id, status) {
    const db = await getDB();
    const item = await db.get('syncQueue', id);
    if (item) {
      item.status = status;
      return db.put('syncQueue', item);
    }
  },

  async incrementRetryCount(id) {
    const db = await getDB();
    const item = await db.get('syncQueue', id);
    if (item) {
      item.retry_count = (item.retry_count || 0) + 1;
      return db.put('syncQueue', item);
    }
  }
};

export {
  userOperations,
  orderOperations,
  receiptOperations,
  settingsOperations,
  menuOperations,
  tableOperations,
  reportOperations,
  syncOperations
}; 