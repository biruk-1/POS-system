// import { io } from 'socket.io-client';
// import { isOnline } from './offlineService';

// let socket = null;

// export const initializeSocket = (token) => {
//   if (!isOnline()) {
//     console.log('Socket connection skipped - offline mode');
//     return null;
//   }

//   if (socket) {
//     return socket;
//   }

//   try {
//     socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', {
//       auth: {
//         token
//       },
//       reconnection: true,
//       reconnectionAttempts: 5,
//       reconnectionDelay: 1000,
//       timeout: 10000
//     });

//     socket.on('connect', () => {
//       console.log('Socket connected');
//     });

//     socket.on('connect_error', (error) => {
//       console.error('Socket connection error:', error);
//     });

//     socket.on('disconnect', (reason) => {
//       console.log('Socket disconnected:', reason);
//     });

//     return socket;
//   } catch (error) {
//     console.error('Error initializing socket:', error);
//     return null;
//   }
// };

// export const getSocket = () => socket;

// export const disconnectSocket = () => {
//   if (socket) {
//     socket.disconnect();
//     socket = null;
//   }
// }; 

import { io } from 'socket.io-client';
import { saveBillRequestOffline } from './offlineService';
import env from '../config/env';

class SocketService {
  constructor() {
    this.socket = null;
    this.eventQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.retryDelay = 2000;
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(env.SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000,
      path: '/socket.io',
      forceNew: true,
      withCredentials: true
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      this.processEventQueue();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      } else {
        // Try to reconnect with exponential backoff
        setTimeout(() => {
          this.connect(token);
        }, this.retryDelay * Math.pow(2, this.reconnectAttempts));
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Server initiated disconnect or transport error, try to reconnect
        setTimeout(() => {
          this.connect(token);
        }, this.retryDelay);
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      // Try to reconnect on error
      setTimeout(() => {
        this.connect(token);
      }, this.retryDelay);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      this.eventQueue.push({ event, data });
      console.log(`Event ${event} queued for later emission`);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  processEventQueue() {
    if (!this.socket?.connected || !navigator.onLine || this.eventQueue.length === 0) {
      return;
    }

    console.log(`Processing ${this.eventQueue.length} queued events`);
    const events = [...this.eventQueue];
    this.eventQueue = [];

    events.forEach(({ event, data }) => {
      try {
        this.socket.emit(event, data);
      } catch (error) {
        console.error(`Error processing queued event ${event}:`, error);
        this.eventQueue.push({ event, data });
      }
    });
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;