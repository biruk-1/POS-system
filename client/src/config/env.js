/**
 * Environment Configuration
 * This file centralizes all environment variables for the application.
 */

const env = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  
  // Socket Configuration
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001',
  SOCKET_PATH: import.meta.env.VITE_SOCKET_PATH || '/socket.io',
  
  // Client Configuration
  CLIENT_URL: import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173',
  
  // Production URLs
  PROD_API_URL: import.meta.env.VITE_PROD_API_URL || 'https://www.plg.et',
  PROD_SOCKET_URL: import.meta.env.VITE_PROD_SOCKET_URL || 'https://www.plg.et',
  
  // CORS Origins
  ALLOWED_ORIGINS: (import.meta.env.VITE_ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  
  // Environment
  NODE_ENV: import.meta.env.MODE || 'development',
  IS_PRODUCTION: import.meta.env.MODE === 'production',
  
  // Helper Functions
  getImageUrl: (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${env.API_URL}${path}`;
  },
  
  // API Endpoints
  getApiUrl: (endpoint) => {
    return `${env.API_BASE_URL}${endpoint}`;
  }
};

export default env; 