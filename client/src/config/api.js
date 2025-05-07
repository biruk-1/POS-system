/**
 * API Configuration
 * 
 * This file centralizes API configuration for the application.
 * Any changes to the API URL only need to be made in this file.
 */

export const API_BASE_URL = 'http://localhost:5001';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  PIN_LOGIN: `${API_BASE_URL}/api/auth/pin-login`,
  
  // Users
  USERS: `${API_BASE_URL}/api/users`,
  
  // Items
  ITEMS: `${API_BASE_URL}/api/items`,
  
  // Orders
  ORDERS: `${API_BASE_URL}/api/orders`,
  ORDER_ITEMS: `${API_BASE_URL}/api/order-items`,
  
  // Terminals
  KITCHEN_TERMINAL: `${API_BASE_URL}/api/terminal/kitchen`,
  BARTENDER_TERMINAL: `${API_BASE_URL}/api/terminal/bartender`,
  
  // Reports
  REPORTS_SALES: `${API_BASE_URL}/api/reports/sales`,
  REPORTS_ITEMS: `${API_BASE_URL}/api/reports/items`,
  
  // Settings
  SETTINGS: `${API_BASE_URL}/api/settings`,
};

export default API_ENDPOINTS; 