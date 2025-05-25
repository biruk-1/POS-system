import { io } from 'socket.io-client';
import { isOnline } from './offlineService';

let socket = null;

export const initializeSocket = (token) => {
  if (!isOnline()) {
    console.log('Socket connection skipped - offline mode');
    return null;
  }

  if (socket) {
    return socket;
  }

  try {
    socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', {
      auth: {
        token
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    return null;
  }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}; 