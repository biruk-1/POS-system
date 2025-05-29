import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    // Don't add token for login/register endpoints
    if (config.url.includes('/auth/login') || config.url.includes('/auth/register')) {
      return config;
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      if (!navigator.onLine) {
        console.log('Network is offline');
        return Promise.reject(new Error('You are offline. Please check your connection.'));
      }
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('Request timed out. Please try again.'));
      }
      return Promise.reject(new Error('Network error occurred. Please check your connection.'));
    }

    switch (error.response.status) {
      case 401:
        if (!error.config.url.includes('/auth/login')) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      case 403:
        localStorage.removeItem('token');
        if (!error.config.url.includes('/auth/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      default:
        return Promise.reject(error);
    }
  }
);

instance.interceptors.request.use((config) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, config.timeout || 10000);

  config.signal = controller.signal;
  config._timeoutId = timeoutId;

  return config;
});

instance.interceptors.response.use(
  (response) => {
    clearTimeout(response.config._timeoutId);
    return response;
  },
  (error) => {
    if (error.config?._timeoutId) {
      clearTimeout(error.config._timeoutId);
    }
    return Promise.reject(error);
  }
);

export default instance; 