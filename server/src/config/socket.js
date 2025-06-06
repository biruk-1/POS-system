const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_only_for_development';

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
          console.error('Socket auth error:', err);
          return next(new Error('Authentication error: Invalid token'));
        }
        socket.user = decoded;
        next();
      });
    } catch (error) {
      console.error('Socket middleware error:', error);
      next(new Error('Internal socket error'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id, 'User:', socket.user?.username);
    
    // Send initial connection success event
    socket.emit('connect_success', { 
      message: 'Successfully connected to server',
      user: socket.user?.username
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', socket.id, 'Reason:', reason);
    });

    // Add your custom event handlers here
    // Example:
    socket.on('order_created', (data) => {
      io.emit('order_update', { type: 'new', data });
    });

    socket.on('order_updated', (data) => {
      io.emit('order_update', { type: 'update', data });
    });

    socket.on('table_status_updated', (data) => {
      io.emit('table_update', data);
    });
  });

  return io;
};

module.exports = {
  initializeSocket
}; 