/**
 * API Configuration
 * 
 * This file centralizes API configuration for the application.
 * Any changes to the API URL only need to be made in this file.
 */

const API_BASE_URL = 'http://localhost:5001/api';
export { API_BASE_URL };

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  PIN_LOGIN: `${API_BASE_URL}/auth/pin-login`,
  
  // Users
  USERS: `${API_BASE_URL}/users`,
  
  // Items
  ITEMS: `${API_BASE_URL}/items`,
  
  // Orders
  ORDERS: `${API_BASE_URL}/orders`,
  ORDER_ITEMS: `${API_BASE_URL}/order-items`,
  
  // Dashboard
  DASHBOARD: `${API_BASE_URL}/dashboard`,
  DASHBOARD_ADMIN: `${API_BASE_URL}/dashboard/admin`,
  DASHBOARD_CASHIER: `${API_BASE_URL}/dashboard/cashier`,
  
  // Bill Requests
  BILL_REQUESTS: `${API_BASE_URL}/bill-requests`,
  
  // Sales
  SALES: `${API_BASE_URL}/sales`,
  SALES_DAILY: `${API_BASE_URL}/sales/daily`,
  SALES_RANGE: `${API_BASE_URL}/sales/range`,
  
  // Reports
  REPORTS: `${API_BASE_URL}/reports`,
  REPORTS_GENERATE: `${API_BASE_URL}/reports/generate`,
  REPORTS_SALES: `${API_BASE_URL}/reports/sales`,
  REPORTS_ITEMS: `${API_BASE_URL}/reports/items`,
  
  // Admin
  ADMIN: `${API_BASE_URL}/admin`,
  ADMIN_DASHBOARD: `${API_BASE_URL}/admin/dashboard`,
  ADMIN_SALES: `${API_BASE_URL}/admin/sales`,
  
  // Settings
  SETTINGS: `${API_BASE_URL}/settings`,
  
  // Terminals
  KITCHEN_TERMINAL: `${API_BASE_URL}/terminal/kitchen`,
  BARTENDER_TERMINAL: `${API_BASE_URL}/terminal/bartender`,
  
  // Waiters
  WAITERS: `${API_BASE_URL}/waiters`,
};

export default API_ENDPOINTS; 