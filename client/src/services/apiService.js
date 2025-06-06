import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import env from '../config/env';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (credentials) => axiosInstance.post(API_ENDPOINTS.LOGIN, credentials),
  pinLogin: (pin) => axiosInstance.post(API_ENDPOINTS.PIN_LOGIN, { pin })
};

// Orders endpoints
export const ordersAPI = {
  create: (orderData) => axiosInstance.post(API_ENDPOINTS.ORDERS, orderData),
  getAll: () => axiosInstance.get(API_ENDPOINTS.ORDERS),
  getById: (id) => axiosInstance.get(`${API_ENDPOINTS.ORDERS}/${id}`),
  update: (id, data) => axiosInstance.put(`${API_ENDPOINTS.ORDERS}/${id}`, data),
  delete: (id) => axiosInstance.delete(`${API_ENDPOINTS.ORDERS}/${id}`)
};

// Items endpoints
export const itemsAPI = {
  getAll: () => axiosInstance.get(API_ENDPOINTS.ITEMS),
  getById: (id) => axiosInstance.get(`${API_ENDPOINTS.ITEMS}/${id}`),
  create: (data) => axiosInstance.post(API_ENDPOINTS.ITEMS, data),
  update: (id, data) => axiosInstance.put(`${API_ENDPOINTS.ITEMS}/${id}`, data),
  delete: (id) => axiosInstance.delete(`${API_ENDPOINTS.ITEMS}/${id}`)
};

// Tables endpoints
export const tablesAPI = {
  getAll: () => axiosInstance.get(`${API_ENDPOINTS.ITEMS}/tables`),
  updateStatus: (tableNumber, status, occupants) => 
    axiosInstance.put(`${API_ENDPOINTS.ITEMS}/tables/${tableNumber}/status`, { status, occupants }),
};

// Dashboard endpoints
export const dashboardAPI = {
  getAdminData: () => axiosInstance.get(API_ENDPOINTS.DASHBOARD_ADMIN),
  getCashierData: () => axiosInstance.get(API_ENDPOINTS.DASHBOARD_CASHIER)
};

// Reports endpoints
export const reportsAPI = {
  generate: (params) => axiosInstance.post(API_ENDPOINTS.REPORTS_GENERATE, params),
  getSalesReport: (params) => axiosInstance.get(API_ENDPOINTS.REPORTS_SALES, { params }),
  getItemsReport: (params) => axiosInstance.get(API_ENDPOINTS.REPORTS_ITEMS, { params })
};

// Settings endpoints
export const settingsAPI = {
  get: () => axiosInstance.get(API_ENDPOINTS.SETTINGS),
  update: (settings) => axiosInstance.put(API_ENDPOINTS.SETTINGS, settings),
};

// Inventory endpoints
export const inventoryAPI = {
  getTransactions: () => axiosInstance.get(`${API_ENDPOINTS.ITEMS}/inventory/transactions`),
  createTransaction: (transactionData) => axiosInstance.post(`${API_ENDPOINTS.ITEMS}/inventory/transactions`, transactionData),
};

// Products endpoints
export const productsAPI = {
  getAll: () => axiosInstance.get(`${API_ENDPOINTS.ITEMS}/products`),
  getById: (id) => axiosInstance.get(`${API_ENDPOINTS.ITEMS}/products/${id}`),
  create: (productData) => axiosInstance.post(`${API_ENDPOINTS.ITEMS}/products`, productData),
  update: (id, productData) => axiosInstance.put(`${API_ENDPOINTS.ITEMS}/products/${id}`, productData),
  delete: (id) => axiosInstance.delete(`${API_ENDPOINTS.ITEMS}/products/${id}`),
};

// Waiters endpoints
export const waitersAPI = {
  getAll: () => axiosInstance.get(API_ENDPOINTS.WAITERS),
  getById: (id) => axiosInstance.get(`${API_ENDPOINTS.WAITERS}/${id}`),
  create: (waiterData) => axiosInstance.post(API_ENDPOINTS.WAITERS, waiterData),
  update: (id, waiterData) => axiosInstance.put(`${API_ENDPOINTS.WAITERS}/${id}`, waiterData),
  delete: (id) => axiosInstance.delete(`${API_ENDPOINTS.WAITERS}/${id}`),
};

// Admin endpoints
export const adminAPI = {
  getStats: () => axiosInstance.get(`${API_ENDPOINTS.ITEMS}/admin/stats`),
  getSalesData: (params) => axiosInstance.get(`${API_ENDPOINTS.ITEMS}/admin/sales`, { params }),
  getOrdersData: (params) => axiosInstance.get(`${API_ENDPOINTS.ITEMS}/admin/orders`, { params })
};

// Bill Requests endpoints
export const billRequestsAPI = {
  getAll: () => axiosInstance.get(API_ENDPOINTS.BILL_REQUESTS),
  create: (data) => axiosInstance.post(API_ENDPOINTS.BILL_REQUESTS, data),
  updateStatus: (id, status) => axiosInstance.patch(`${API_ENDPOINTS.BILL_REQUESTS}/${id}/status`, { status }),
};

// Sales endpoints
export const salesAPI = {
  getDailySales: (date) => axiosInstance.get(API_ENDPOINTS.SALES_DAILY, { params: { date } }),
  getSalesByRange: (startDate, endDate) => axiosInstance.get(API_ENDPOINTS.SALES_RANGE, { 
    params: { start_date: startDate, end_date: endDate } 
  })
};

// Users endpoints
export const usersAPI = {
  getAll: async (params = {}) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.USERS, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
  getWaiters: async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.WAITERS);
      return response.data;
    } catch (error) {
      console.error('Error fetching waiters:', error);
      throw error;
    }
  },
  create: (userData) => axiosInstance.post(API_ENDPOINTS.USERS, userData),
  update: (id, userData) => axiosInstance.put(`${API_ENDPOINTS.USERS}/${id}`, userData),
  delete: (id) => axiosInstance.delete(`${API_ENDPOINTS.USERS}/${id}`),
  login: (credentials) => axiosInstance.post(`${API_ENDPOINTS.USERS}/login`, credentials),
  loginWithPin: (pin) => axiosInstance.post(`${API_ENDPOINTS.USERS}/login/pin`, { pin }),
  loginWithPhone: (phone) => axiosInstance.post(`${API_ENDPOINTS.USERS}/login/phone`, { phone })
};

// Helper function for image URLs
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${env.API_URL}${path}`;
};

export default axiosInstance; 