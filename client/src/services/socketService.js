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

import io from 'socket.io-client';
import { saveBillRequestOffline } from './offlineService';

class SocketService {
  constructor() {
    this.socket = null;
    this.eventQueue = [];
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  async connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    if (!navigator.onLine) {
      console.log('Socket connection skipped - offline mode');
      return;
    }

    if (!token) {
      console.log('No token available for socket connection');
      return;
    }

    try {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }

      this.socket = io('http://localhost:5001', {
        auth: { token },
        transports: ['websocket', 'polling'],
        path: '/socket.io/',
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 10000,
        forceNew: true,
        autoConnect: false
      });

      this.setupEventListeners();
      await this.connectWithRetry();
    } catch (error) {
      console.error('Socket initialization error:', error);
      this.handleConnectionError(error);
    }
  }

  async connectWithRetry() {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const connectTimeout = setTimeout(() => {
        if (!this.socket?.connected) {
          console.log('Socket connection timeout');
          this.socket.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(connectTimeout);
        console.log('Socket connected successfully');
        this.connectionAttempts = 0;
        this.processEventQueue();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(connectTimeout);
        console.error('Socket connection error:', error);
        
        if (this.connectionAttempts < this.maxRetries) {
          this.connectionAttempts++;
          console.log(`Retrying connection (${this.connectionAttempts}/${this.maxRetries})`);
          setTimeout(() => {
            this.socket.connect();
          }, this.retryDelay);
        } else {
          reject(error);
        }
      });

      this.socket.connect();
    });
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        setTimeout(() => this.connect(), this.retryDelay);
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.handleConnectionError(error);
    });

    // Handle reconnection
    this.socket.io.on('reconnect', (attempt) => {
      console.log('Socket reconnected after', attempt, 'attempts');
      this.processEventQueue();
    });

    this.socket.io.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    this.socket.io.on('reconnect_failed', () => {
      console.log('Socket reconnection failed');
    });
  }

  handleConnectionError(error) {
    console.error('Socket connection error:', error);
    if (!navigator.onLine) {
      console.log('Network is offline, queuing events');
    }
  }

  on(event, callback) {
    if (!this.socket) {
      console.warn('Socket not initialized when attempting to listen to:', event);
      return;
    }

    this.socket.on(event, (data) => {
      if (!navigator.onLine) {
        console.log(`Queuing offline event: ${event}`);
        this.eventQueue.push({ event, data });
        if (event === 'bill_requested') {
          saveBillRequestOffline(data).catch(error => {
            console.error('Error saving bill request offline:', error);
          });
        }
      } else {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    });
  }

  emit(event, data) {
    if (!navigator.onLine) {
      console.log(`Queuing offline event emission: ${event}`);
      this.eventQueue.push({ event, data });
      if (event === 'bill_requested') {
        saveBillRequestOffline(data).catch(error => {
          console.error('Error saving bill request offline:', error);
        });
      }
      return;
    }

    if (!this.socket?.connected) {
      console.warn('Socket not connected, queuing event:', event);
      this.eventQueue.push({ event, data });
      return;
    }

    try {
      this.socket.emit(event, data);
    } catch (error) {
      console.error(`Error emitting event ${event}:`, error);
      this.eventQueue.push({ event, data });
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

  disconnect() {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;