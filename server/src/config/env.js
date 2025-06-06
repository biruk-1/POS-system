require('dotenv').config();

const env = {
  // Server Configuration
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  DB_PATH: process.env.DB_PATH || './src/pos.db',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'pos-system-secret-key-development-2024',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '24h',
  
  // CORS Configuration
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'],
  
  // File Upload Configuration
  UPLOAD_DIR: process.env.UPLOAD_DIR || './src/uploads',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024, // 5MB
  
  // API Configuration
  API_PREFIX: '/api',
  
  // Socket.IO Configuration
  SOCKET_PATH: '/socket.io',
  
  // Other Constants
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_LANGUAGE: 'en',
  
  // Helper Functions
  isProd: () => env.NODE_ENV === 'production',
  isDev: () => env.NODE_ENV === 'development'
};

module.exports = env; 