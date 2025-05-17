// Offline service for handling operations when network is down
// Storage keys
const ORDERS_STORAGE_KEY = 'pos_offline_orders';
const RECEIPTS_STORAGE_KEY = 'pos_offline_receipts';
const SYNC_QUEUE_KEY = 'pos_offline_sync_queue';

// Initialize offline data storage
const initOfflineStorage = () => {
  if (!localStorage.getItem(ORDERS_STORAGE_KEY)) {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([]));
  }
  
  if (!localStorage.getItem(RECEIPTS_STORAGE_KEY)) {
    localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify([]));
  }
  
  if (!localStorage.getItem(SYNC_QUEUE_KEY)) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
  }
};

// Initialize offline event listeners
const initOfflineListeners = (onlineCallback, offlineCallback) => {
  initOfflineStorage();
  
  window.addEventListener('online', onlineCallback);
  window.addEventListener('offline', offlineCallback);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', onlineCallback);
    window.removeEventListener('offline', offlineCallback);
  };
};

// Save an order when offline
const saveOrderOffline = (orderData) => {
  const orders = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY));
  
  // Generate a temporary ID for the order
  const tempId = `offline-${Date.now()}`;
  
  const newOrder = {
    ...orderData,
    id: tempId,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  orders.push(newOrder);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  
  // Add to sync queue
  const syncQueue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY));
  syncQueue.push({
    type: 'order',
    data: {
      ...orderData,
      local_id: tempId,
      created_at: new Date().toISOString()
    }
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  
  return newOrder;
};

// Save a receipt when offline
const saveReceiptOffline = (receiptData) => {
  const receipts = JSON.parse(localStorage.getItem(RECEIPTS_STORAGE_KEY));
  
  // Generate a temporary ID for the receipt
  const tempId = `offline-receipt-${Date.now()}`;
  
  const newReceipt = {
    ...receiptData,
    id: tempId,
    created_at: new Date().toISOString()
  };
  
  receipts.push(newReceipt);
  localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(receipts));
  
  // Add to sync queue
  const syncQueue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY));
  syncQueue.push({
    type: 'receipt',
    data: {
      ...receiptData,
      local_id: tempId,
      created_at: new Date().toISOString()
    }
  });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  
  return newReceipt;
};

// Get offline orders
const getOfflineOrders = () => {
  return JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
};

// Get offline dashboard data
const getOfflineDashboardData = () => {
  const orders = getOfflineOrders();
  
  // Calculate simple metrics from offline orders
  const totalSales = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const completedOrders = orders.filter(order => order.status === 'completed' || order.status === 'paid').length;
  
  // Calculate revenue
  const dailyRevenue = orders.reduce((sum, order) => {
    // Check if order was created today
    const orderDate = new Date(order.created_at).toDateString();
    const today = new Date().toDateString();
    
    if (orderDate === today) {
      return sum + (Number(order.total_amount) || 0);
    }
    return sum;
  }, 0);
  
  // Count food and drink items
  let foodSales = 0;
  let drinkSales = 0;
  
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        if (item.item_type === 'food') {
          foodSales += (item.price * item.quantity);
        } else if (item.item_type === 'drink') {
          drinkSales += (item.price * item.quantity);
        }
      });
    }
  });
  
  return {
    totalSales,
    pendingOrders,
    completedOrders,
    dailyRevenue,
    salesByCategory: {
      food: foodSales,
      drinks: drinkSales
    }
  };
};

// Sync offline data with server
const syncWithServer = async (axios) => {
  const syncQueue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  
  if (syncQueue.length === 0) {
    return { success: true, message: 'No data to sync' };
  }
  
  try {
    const token = localStorage.getItem('token');
    
    // Send the sync data to server
    const response = await axios.post('http://localhost:5001/api/sync', 
      { entities: syncQueue },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    if (response.data.success) {
      // Clear sync queue on successful sync
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
      
      // Update local storage with synced IDs if needed
      
      return { 
        success: true, 
        message: `Synced ${response.data.synced} items. Failed: ${response.data.failed || 0}.`
      };
    } else {
      return { 
        success: false, 
        message: response.data.message || 'Sync failed'
      };
    }
  } catch (error) {
    console.error('Error during sync:', error);
    return { 
      success: false, 
      message: error.message || 'Unknown error during sync'
    };
  }
};

// Export functions as named exports
export {
  initOfflineListeners,
  saveOrderOffline,
  saveReceiptOffline,
  getOfflineOrders,
  getOfflineDashboardData,
  syncWithServer
}; 