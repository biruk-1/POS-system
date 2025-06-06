import io from 'socket.io-client';
import env from '../config/env';

class SocketService {
  constructor() {
    this.socket = null;
    this.eventQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.retryDelay = 2000;
    this.isAuthenticated = false;
    this.token = null;
  }

  connect(token) {
    if (this.socket?.connected && this.isAuthenticated) {
      return;
    }

    this.token = token;
    this.socket = io(env.SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000,
      path: env.SOCKET_PATH,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      this.authenticate();
    });

    this.socket.on('authenticated', () => {
      console.log('Socket authenticated successfully');
      this.isAuthenticated = true;
      this.processEventQueue();
    });

    this.socket.on('authentication_error', (error) => {
      console.error('Socket authentication error:', error);
      this.isAuthenticated = false;
      
      if (error.type === 'TokenExpiredError') {
        // Handle expired token - could trigger a refresh token flow here
        window.location.href = '/login';
      } else if (error.type === 'JsonWebTokenError') {
        // Handle invalid token
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      this.isAuthenticated = false;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isAuthenticated = false;
      
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setTimeout(() => {
          this.connect(this.token);
        }, this.retryDelay);
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  authenticate() {
    if (!this.socket?.connected || !this.token) {
      return;
    }

    console.log('Attempting socket authentication');
    this.socket.emit('authenticate', this.token);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isAuthenticated = false;
      this.token = null;
    }
  }

  emit(event, data) {
    if (this.socket?.connected && this.isAuthenticated) {
      this.socket.emit(event, data);
    } else {
      this.eventQueue.push({ event, data });
      console.log(`Event ${event} queued for later emission`);
      
      // Try to reconnect if not connected
      if (!this.socket?.connected && this.token) {
        this.connect(this.token);
      }
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
    if (!this.socket?.connected || !this.isAuthenticated || this.eventQueue.length === 0) {
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
    return this.socket?.connected && this.isAuthenticated;
  }
}

const socketService = new SocketService();
export default socketService; 