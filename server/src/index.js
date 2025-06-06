const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const env = require('./config/env');
const { initializeDatabase } = require('./config/database');

// Import routes
const routes = require('./routes');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// CORS configuration
const corsOptions = {
  origin: env.ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Socket.IO configuration
const io = socketIO(server, {
  cors: {
    origin: env.ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  path: '/socket.io',
  connectTimeout: 45000,
  allowUpgrades: true,
  maxHttpBufferSize: 1e8,
  perMessageDeflate: {
    threshold: 1024
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('authenticate', (token) => {
    try {
      if (!token) {
        throw new Error('No token provided');
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded;
      socket.join(`role:${decoded.role}`);
      socket.join(`user:${decoded.id}`);
      socket.emit('authenticated', { success: true });
      console.log(`Socket ${socket.id} authenticated as ${decoded.username} (${decoded.role})`);
    } catch (error) {
      console.error('Socket authentication failed:', error);
      socket.emit('authentication_error', { 
        message: error.message,
        type: error.name
      });
      socket.disconnect(true);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    socket.emit('error', { message: 'Internal server error' });
  });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS preflight handler
app.options('*', cors(corsOptions));

// Serve static files from the upload directory
app.use('/uploads', express.static(uploadDir));

// Mount API routes with proper prefix
app.use(env.API_PREFIX, routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    server.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
      console.log('Environment:', env.NODE_ENV);
      console.log('API URL:', `http://localhost:${env.PORT}${env.API_PREFIX}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }); 