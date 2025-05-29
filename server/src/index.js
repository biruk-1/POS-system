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

// Import routes
const proxyRoutes = require('./routes/proxyRoutes');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Updated CORS configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'https://extensions.aitopia.ai'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Updated Socket.IO configuration
const io = socketIO(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  path: '/socket.io/',
  connectTimeout: 45000,
  allowUpgrades: true
});

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_only_for_development';

// Middleware
app.use(express.json());

// Add CORS preflight handler
app.options('*', cors(corsOptions));

// Add Socket.IO authentication middleware
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

// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'item-' + uniqueSuffix + ext);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Serve static files from the upload directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to handle extensions.aitopia.ai proxy or mocking
app.use('/ai/*', (req, res) => {
  // This route will catch any requests to /ai/* endpoints
  // and return a mock response to avoid CORS errors
  console.log('Intercepted AI extensions request:', req.path);
  
  // Return empty mock data depending on the endpoint
  if (req.path.includes('/model_settings')) {
    return res.json({ settings: {} });
  } else if (req.path.includes('/prompts')) {
    return res.json({ prompts: [] });
  } else {
    return res.json({});
  }
});

// Add proxy for other aitopia requests
app.use('/extensions/*', (req, res) => {
  console.log('Intercepted extensions request:', req.path);
  return res.json({ success: true });
});

app.use('/languages/*', (req, res) => {
  console.log('Intercepted languages request:', req.path);
  return res.json({ lang: 'en', messages: {} });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id, 'User:', socket.user?.username);
  
  // Send initial connection success event
  socket.emit('connect_success', { 
    message: 'Successfully connected to server',
    user: socket.user?.username
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('order_status_updated', (updatedOrder) => {
    try {
      if (!updatedOrder || !updatedOrder.id) {
        console.error('Invalid order data received:', updatedOrder);
        return;
      }

    if (updatedOrder.status === 'completed' || updatedOrder.status === 'paid') {
      // Update sales_reports table for today with this order's amount
      db.get('SELECT * FROM orders WHERE id = ?', [updatedOrder.id], (err, order) => {
          if (err) {
            console.error('Error fetching order:', err);
            return;
          }

          if (!order) {
            console.error('Order not found:', updatedOrder.id);
            return;
          }

          const today = new Date().toISOString().split('T')[0];
          const orderAmount = order.total_amount || 0;
          
          console.log(`Updating sales_reports for order ${order.id} with amount ${orderAmount}`);
          
          // Add this order's amount to today's sales report
          db.run(`
            INSERT INTO sales_reports (date, total_sales, food_items_count, drink_items_count, created_by)
            VALUES (?, ?, 0, 0, ?)
            ON CONFLICT(date) DO UPDATE SET
              total_sales = total_sales + ?
          `, [today, orderAmount, order.waiter_id || 1, orderAmount], function(err) {
            if (err) {
              console.error('Error updating sales_reports:', err);
              return;
            }

              console.log(`Updated sales_reports for ${today}, added ${orderAmount}`);
              
              // Emit admin_sales_updated to notify all admin dashboards
              io.emit('admin_sales_updated', {
                date: today,
                order_id: order.id,
                amount: orderAmount,
                timeRanges: ['daily', 'weekly', 'monthly', 'yearly']
              });
          });
          });
        }

      // Broadcast the update to all connected clients
      socket.broadcast.emit('order_updated', updatedOrder);
    } catch (error) {
      console.error('Error handling order_status_updated:', error);
    }
  });
});

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'pos.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table with roles
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT,
      phone_number TEXT,
      pin_code TEXT,
      role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create default users if not exist
    const defaultUsers = [
      { username: 'admin', password: 'admin123', role: 'admin', phone_number: null, pin_code: null },
      { username: 'cashier1', password: 'cashier123', role: 'cashier', phone_number: '1234567890', pin_code: null },
      { username: 'waiter1', password: null, role: 'waiter', phone_number: null, pin_code: '123456' },
      { username: 'kitchen1', password: 'kitchen123', role: 'kitchen', phone_number: null, pin_code: null },
      { username: 'bartender1', password: 'bartender123', role: 'bartender', phone_number: null, pin_code: null }
    ];

    console.log('Checking for default users...');
    defaultUsers.forEach(user => {
      console.log(`Checking if user ${user.username} exists...`);
      db.get('SELECT * FROM users WHERE username = ?', [user.username], (err, row) => {
        if (err) {
          console.error(`Error checking user ${user.username}:`, err);
          return;
        }
        if (!row) {
          console.log(`User ${user.username} not found. Creating...`);
          if (user.password) {
            console.log(`Hashing password for ${user.username}...`);
            bcrypt.hash(user.password, 10, (err, hash) => {
              if (err) {
                console.error(`Error hashing password for ${user.username}:`, err);
                return;
              }
              console.log(`Inserting user ${user.username} with role ${user.role}...`);
              db.run('INSERT INTO users (username, password, phone_number, pin_code, role) VALUES (?, ?, ?, ?, ?)',
                [user.username, hash, user.phone_number, user.pin_code, user.role],
                function(err) {
                  if (err) {
                    console.error(`Error creating user ${user.username}:`, err);
                  } else {
                    console.log(`Default ${user.role} user "${user.username}" created with ID ${this.lastID}`);
                  }
                });
            });
          } else {
            // For users with PIN only (no password)
            console.log(`Inserting PIN-only user ${user.username} with role ${user.role}...`);
            db.run('INSERT INTO users (username, password, phone_number, pin_code, role) VALUES (?, ?, ?, ?, ?)',
              [user.username, null, user.phone_number, user.pin_code, user.role],
              function(err) {
                if (err) {
                  console.error(`Error creating user ${user.username}:`, err);
                } else {
                  console.log(`Default ${user.role} user "${user.username}" created with ID ${this.lastID} and PIN ${user.pin_code}`);
                }
              });
          }
        } else {
          console.log(`User ${user.username} already exists with role ${row.role}`);
        }
      });
    });

    // Items table (food and drinks)
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      item_type TEXT NOT NULL, /* 'food' or 'drink' */
      image TEXT,
      image_data BLOB,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      waiter_id INTEGER,
      cashier_id INTEGER,
      table_number INTEGER,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL, /* 'pending', 'in-progress', 'ready', 'completed' */
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (waiter_id) REFERENCES users (id),
      FOREIGN KEY (cashier_id) REFERENCES users (id)
    )`);

    // Order items table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      item_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL, /* 'pending', 'in-progress', 'ready' */
      item_type TEXT NOT NULL, /* 'food' or 'drink' */
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (item_id) REFERENCES items (id)
    )`);

    // Terminals table
    db.run(`CREATE TABLE IF NOT EXISTS terminals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      terminal_type TEXT NOT NULL, /* 'cashier', 'kitchen', 'bartender' */
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add sync_status table for offline/online sync
    db.run(`CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL, /* 'order', 'item', etc. */
      entity_id INTEGER NOT NULL,
      is_synced BOOLEAN DEFAULT 0,
      last_sync_attempt DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    )`);

    // Add sales reports table with date as unique key for aggregation
    db.run(`CREATE TABLE IF NOT EXISTS sales_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL UNIQUE,
      total_sales REAL NOT NULL,
      food_items_count INTEGER NOT NULL,
      drink_items_count INTEGER NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`);

    // Add payments table for order payments
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      cashier_id INTEGER NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_synced BOOLEAN DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (cashier_id) REFERENCES users (id)
    )`);

    // Insert default settings
    const defaultSettings = [
      { key: 'auto_mark_drinks_delay', value: '300' }, // 5 minutes in seconds
      { key: 'online_sync_enabled', value: 'true' },
      { key: 'lan_sync_enabled', value: 'true' }
    ];

    defaultSettings.forEach(setting => {
      db.run('INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)',
        [setting.key, setting.value]);
    });

    // Tables management
    db.run(`CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', /* 'open', 'occupied', 'bill_requested', 'reserved' */
      occupants INTEGER DEFAULT 0,
      waiter_id INTEGER,
      reservation_name TEXT,
      reservation_time TEXT,
      reservation_date TEXT,
      reservation_phone TEXT,
      reservation_notes TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (waiter_id) REFERENCES users (id)
    )`);

    // Create default tables
    for (let i = 1; i <= 10; i++) {
      db.run('INSERT OR IGNORE INTO tables (table_number, status) VALUES (?, ?)',
        [i, 'open']);
    }

    // Add receipts table during database initialization
    db.run(`CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      receipt_type TEXT NOT NULL,
      receipt_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_synced BOOLEAN DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders (id)
    )`);

    // Add draft receipts table for pre-orders and kitchen/bar tickets
    db.run(`CREATE TABLE IF NOT EXISTS draft_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      printed_by INTEGER,
      waiter_id INTEGER,
      FOREIGN KEY (printed_by) REFERENCES users (id),
      FOREIGN KEY (waiter_id) REFERENCES users (id)
    )`);

    // Add draft order items table for easier querying
    db.run(`CREATE TABLE IF NOT EXISTS draft_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id TEXT NOT NULL,
      item_id INTEGER,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      item_type TEXT NOT NULL,
      waiter_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (waiter_id) REFERENCES users (id)
    )`);

    // Add sync mapping table for offline mode
    db.run(`CREATE TABLE IF NOT EXISTS sync_mapping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_id TEXT NOT NULL,
      server_id INTEGER NOT NULL,
      entity_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth check:', {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    path: req.path
  });

  if (!token) {
    return res.status(401).json({ error: 'Access denied - No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log('Authenticated user:', {
      id: user.id,
      username: user.username,
      role: user.role
    });
    req.user = user;
    next();
  });
};

// Role checking middleware
const checkRole = (roles) => {
  return (req, res, next) => {
    console.log('Role check:', {
      userRole: req.user.role,
      requiredRoles: roles,
      path: req.path,
      userId: req.user.id,
      username: req.user.username
    });
    
    // Convert single role to array for consistency
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!req.user || !req.user.role) {
      console.error('No user role found in request');
      return res.status(403).json({ 
        error: 'Access denied - No role found' 
      });
    }
    
    if (!requiredRoles.includes(req.user.role)) {
      console.error(`Access denied for user ${req.user.username} (${req.user.role}) - Required roles: ${requiredRoles.join(', ')}`);
      return res.status(403).json({ 
        error: `Access denied - Required roles: ${requiredRoles.join(', ')}, User role: ${req.user.role}` 
      });
    }
    
    console.log(`Access granted for user ${req.user.username} (${req.user.role}) to ${req.path}`);
    next();
  };
};

// Routes
// Authentication Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password, pin_code, phone_number } = req.body;
  
  console.log('Login attempt:', { 
    username, 
    password: password ? '(password provided)' : '(no password)', 
    pin_code: pin_code ? '(PIN provided)' : '(no PIN)',
    phone_number: phone_number ? '(phone provided)' : '(no phone)' 
  });

  // Login with PIN code (for waiters)
  if (pin_code) {
    console.log('Attempting PIN login');
    db.get('SELECT * FROM users WHERE pin_code = ? AND role = "waiter"', [pin_code], (err, user) => {
      if (err) {
        console.error('Database error on PIN login:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        console.log('Invalid PIN login attempt with PIN:', pin_code);
        return res.status(401).json({ error: 'Invalid PIN code' });
      }

      console.log('Successful PIN login for user:', user.username);
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
    return;
  }

  // Login with phone number + password (for cashiers)
  if (phone_number) {
    console.log('Attempting phone login');
    db.get('SELECT * FROM users WHERE phone_number = ? AND role = "cashier"', [phone_number], (err, user) => {
      if (err) {
        console.error('Database error on phone login:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        console.log('Invalid phone login attempt with phone:', phone_number);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      bcrypt.compare(password, user.password, (err, match) => {
        if (err || !match) {
          console.log('Password mismatch for phone login');
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('Successful phone login for user:', user.username);
        const token = jwt.sign(
          { id: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '12h' }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
      });
    });
    return;
  }

  // Regular login with username/password (for admin, kitchen, bartender)
  console.log('Attempting username login for:', username);
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Database error on username login:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      console.log('User not found for username:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User found, verifying password');
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      if (!match) {
        console.log('Password mismatch for user:', username);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      console.log('Successful username login for user:', user.username, 'with role:', user.role);
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
  });
});

// Items Routes (Previously Products)
app.get('/api/items', (req, res) => {
  db.all('SELECT * FROM items', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

app.post('/api/items', authenticateToken, checkRole(['admin']), upload.single('image'), (req, res) => {
  const { name, description, price, item_type, category } = req.body;
  
  if (!['food', 'drink'].includes(item_type)) {
    return res.status(400).json({ error: 'Item type must be either "food" or "drink"' });
  }
  
  // Set the image path if file was uploaded
  let imagePath = null;
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  }
  
  db.run(
    'INSERT INTO items (name, description, price, item_type, image, category) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description, price, item_type, imagePath, category],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      const newItem = { 
        id: this.lastID, 
        name, 
        description, 
        price, 
        item_type,
        image: imagePath,
        category
      };
      
      // Emit socket event for real-time updates
      io.emit('item_created', newItem);
      
      res.json(newItem);
    }
  );
});

app.put('/api/items/:id', authenticateToken, checkRole(['admin']), upload.single('image'), (req, res) => {
  const { name, description, price, item_type, category } = req.body;
  const itemId = req.params.id;
  
  if (!['food', 'drink'].includes(item_type)) {
    return res.status(400).json({ error: 'Item type must be either "food" or "drink"' });
  }
  
  // Get current item to check if we need to delete an old image
  db.get('SELECT * FROM items WHERE id = ?', [itemId], (err, item) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Set the image path - keep existing if no new file uploaded
    let imagePath = item.image;
    
    if (req.file) {
      // New image uploaded, update the path
      imagePath = `/uploads/${req.file.filename}`;
      
      // Delete old image if exists and is in our uploads directory
      if (item.image && item.image.startsWith('/uploads/')) {
        const oldImagePath = path.join(__dirname, item.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlink(oldImagePath, (err) => {
            if (err) console.error('Error deleting old image:', err);
          });
        }
      }
  }
  
  db.run(
      'UPDATE items SET name = ?, description = ?, price = ?, item_type = ?, image = ?, category = ? WHERE id = ?',
      [name, description, price, item_type, imagePath, category, itemId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
        const updatedItem = { 
          id: parseInt(itemId), 
          name, 
          description, 
          price, 
          item_type,
          image: imagePath,
          category
        };
      
      // Emit socket event for real-time updates
      io.emit('item_updated', updatedItem);
      
      res.json(updatedItem);
    }
  );
  });
});

app.delete('/api/items/:id', authenticateToken, checkRole(['admin']), (req, res) => {
  const itemId = req.params.id;
  
  // Get item to check if we need to delete an image
  db.get('SELECT * FROM items WHERE id = ?', [itemId], (err, item) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Delete the item from the database
  db.run(
    'DELETE FROM items WHERE id = ?',
      [itemId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
        
        // Delete image if exists and is in our uploads directory
        if (item.image && item.image.startsWith('/uploads/')) {
          const imagePath = path.join(__dirname, item.image);
          if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, (err) => {
              if (err) console.error('Error deleting image:', err);
            });
          }
        }
      
      // Emit socket event for real-time updates
        io.emit('item_deleted', { id: parseInt(itemId) });
      
        res.json({ id: itemId });
    }
  );
  });
});

// Order Routes
app.post('/api/orders', authenticateToken, checkRole(['cashier', 'waiter']), (req, res) => {
  const { items, waiter_id, total_amount, status } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }
  
  if (req.user.role === 'cashier' && !waiter_id) {
    return res.status(400).json({ error: 'Waiter ID is required for cashier-created orders' });
  }
  
  const user_id = req.user.id;
  const user_role = req.user.role;
  
  let cashier_id = null;
  let order_waiter_id = null;
  
  if (user_role === 'waiter') {
    order_waiter_id = user_id;
  } else {
    cashier_id = user_id;
    order_waiter_id = waiter_id || null;
  }

  // Calculate total if not provided
  let calculatedTotal = total_amount;
  if (!calculatedTotal) {
    calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  db.run('BEGIN TRANSACTION');

  console.log('Creating order:', { 
    waiter_id: order_waiter_id, 
    cashier_id, 
    total_amount: calculatedTotal, 
    status: status || 'pending'
  });

  db.run(
    'INSERT INTO orders (waiter_id, cashier_id, total_amount, status) VALUES (?, ?, ?, ?)',
    [order_waiter_id, cashier_id, calculatedTotal, status || 'pending'],
    function(err) {
      if (err) {
        console.error('Database error in orders insert:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error' });
      }

      const order_id = this.lastID;
      let completed = 0;
      let hasError = false;

      // Process each item in the order
      items.forEach(item => {
        const item_id = item.item_id;
        const quantity = item.quantity;
        const price = item.price;
        const item_type = item.item_type || 'food';
        
        console.log('Adding order item:', { 
          order_id, 
          item_id, 
          quantity, 
          price, 
          status: 'pending', 
          item_type 
        });
        
        db.run(
          'INSERT INTO order_items (order_id, item_id, quantity, price, status, item_type) VALUES (?, ?, ?, ?, ?, ?)',
          [order_id, item_id, quantity, price, 'pending', item_type],
          function(err) {
            if (err) {
              console.error('Database error in order_items insert:', err);
              if (!hasError) {
                hasError = true;
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Database error inserting order items' });
              }
              return;
            }

            // After successfully inserting the order item, fetch full details to emit via socket
            const orderItemId = this.lastID;
            
            db.get(
              `SELECT 
                oi.id as item_id, 
                oi.order_id, 
                oi.item_id as product_id, 
                oi.quantity, 
                oi.status, 
                oi.item_type,
                i.name as item_name, 
                i.description as item_description, 
                i.image as item_image,
                o.created_at as order_time
              FROM order_items oi
              JOIN items i ON oi.item_id = i.id
              JOIN orders o ON oi.order_id = o.id
              WHERE oi.id = ?`,
              [orderItemId],
              (err, orderItem) => {
                if (!err && orderItem) {
                  // Emit the appropriate socket event based on the item type
                  if (orderItem.item_type === 'food') {
                    console.log('Emitting new_food_order event:', orderItem);
                    io.emit('new_food_order', orderItem);
                  } else if (orderItem.item_type === 'drink') {
                    console.log('Emitting new_drink_order event:', orderItem);
                    io.emit('new_drink_order', orderItem);
                  }
                }
              }
            );

            completed++;
            if (completed === items.length && !hasError) {
              db.run('COMMIT');
              
              // Record sync status for offline/online sync
              db.run('INSERT INTO sync_status (entity_type, entity_id, is_synced) VALUES (?, ?, ?)',
                ['order', order_id, 0]);
              
              // Emit a general order_created event for all clients
              io.emit('order_created', {
                id: order_id,
                total_amount: calculatedTotal,
                status: status || 'pending',
                created_at: new Date().toISOString(),
                items_count: items.length
              });
                
              res.json({ 
                id: order_id, 
                items, 
                total_amount: calculatedTotal,
                waiter_id: order_waiter_id,
                cashier_id,
                status: status || 'pending',
                created_at: new Date().toISOString()
              });
              
              // Auto-mark drinks as ready after delay (if enabled)
              setTimeout(() => {
                db.get('SELECT setting_value FROM settings WHERE setting_key = "auto_mark_drinks_delay"', [], (err, setting) => {
                  if (!err && setting) {
                    // Update drinks to ready status
                    db.run(
                      'UPDATE order_items SET status = "ready" WHERE order_id = ? AND item_type = "drink" AND status = "pending"',
                      [order_id]
                    );
                  }
                });
              }, 300000); // 5 minutes default
            }
          }
        );
      });
    }
  );
});

app.get('/api/orders', authenticateToken, (req, res) => {
  const userRole = req.user.role;
  let query = '';
  let params = [];
  
  switch(userRole) {
    case 'admin':
    case 'cashier':
      query = `
        SELECT 
          o.*, 
          u1.username as waiter_name, 
          u2.username as cashier_name,
          COALESCE(SUM(oi.quantity), 0) as item_count,
          COALESCE(SUM(oi.quantity * oi.price), 0) as calculated_total,
          COALESCE(
            json_group_array(
              CASE WHEN oi.id IS NOT NULL THEN
                json_object(
                  'id', oi.id,
                  'item_id', oi.item_id,
                  'quantity', oi.quantity,
                  'price', oi.price,
                  'status', oi.status,
                  'item_type', oi.item_type,
                  'name', i.name,
                  'description', i.description
                )
              END
            ), '[]'
          ) as items
               FROM orders o 
               LEFT JOIN users u1 ON o.waiter_id = u1.id 
               LEFT JOIN users u2 ON o.cashier_id = u2.id 
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN items i ON oi.item_id = i.id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;
      break;
    case 'waiter':
      query = `
        SELECT 
          o.*,
          COALESCE(u1.username, 'Unknown') as waiter_name,
          COALESCE(u2.username, 'Unknown') as cashier_name,
          COALESCE(oi.items_json, '[]') as items,
          COALESCE(oi.total_amount, 0) as total_amount,
          COALESCE(oi.item_count, 0) as item_count
               FROM orders o 
               LEFT JOIN users u1 ON o.waiter_id = u1.id 
               LEFT JOIN users u2 ON o.cashier_id = u2.id 
        LEFT JOIN OrderItems oi ON o.id = oi.order_id
               WHERE o.waiter_id = ?
        ORDER BY o.created_at DESC
      `;
      params = [req.user.id];
      break;
    case 'kitchen':
      query = `
        SELECT 
          o.*,
          COALESCE(u1.username, 'Unknown') as waiter_name,
          COALESCE(u2.username, 'Unknown') as cashier_name,
          COALESCE(oi.items_json, '[]') as items,
          COALESCE(oi.total_amount, 0) as total_amount,
          COALESCE(oi.item_count, 0) as item_count
               FROM orders o 
               LEFT JOIN users u1 ON o.waiter_id = u1.id 
               LEFT JOIN users u2 ON o.cashier_id = u2.id 
        LEFT JOIN OrderItems oi ON o.id = oi.order_id
        WHERE o.status IN ('pending', 'in-progress')
        ORDER BY o.created_at DESC
      `;
      break;
    default:
      return res.status(403).json({ message: 'Unauthorized role' });
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    try {
      const orders = rows.map(order => {
        let items = [];
        try {
          items = order.items ? JSON.parse(order.items) : [];
          if (!Array.isArray(items)) items = [];
        } catch (parseError) {
          console.error('Error parsing order items:', parseError);
          items = [];
        }
        return {
          ...order,
          items,
          item_count: Number(order.item_count) || 0,
          calculated_total: Number(order.calculated_total) || 0
        };
      });
    res.json(orders);
    } catch (parseError) {
      console.error('Error processing orders:', parseError);
      res.status(500).json({ error: 'Error processing orders', details: parseError.message });
    }
  });
});

app.get('/api/orders/:id/items', authenticateToken, (req, res) => {
  const userRole = req.user.role;
  let query = '';
  let params = [req.params.id];
  
  // Different queries based on user role
  switch(userRole) {
    case 'admin':
    case 'cashier':
    case 'waiter':
      query = `
        SELECT 
          oi.id,
          oi.order_id,
          oi.item_id,
          oi.quantity,
          oi.price,
          oi.status,
          oi.item_type,
          i.name,
          i.description,
          i.category,
          i.image,
          (oi.quantity * oi.price) as total_price
               FROM order_items oi
               JOIN items i ON oi.item_id = i.id
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC`;
      break;
    case 'kitchen':
      query = `
        SELECT 
          oi.id,
          oi.order_id,
          oi.item_id,
          oi.quantity,
          oi.price,
          oi.status,
          oi.item_type,
          i.name,
          i.description,
          i.category,
          i.image,
          (oi.quantity * oi.price) as total_price
               FROM order_items oi
               JOIN items i ON oi.item_id = i.id
        WHERE oi.order_id = ? AND oi.item_type = 'food'
        ORDER BY oi.id ASC`;
      break;
    case 'bartender':
      query = `
        SELECT 
          oi.id,
          oi.order_id,
          oi.item_id,
          oi.quantity,
          oi.price,
          oi.status,
          oi.item_type,
          i.name,
          i.description,
          i.category,
          i.image,
          (oi.quantity * oi.price) as total_price
               FROM order_items oi
               JOIN items i ON oi.item_id = i.id
        WHERE oi.order_id = ? AND oi.item_type = 'drink'
        ORDER BY oi.id ASC`;
      break;
    default:
      return res.status(403).json({ error: 'Unauthorized role' });
  }
  
  db.all(query, params, (err, items) => {
    if (err) {
      console.error('Error fetching order items:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Log the items being returned
    console.log(`Returning ${items.length} items for order ${req.params.id}:`, items);
    
    res.json(items);
  });
});

// Update order item status (for kitchen/bartender)
app.put('/api/order-items/:id/status', authenticateToken, checkRole(['kitchen', 'bartender', 'admin']), (req, res) => {
  const { status } = req.body;
  const userRole = req.user.role;
  const itemId = req.params.id;
  
  if (!['pending', 'in-progress', 'ready'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  // Check if the user has rights to update this item type
  let allowedType = '';
  if (userRole === 'kitchen') {
    allowedType = 'food';
  } else if (userRole === 'bartender') {
    allowedType = 'drink';
  }
  
  let query = '';
  let params = [];
  
  if (userRole === 'admin') {
    query = 'UPDATE order_items SET status = ? WHERE id = ?';
    params = [status, itemId];
  } else {
    query = 'UPDATE order_items SET status = ? WHERE id = ? AND item_type = ?';
    params = [status, itemId, allowedType];
  }
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found or you don\'t have permission to update it' });
    }
    
    // Record sync status
    db.run('INSERT INTO sync_status (entity_type, entity_id, is_synced) VALUES (?, ?, ?)',
      ['order_item', itemId, 0]);
    
    // Get updated item details to emit via socket
    db.get(
      `SELECT oi.id, oi.order_id, oi.item_id, oi.quantity, oi.status, oi.item_type,
              i.name, i.description, i.image
       FROM order_items oi
       JOIN items i ON oi.item_id = i.id
       WHERE oi.id = ?`,
      [itemId],
      (err, item) => {
        if (!err && item) {
          // Emit socket event for real-time updates
          io.emit('order_item_updated', {
            ...item,
            status: status
          });
        }
        
        res.json({ id: itemId, status });
      }
    );
  });
});

// Terminal routes for Kitchen and Bartender display
app.get('/api/terminal/kitchen', authenticateToken, checkRole(['kitchen', 'admin']), (req, res) => {
  console.log('Kitchen terminal API called by:', req.user.username);
  const query = `
    SELECT o.id as order_id, o.table_number, o.created_at as order_time,
           oi.id as item_id, oi.quantity, oi.status as item_status,
           i.name as item_name, i.description as item_description, i.image as item_image
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN items i ON oi.item_id = i.id
    WHERE oi.item_type = 'food'
    ORDER BY o.created_at ASC, oi.id ASC
  `;
  
  db.all(query, [], (err, items) => {
    if (err) {
      console.error('Error in kitchen terminal API:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log(`Kitchen terminal API returning ${items.length} items`);
    res.json(items);
  });
});

app.get('/api/terminal/bartender', authenticateToken, checkRole(['bartender', 'admin']), (req, res) => {
  console.log('Bartender terminal API called by:', req.user.username);
  const query = `
    SELECT o.id as order_id, o.table_number, o.created_at as order_time,
           oi.id as item_id, oi.quantity, oi.status as item_status,
           i.name as item_name, i.description as item_description, i.image as item_image
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN items i ON oi.item_id = i.id
    WHERE oi.item_type = 'drink'
    ORDER BY o.created_at ASC, oi.id ASC
  `;
  
  db.all(query, [], (err, items) => {
    if (err) {
      console.error('Error in bartender terminal API:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log(`Bartender terminal API returning ${items.length} items`);
    res.json(items);
  });
});

// Report routes
app.post('/api/reports/generate', authenticateToken, checkRole(['admin']), (req, res) => {
  const { reportType, startDate, endDate, detailLevel, _t } = req.body;
  
  console.log(`Generating ${reportType} report from ${startDate} to ${endDate} with detail level: ${detailLevel} (timestamp: ${_t})`);
  
  // Validate input parameters
  if (!reportType || !startDate || !endDate) {
    console.error('Missing required parameters:', { reportType, startDate, endDate });
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    console.error('Invalid date format:', { startDate, endDate });
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  // Construct SQL query based on report type and detail level
  let query = '';
  let params = [startDate, endDate];
  const level = detailLevel || 'daily'; // default to daily if not specified
  
  // Helper function to get the appropriate date grouping
  const getDateGrouping = (level) => {
    switch(level) {
      case 'daily':
        return "date(o.created_at)";
      case 'weekly':
        return "strftime('%Y-%W', o.created_at)"; // Year-Week format
      case 'monthly':
        return "strftime('%Y-%m', o.created_at)"; // Year-Month format
      case 'yearly':
        return "strftime('%Y', o.created_at)"; // Year format
      default:
        return "date(o.created_at)";
    }
  };
  
  // Helper function to get human-readable date label
  const getDateLabel = (level) => {
    switch(level) {
      case 'daily':
        return "date(o.created_at) as date";
      case 'weekly':
        return "strftime('%Y-Week %W', o.created_at) as date";
      case 'monthly':
        return "strftime('%Y-%m', o.created_at) as date";
      case 'yearly':
        return "strftime('%Y', o.created_at) as date";
      default:
        return "date(o.created_at) as date";
    }
  };
  
  const dateGrouping = getDateGrouping(level);
  const dateLabel = getDateLabel(level);
  
  switch(reportType) {
    case 'sales':
      query = `
        SELECT 
          ${dateLabel}, 
          COUNT(o.id) as orders, 
          SUM(o.total_amount) as revenue,
          AVG(o.total_amount) as avgOrder,
          (
            SELECT i.name 
            FROM order_items oi 
            JOIN items i ON oi.item_id = i.id 
            WHERE ${dateGrouping} = ${getDateGrouping(level)}
            GROUP BY oi.item_id 
            ORDER BY COUNT(oi.id) DESC 
            LIMIT 1
          ) as topItem
        FROM orders o
        WHERE date(o.created_at) BETWEEN ? AND ?
        AND (o.status = 'completed' OR o.status = 'paid')
        GROUP BY ${dateGrouping}
        ORDER BY ${dateGrouping} DESC
      `;
      break;
    case 'items':
      query = `
        SELECT 
          ${dateLabel},
          COUNT(oi.id) as count,
          SUM(oi.quantity * oi.price) as revenue,
          (
            SELECT i.name 
            FROM order_items oi2 
            JOIN items i ON oi2.item_id = i.id 
            WHERE oi2.item_type = 'food'
            AND ${getDateGrouping('daily')} = ${dateGrouping}
            GROUP BY oi2.item_id 
            ORDER BY COUNT(oi2.id) DESC 
            LIMIT 1
          ) as topItem
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.item_type = 'food' 
        AND date(o.created_at) BETWEEN ? AND ?
        AND (o.status = 'completed' OR o.status = 'paid')
        GROUP BY ${dateGrouping}
        ORDER BY ${dateGrouping} DESC
      `;
      break;
    case 'drinks':
      query = `
        SELECT 
          ${dateLabel},
          COUNT(oi.id) as count,
          SUM(oi.quantity * oi.price) as revenue,
          (
            SELECT i.name 
            FROM order_items oi2 
            JOIN items i ON oi2.item_id = i.id 
            WHERE oi2.item_type = 'drink'
            AND ${getDateGrouping('daily')} = ${dateGrouping}
            GROUP BY oi2.item_id 
            ORDER BY COUNT(oi2.id) DESC 
            LIMIT 1
          ) as topItem
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.item_type = 'drink' 
        AND date(o.created_at) BETWEEN ? AND ?
        AND (o.status = 'completed' OR o.status = 'paid')
        GROUP BY ${dateGrouping}
        ORDER BY ${dateGrouping} DESC
      `;
      break;
    case 'staff':
      query = `
        SELECT 
          ${dateLabel},
          u.username as staff,
          u.role as role,
          COUNT(o.id) as orders,
          SUM(o.total_amount) as revenue
        FROM orders o
        JOIN users u ON (o.waiter_id = u.id)
        WHERE date(o.created_at) BETWEEN ? AND ?
        AND (o.status = 'completed' OR o.status = 'paid')
        GROUP BY ${dateGrouping}, u.id
        ORDER BY ${dateGrouping} DESC, revenue DESC
      `;
      break;
    case 'detailed':
      // This is a new report type that shows detailed breakdowns by time period
      query = `
        SELECT 
          ${dateLabel},
          COUNT(o.id) as orders, 
          SUM(o.total_amount) as revenue,
          AVG(o.total_amount) as avgOrder,
          (
            SELECT COUNT(*) 
            FROM orders o2 
            WHERE o2.status = 'completed' 
            AND ${getDateGrouping(level)} = ${dateGrouping}
          ) as completed_orders,
          (
            SELECT COUNT(*) 
            FROM orders o2 
            WHERE o2.status = 'paid' 
            AND ${getDateGrouping(level)} = ${dateGrouping}
          ) as paid_orders,
          (
            SELECT SUM(oi2.quantity) 
            FROM order_items oi2 
            JOIN orders o2 ON oi2.order_id = o2.id 
            WHERE oi2.item_type = 'food'
            AND ${getDateGrouping(level)} = ${dateGrouping}
            AND (o2.status = 'completed' OR o2.status = 'paid')
          ) as food_items,
          (
            SELECT SUM(oi2.quantity) 
            FROM order_items oi2 
            JOIN orders o2 ON oi2.order_id = o2.id 
            WHERE oi2.item_type = 'drink'
            AND ${getDateGrouping(level)} = ${dateGrouping}
            AND (o2.status = 'completed' OR o2.status = 'paid')
          ) as drink_items
        FROM orders o
        WHERE date(o.created_at) BETWEEN ? AND ?
        AND (o.status = 'completed' OR o.status = 'paid')
        GROUP BY ${dateGrouping}
        ORDER BY ${dateGrouping} DESC
      `;
      break;
    default:
      return res.status(400).json({ error: 'Invalid report type' });
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error generating report:', err);
      return res.status(500).json({ error: 'Failed to generate report' });
    }
    
    // If no data found, return empty array
    if (rows.length === 0) {
      return res.json({
        data: [],
        metadata: {
          reportType,
          startDate,
          endDate,
          detailLevel: level,
          totalRevenue: 0,
          totalOrders: 0,
          totalItems: 0,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Format data for consumption by the frontend and ensure all numeric fields are properly formatted
    const formattedData = rows.map((row, index) => {
      // Ensure all numeric fields are properly converted to numbers with default values
      const revenue = row.revenue !== null && row.revenue !== undefined ? Number(row.revenue) : 0;
      const avgOrder = row.avgOrder !== null && row.avgOrder !== undefined ? Number(row.avgOrder) : 0;
      const orders = row.orders !== null && row.orders !== undefined ? Number(row.orders) : 0;
      const count = row.count !== null && row.count !== undefined ? Number(row.count) : 0;
      const completed_orders = row.completed_orders !== null && row.completed_orders !== undefined ? Number(row.completed_orders) : 0;
      const paid_orders = row.paid_orders !== null && row.paid_orders !== undefined ? Number(row.paid_orders) : 0;
      const food_items = row.food_items !== null && row.food_items !== undefined ? Number(row.food_items) : 0;
      const drink_items = row.drink_items !== null && row.drink_items !== undefined ? Number(row.drink_items) : 0;
      
      return {
        id: index + 1,
        ...row,
        revenue,
        avgOrder,
        orders,
        count,
        completed_orders,
        paid_orders,
        food_items,
        drink_items,
        detail_level: level
      };
    });
    
    // Return formatted data with metadata
    res.json({
      data: formattedData,
      metadata: {
        reportType,
        startDate,
        endDate,
        detailLevel: level,
        totalRevenue: formattedData.reduce((sum, row) => sum + (row.revenue || 0), 0),
        totalOrders: formattedData.reduce((sum, row) => sum + (row.orders || 0), 0),
        totalItems: formattedData.reduce((sum, row) => sum + (row.count || 0), 0),
        timestamp: new Date().toISOString()
      }
    });
  });
});

// Settings routes
app.get('/api/settings', authenticateToken, checkRole(['admin']), (req, res) => {
  db.all('SELECT * FROM settings', [], (err, settings) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Convert settings to key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = setting.setting_value;
    });
    
    res.json(settingsObj);
  });
});

app.put('/api/settings', authenticateToken, checkRole(['admin']), (req, res) => {
  const settings = req.body;
  let updated = 0;
  const totalSettings = Object.keys(settings).length;
  
  Object.entries(settings).forEach(([key, value]) => {
    db.run(
      'UPDATE settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
      [value, key],
      function(err) {
        if (err) {
          console.error('Error updating setting:', err);
        } else {
          updated++;
          
          if (updated === totalSettings) {
            res.json({ message: 'Settings updated successfully' });
          }
        }
      }
    );
  });
});

// User management (for admin)
app.get('/api/users', authenticateToken, checkRole(['admin']), (req, res) => {
  db.all('SELECT id, username, role, phone_number, created_at FROM users', [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

// Get all waiters (for cashier ordering)
app.get('/api/waiters', authenticateToken, checkRole(['cashier', 'admin']), (req, res) => {
  db.all('SELECT id, username, role, phone_number FROM users WHERE role = "waiter"', [], (err, waiters) => {
    if (err) {
      console.error('Error fetching waiters:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log(`Returning ${waiters.length} waiters for cashier`);
    res.json(waiters);
  });
});

app.post('/api/users', authenticateToken, checkRole(['admin']), (req, res) => {
  const { username, password, phone_number, pin_code, role } = req.body;
  
  if (role === 'waiter' && !pin_code) {
    return res.status(400).json({ error: 'PIN code is required for waiters' });
  }
  
  if (role === 'cashier' && !phone_number) {
    return res.status(400).json({ error: 'Phone number is required for cashiers' });
  }
  
  if (['admin', 'cashier', 'kitchen', 'bartender'].includes(role) && !password) {
    return res.status(400).json({ error: 'Password is required for this role' });
  }
  
  if (password) {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        return res.status(500).json({ error: 'Error hashing password' });
      }
      
      db.run(
        'INSERT INTO users (username, password, phone_number, pin_code, role) VALUES (?, ?, ?, ?, ?)',
        [username, hash, phone_number, pin_code, role],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ 
            id: this.lastID, 
            username, 
            phone_number, 
            role,
            created_at: new Date().toISOString()
          });
        }
      );
    });
  } else {
    // For waiter with PIN only
    db.run(
      'INSERT INTO users (username, password, phone_number, pin_code, role) VALUES (?, NULL, ?, ?, ?)',
      [username, phone_number, pin_code, role],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ 
          id: this.lastID, 
          username, 
          phone_number, 
          role,
          created_at: new Date().toISOString() 
        });
      }
    );
  }
});

// Update order status (for cashier)
app.put('/api/orders/:id/status', authenticateToken, checkRole(['cashier', 'admin']), (req, res) => {
  const orderId = req.params.id;
  const { status, payment_amount } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  // Start a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Update order status
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], function(err) {
      if (err) {
        console.error('Error updating order status:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error' });
      }
      
      // If order is completed or paid, update sales reports
      if (status === 'completed' || status === 'paid') {
        // Get order details
        db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
          if (err || !order) {
            console.error('Error fetching order:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Count food and drink items
          db.all(`
            SELECT item_type, SUM(quantity) as count
            FROM order_items
            WHERE order_id = ?
            GROUP BY item_type
          `, [orderId], (err, itemCounts) => {
            if (err) {
              console.error('Error counting items:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Database error' });
            }
            
            const foodCount = itemCounts.find(i => i.item_type === 'food')?.count || 0;
            const drinkCount = itemCounts.find(i => i.item_type === 'drink')?.count || 0;
            
            // Insert into sales_reports
            db.run(`
              INSERT INTO sales_reports (
                date,
                order_id,
                total_amount,
                food_items_count,
                drink_items_count
              ) VALUES (?, ?, ?, ?, ?)
            `, [
              new Date().toISOString().split('T')[0],
              orderId,
              order.total_amount,
              foodCount,
              drinkCount
            ], function(err) {
              if (err) {
                console.error('Error inserting sales report:', err);
                // Don't roll back, just continue with the order status update
                console.log('Continuing with order status update despite sales report error');
              } else {
                console.log(`Sales report created for order ${orderId}`);
              }
              
              // Commit the transaction
              db.run('COMMIT');
              
              // Emit socket events
              io.emit('order_status_updated', { 
                id: parseInt(orderId), 
                status,
                total_amount: order.total_amount
              });
              
              io.emit('sales_data_updated', {
                order_id: parseInt(orderId),
                total_amount: order.total_amount,
                timestamp: new Date().toISOString()
              });
              
              io.emit('admin_sales_updated', {
                timeRanges: ['daily', 'weekly', 'monthly', 'yearly'],
                order_id: parseInt(orderId),
                timestamp: new Date().toISOString()
              });
              
              res.json({ 
                id: orderId, 
                status, 
                message: 'Order status and sales data updated successfully' 
              });
            });
          });
        });
      } else {
        // If not completed/paid, just commit and return
        db.run('COMMIT');
        io.emit('order_status_updated', { id: parseInt(orderId), status });
        res.json({ 
          id: orderId, 
          status, 
          message: 'Order status updated successfully' 
        });
      }
    });
  });
});

// Tables Management API
app.get('/api/tables', (req, res) => {
  db.all('SELECT * FROM tables ORDER BY table_number', [], (err, tables) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(tables);
  });
});

app.put('/api/tables/:id/status', authenticateToken, checkRole(['waiter', 'cashier', 'admin']), (req, res) => {
  const { status, occupants } = req.body;
  const tableId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  console.log(`Updating table ${tableId} status to ${status} by ${req.user.username}`);
  
  // Convert status to lowercase for consistent processing
  const statusLower = status.toLowerCase();
  
  // Validate status
  const validStatuses = ['open', 'occupied', 'bill_requested', 'reserved', 'paid'];
  if (!validStatuses.includes(statusLower)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  // Different role permissions
  if (userRole === 'waiter' && statusLower === 'paid') {
    return res.status(403).json({ error: 'Waiters cannot mark tables as paid' });
  }
  
  if (userRole === 'cashier' && !['paid', 'open'].includes(statusLower)) {
    return res.status(403).json({ error: 'Cashiers can only mark tables as paid or open' });
  }
  
  db.run(
    'UPDATE tables SET status = ?, occupants = ?, waiter_id = ?, last_updated = CURRENT_TIMESTAMP WHERE table_number = ?',
    [statusLower, occupants || 0, userRole === 'waiter' ? userId : null, tableId],
    function(err) {
      if (err) {
        console.error('Error updating table status:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        console.error('Table not found:', tableId);
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Get the updated table to emit via socket
      db.get(
        `SELECT t.*, u.username as waiter_name 
         FROM tables t 
         LEFT JOIN users u ON t.waiter_id = u.id 
         WHERE t.table_number = ?`,
        [tableId],
        (err, table) => {
          if (!err && table) {
            console.log('Emitting table_status_updated event:', table);
            // Emit socket event for real-time updates
            io.emit('table_status_updated', table);
            
            // If the status is 'bill_requested', send a specific event for cashiers
            if (statusLower === 'bill_requested') {
              const billRequestEvent = { 
                table_id: table.id,
                table_number: table.table_number,
                waiter_id: userId,
                waiter_name: req.user.username,
                timestamp: new Date().toISOString()
              };
              console.log('Emitting bill_requested event:', billRequestEvent);
              io.emit('bill_requested', billRequestEvent);
            }
          }
          
          res.json({ 
            id: tableId, 
            status: statusLower, 
            message: 'Table status updated successfully' 
          });
        }
      );
    }
  );
});

// Add reservation to table
app.put('/api/tables/:id/reservation', authenticateToken, checkRole(['waiter', 'admin']), (req, res) => {
  const { name, time, date, phone, notes } = req.body;
  const tableId = req.params.id;
  
  if (!name || !time || !date) {
    return res.status(400).json({ error: 'Name, time and date are required' });
  }
  
  db.run(
    `UPDATE tables SET 
      status = 'reserved', 
      reservation_name = ?, 
      reservation_time = ?, 
      reservation_date = ?,
      reservation_phone = ?,
      reservation_notes = ?,
      last_updated = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, time, date, phone, notes, tableId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Get the updated table to emit via socket
      db.get('SELECT * FROM tables WHERE id = ?', [tableId], (err, table) => {
        if (!err && table) {
          // Emit socket event for real-time updates
          io.emit('table_reservation_updated', table);
        }
        
        res.json({ 
          id: tableId, 
          message: 'Reservation added successfully' 
        });
      });
    }
  );
});

// Get bill requests for cashiers
app.get('/api/bill-requests', authenticateToken, checkRole(['cashier', 'admin']), (req, res) => {
  console.log('Fetching bill requests for user:', req.user.username);
  db.all(
    `SELECT t.*, u.username as waiter_name 
     FROM tables t 
     LEFT JOIN users u ON t.waiter_id = u.id 
     WHERE t.status = 'bill_requested'
     ORDER BY t.last_updated DESC`,
    [],
    (err, tables) => {
      if (err) {
        console.error('Error fetching bill requests:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log('Found bill requests:', tables);
      res.json(tables);
    }
  );
});

// Get cashier dashboard data
app.get('/api/dashboard/cashier', authenticateToken, checkRole(['cashier']), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  db.all(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
      SUM(CASE WHEN status = 'completed' OR status = 'paid' THEN 1 ELSE 0 END) as completed_orders,
      SUM(CASE WHEN DATE(created_at) = ? THEN total_amount ELSE 0 END) as daily_revenue
    FROM orders
    WHERE DATE(created_at) = ?
  `, [today, today], (err, result) => {
    if (err) {
      console.error('Error fetching cashier dashboard data:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get category sales
    db.all(`
      SELECT 
        SUM(CASE WHEN oi.item_type = 'food' THEN oi.price * oi.quantity ELSE 0 END) as food_sales,
        SUM(CASE WHEN oi.item_type = 'drink' THEN oi.price * oi.quantity ELSE 0 END) as drink_sales
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE DATE(o.created_at) = ?
    `, [today], (err, categoryResult) => {
      if (err) {
        console.error('Error fetching category sales data:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        totalSales: result[0].total_orders || 0,
        pendingOrders: result[0].pending_orders || 0,
        completedOrders: result[0].completed_orders || 0,
        dailyRevenue: result[0].daily_revenue || 0,
        salesByCategory: {
          food: categoryResult[0]?.food_sales || 0,
          drinks: categoryResult[0]?.drink_sales || 0
        }
      });
    });
  });
});

// Get list of waiters
app.get('/api/waiters', authenticateToken, (req, res) => {
  db.all('SELECT id, username FROM users WHERE role = "waiter"', [], (err, waiters) => {
    if (err) {
      console.error('Error fetching waiters:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(waiters);
  });
});

// Get daily sales data for cashiers and admins
app.get('/api/sales/daily', authenticateToken, checkRole(['cashier', 'admin']), (req, res) => {
  const { date, waiter_id } = req.query;
  
  console.log(`Fetching daily sales for date: ${date}, waiter_id: ${waiter_id}, user:`, {
    id: req.user.id,
    username: req.user.username,
    role: req.user.role
  });
  
  // Use provided date or default to today
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  // Initialize params array with targetDate
  let params = [targetDate];
  
  // Build the waiter filter
  let waiterFilter = '';
  
  if (waiter_id && waiter_id !== 'all') {
    waiterFilter = "AND o.waiter_id = ?";
    params.push(waiter_id);
  }
  
  try {
    // Get overall sales totals
    const totalQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as completedOrders,
        COALESCE(SUM(o.total_amount), 0) as totalSales
      FROM orders o
      WHERE DATE(o.created_at) = DATE(?)
        AND o.status = 'completed'
        ${waiterFilter}
    `;
    
    // Get waiter-specific stats
    const waiterQuery = `
      SELECT 
        u.id as waiter_id,
        u.username as waiter_name,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales
      FROM users u
      LEFT JOIN orders o ON o.waiter_id = u.id 
        AND DATE(o.created_at) = DATE(?)
        AND o.status = 'completed'
      WHERE u.role = 'waiter'
        ${waiterFilter ? waiterFilter.replace('o.waiter_id', 'u.id') : ''}
      GROUP BY u.id, u.username
      ORDER BY total_sales DESC
    `;
    
    console.log('Executing queries with params:', {
      targetDate,
      waiter_id,
      waiterFilter,
      params,
      userRole: req.user.role,
      queries: {
        totalQuery,
        waiterQuery
      }
    });
    
    // First get the totals
    db.get(totalQuery, params, (err, totals) => {
      if (err) {
        console.error('Error fetching sales totals:', err);
        return res.status(500).json({ error: 'Database error fetching totals' });
      }
      
      console.log('Sales totals:', totals);
      
      // Then get waiter stats
      db.all(waiterQuery, params, (err, waiterStats) => {
        if (err) {
          console.error('Error fetching waiter stats:', err);
          return res.status(500).json({ error: 'Database error fetching waiter stats' });
        }
        
        console.log('Waiter stats:', waiterStats);
        
        // Ensure we have numeric values
        const processedTotals = {
          totalSales: parseFloat(totals?.totalSales || 0),
          completedOrders: parseInt(totals?.completedOrders || 0)
        };
        
        // Process waiter stats to ensure numeric values
        const processedWaiterStats = waiterStats.map(stat => ({
          ...stat,
          order_count: parseInt(stat.order_count || 0),
          total_sales: parseFloat(stat.total_sales || 0)
        }));
        
        // Combine into a single response
        const response = {
          totalSales: processedTotals.totalSales,
          completedOrders: processedTotals.completedOrders,
          waiterStats: processedWaiterStats
        };
        
        console.log('Sending response:', response);
        res.json(response);
      });
    });
  } catch (error) {
    console.error('Unexpected error in daily sales endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sales data by time range for admin only (must come AFTER the daily endpoint)
app.get('/api/sales/:timeRange', authenticateToken, checkRole(['admin']), (req, res) => {
  const { timeRange } = req.params;
  const { waiter_id } = req.query;
  
  // Validate timeRange
  const validTimeRanges = ['weekly', 'monthly', 'yearly'];
  if (!validTimeRanges.includes(timeRange)) {
    return res.status(400).json({ 
      error: 'Invalid time range', 
      [timeRange]: [] 
    });
  }

  // Initialize params array
  let params = [];
  let waiterFilter = '';
  
  if (waiter_id && waiter_id !== 'all') {
    waiterFilter = "AND o.waiter_id = ?";
    params.push(waiter_id);
  }

  // Get the date format based on time range
  let dateGrouping;
  switch(timeRange) {
    case 'weekly':
      dateGrouping = "strftime('%Y-%W', o.created_at)";
      break;
    case 'monthly':
      dateGrouping = "strftime('%Y-%m', o.created_at)";
      break;
    case 'yearly':
      dateGrouping = "strftime('%Y', o.created_at)";
      break;
    default:
      dateGrouping = "date(o.created_at)";
  }

  try {
    // Get overall sales totals with proper date filtering
    const totalQuery = `
      SELECT 
        ${dateGrouping} as date,
        COUNT(DISTINCT o.id) as completedOrders,
        COALESCE(SUM(o.total_amount), 0) as totalSales
      FROM orders o
      WHERE o.status = 'completed' ${waiterFilter}
      GROUP BY ${dateGrouping}
      ORDER BY ${dateGrouping} DESC
    `;
    
    // Get waiter-specific stats with proper date filtering
    const waiterQuery = `
      SELECT 
        ${dateGrouping} as date,
        u.id as waiter_id,
        u.username as waiter_name,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales
      FROM users u
      LEFT JOIN orders o ON o.waiter_id = u.id 
        AND o.status = 'completed'
      WHERE u.role = 'waiter'
        ${waiterFilter ? waiterFilter.replace('o.waiter_id', 'u.id') : ''}
      GROUP BY ${dateGrouping}, u.id, u.username
      ORDER BY ${dateGrouping} DESC, total_sales DESC
    `;
    
    console.log('Executing admin sales queries:', {
      timeRange,
      waiter_id,
      waiterFilter,
      params,
      queries: {
        totalQuery,
        waiterQuery
      }
    });
    
    // First get the totals
    db.all(totalQuery, params, (err, totals) => {
      if (err) {
        console.error('Error fetching admin sales totals:', err);
        return res.status(500).json({ error: 'Database error fetching totals' });
      }
      
      console.log('Admin sales totals:', totals);
      
      // Then get waiter stats
      db.all(waiterQuery, params, (err, waiterStats) => {
        if (err) {
          console.error('Error fetching admin waiter stats:', err);
          return res.status(500).json({ error: 'Database error fetching waiter stats' });
        }
        
        console.log('Admin waiter stats:', waiterStats);
        
        // Process and format the data
        const processedData = totals.map(total => {
          const dateStats = waiterStats.filter(stat => stat.date === total.date);
          return {
            date: total.date,
            totalSales: parseFloat(total.totalSales || 0),
            completedOrders: parseInt(total.completedOrders || 0),
            waiters: dateStats.map(stat => ({
              waiter_id: stat.waiter_id,
              waiter_name: stat.waiter_name,
              order_count: parseInt(stat.order_count || 0),
              total_sales: parseFloat(stat.total_sales || 0)
            }))
          };
        });
        
        // If no data for today, create default entry with all waiters
        if (timeRange === 'daily' && (!processedData.length || processedData[0].date !== new Date().toISOString().split('T')[0])) {
          const today = new Date().toISOString().split('T')[0];
          const defaultEntry = {
            date: today,
            totalSales: 0,
            completedOrders: 0,
            waiters: waiterStats.map(stat => ({
              waiter_id: stat.waiter_id,
              waiter_name: stat.waiter_name,
              order_count: parseInt(stat.order_count || 0),
              total_sales: parseFloat(stat.total_sales || 0)
            }))
          };
          processedData.unshift(defaultEntry);
        }
        
        // Return the data under the timeRange key
        res.json({
          [timeRange]: processedData
        });
      });
    });
  } catch (error) {
    console.error('Unexpected error in admin sales endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin-specific sales endpoint
app.get('/api/admin/sales/:timeRange', authenticateToken, checkRole(['admin']), (req, res) => {
    const { timeRange } = req.params;
  const { waiterId, date } = req.query;

  let dateFilter = '';
  let dateGrouping = '';
  let params = [];
  
  // Set up date filtering based on timeRange
    switch (timeRange) {
      case 'daily':
      dateFilter = "DATE(o.created_at) = DATE('now')";
      dateGrouping = "DATE(o.created_at)";
        break;
      case 'weekly':
      dateFilter = "DATE(o.created_at) >= DATE('now', '-7 days')";
      dateGrouping = "DATE(o.created_at)";
        break;
      case 'monthly':
      dateFilter = "DATE(o.created_at) >= DATE('now', '-30 days')";
      dateGrouping = "DATE(o.created_at)";
        break;
      case 'yearly':
      dateFilter = "DATE(o.created_at) >= DATE('now', '-365 days')";
      dateGrouping = "DATE(o.created_at)";
        break;
      case 'custom':
        // Use the provided date or default to today
        const customDate = date || new Date().toISOString().split('T')[0];
        dateFilter = "DATE(o.created_at) = ?";
        dateGrouping = "DATE(o.created_at)";
        params.push(customDate);
        break;
    default:
      dateFilter = "DATE(o.created_at) = DATE('now')";
      dateGrouping = "DATE(o.created_at)";
    }

  // Add waiter filter if specified
  const waiterFilter = waiterId && waiterId !== 'all' 
    ? "AND o.waiter_id = ?" 
    : "";
  if (waiterId && waiterId !== 'all') {
    params.push(waiterId);
  }

  try {
    // Get overall sales totals with proper date filtering
    const totalQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as completedOrders,
        COALESCE(SUM(o.total_amount), 0) as totalSales
      FROM orders o
      WHERE o.status = 'completed' 
      AND ${dateFilter}
      ${waiterFilter}
    `;
    
    // Get waiter-specific stats with proper date filtering
    const waiterQuery = `
        SELECT 
          u.id as waiter_id,
          u.username as waiter_name,
          COUNT(DISTINCT o.id) as order_count,
          COALESCE(SUM(o.total_amount), 0) as total_sales
        FROM users u
        LEFT JOIN orders o ON o.waiter_id = u.id
          AND o.status = 'completed'
        AND ${dateFilter}
        WHERE u.role = 'waiter'
        ${waiterId && waiterId !== 'all' ? 'AND u.id = ?' : ''}
        GROUP BY u.id, u.username
      ORDER BY total_sales DESC
    `;
    
    console.log('Executing admin sales queries:', {
      timeRange,
      waiterId,
      waiterFilter,
      params,
      queries: {
        totalQuery,
        waiterQuery
      }
    });

    // Execute queries
    db.get(totalQuery, params, (err, totals) => {
      if (err) {
        console.error('Error fetching total sales:', err);
        return res.status(500).json({ error: 'Error fetching total sales' });
      }

      db.all(waiterQuery, params, (err, waiterStats) => {
          if (err) {
          console.error('Error fetching waiter stats:', err);
          return res.status(500).json({ error: 'Error fetching waiter stats' });
          }

        // Process the data
        const processedData = {
          totalSales: totals.totalSales || 0,
          completedOrders: totals.completedOrders || 0,
          waiterStats: waiterStats.map(stat => ({
            ...stat,
            total_sales: parseFloat(stat.total_sales) || 0,
            order_count: parseInt(stat.order_count) || 0
          }))
        };

        console.log('Processed sales data:', processedData);
        
        // Return the data
        res.json(processedData);
      });
    });
  } catch (error) {
    console.error('Unexpected error in admin sales endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Use proxy routes
app.use('/api/proxy', proxyRoutes);

// Print receipt endpoint
app.post('/api/print-receipt', authenticateToken, checkRole(['cashier', 'waiter']), (req, res) => {
  const { type, items, orderId, timestamp, isDraft, waiterId, waiterName } = req.body;
  
  // In a real implementation, this would send the receipt to a printer
  // For now, we'll just log it and update database
  console.log(`Printing ${type} receipt for ${isDraft ? 'draft ' : ''}order ${orderId}:`, items);
  
  // Save receipt to database for offline sync and history
  const receiptData = JSON.stringify({
    type,
    items,
    timestamp,
    printed_by: req.user.id,
    isDraft: isDraft || false,
    waiterId,
    waiterName
  });
  
  // For draft orders, we save them in a separate table to track what was printed
  // This allows for proper tracking of pre-orders and kitchen/bar tickets
  if (isDraft) {
    const sql = `
      INSERT INTO draft_receipts 
      (order_id, type, data, timestamp, printed_by, waiter_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(
      sql, 
      [orderId, type, receiptData, timestamp, req.user.id, waiterId],
      function(err) {
        if (err) {
          console.error('Error saving draft receipt:', err);
          return res.status(500).json({ error: 'Failed to save draft receipt' });
        }
        
        // Insert each item into draft_order_items for easier querying
        items.forEach(item => {
          db.run(
            `INSERT INTO draft_order_items 
            (draft_id, item_id, name, quantity, price, item_type, waiter_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId, 
              item.id, 
              item.name, 
              item.quantity, 
              item.price, 
              item.item_type, 
              waiterId
            ],
            err => {
              if (err) {
                console.error('Error saving draft order item:', err);
              }
            }
          );
        });
        
        res.status(200).json({ 
          success: true, 
          message: `${type} receipt printed successfully`,
          receipt_id: this.lastID
        });
      }
    );
  } else {
    // For regular receipts from existing orders
    const sql = `
      INSERT INTO receipts 
      (order_id, type, data, timestamp, printed_by) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(
      sql, 
      [orderId, type, receiptData, timestamp, req.user.id],
      function(err) {
        if (err) {
          console.error('Error saving receipt:', err);
          return res.status(500).json({ error: 'Failed to save receipt' });
        }
        
        res.status(200).json({ 
          success: true, 
          message: `${type} receipt printed successfully`,
          receipt_id: this.lastID
        });
      }
    );
  }
});

// Endpoint to handle offline sync
app.post('/api/sync', authenticateToken, (req, res) => {
  const { entities } = req.body;
  
  if (!entities || !Array.isArray(entities)) {
    return res.status(400).json({ error: 'Invalid sync data format' });
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    entities.forEach(entity => {
      if (entity.type === 'order') {
        // Handle order sync
        const { items, waiter_id, total_amount, status, local_id, created_at } = entity.data;
        
        db.run(
          'INSERT INTO orders (waiter_id, cashier_id, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?)',
          [waiter_id, req.user.id, total_amount, status, created_at || new Date().toISOString()],
          function(err) {
            if (err) {
              console.error('Error syncing order:', err);
              errorCount++;
              return;
            }
            
            const order_id = this.lastID;
            
            // Record mapping between local and server IDs
            db.run(
              'INSERT INTO sync_mapping (local_id, server_id, entity_type) VALUES (?, ?, ?)',
              [local_id, order_id, 'order']
            );
            
            // Process order items
            items.forEach(item => {
              db.run(
                'INSERT INTO order_items (order_id, item_id, quantity, price, status, item_type) VALUES (?, ?, ?, ?, ?, ?)',
                [order_id, item.item_id, item.quantity, item.price, 'pending', item.item_type]
              );
            });
            
            successCount++;
          }
        );
      } else if (entity.type === 'receipt') {
        // Handle receipt sync
        const { order_id, receipt_type, receipt_data, created_at, local_id } = entity.data;
        
        db.run(
          'INSERT INTO receipts (order_id, receipt_type, receipt_data, created_at, is_synced) VALUES (?, ?, ?, ?, ?)',
          [order_id, receipt_type, receipt_data, created_at, 1],
          function(err) {
            if (err) {
              console.error('Error syncing receipt:', err);
              errorCount++;
              return;
            }
            
            // Record mapping between local and server IDs
            db.run(
              'INSERT INTO sync_mapping (local_id, server_id, entity_type) VALUES (?, ?, ?)',
              [local_id, this.lastID, 'receipt']
            );
            
            successCount++;
          }
        );
      }
    });
    
    db.run('COMMIT', [], (err) => {
      if (err) {
        console.error('Error committing sync transaction:', err);
        return res.status(500).json({ error: 'Database error during sync' });
      }
      
      res.json({
        success: true,
        synced: successCount,
        failed: errorCount,
        message: `Successfully synced ${successCount} entities. Failed: ${errorCount}.`
      });
    });
  });
});

// Add endpoint to get a specific order with all its items
app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const query = `
    WITH OrderItems AS (
      SELECT 
        oi.order_id,
        json_group_array(
          json_object(
            'id', oi.id,
            'item_id', oi.item_id,
            'quantity', oi.quantity,
            'price', oi.price,
            'name', i.name,
            'item_type', i.item_type,
            'status', oi.status
          )
        ) as items_json,
        SUM(oi.quantity * oi.price) as total_amount,
        SUM(oi.quantity) as item_count
      FROM order_items oi
      LEFT JOIN items i ON oi.item_id = i.id
      WHERE oi.order_id = ?
      GROUP BY oi.order_id
    )
    SELECT 
      o.*,
      u1.username as waiter_name,
      u2.username as cashier_name,
      COALESCE(oi.items_json, '[]') as items,
      COALESCE(oi.total_amount, 0) as total_amount,
      COALESCE(oi.item_count, 0) as item_count
     FROM orders o 
     LEFT JOIN users u1 ON o.waiter_id = u1.id 
     LEFT JOIN users u2 ON o.cashier_id = u2.id 
    LEFT JOIN OrderItems oi ON o.id = oi.order_id
    WHERE o.id = ?
  `;

  db.get(query, [req.params.id, req.params.id], (err, row) => {
      if (err) {
        console.error('Error fetching order:', err);
      return res.status(500).json({ message: 'Error fetching order', error: err.message });
      }
      
    if (!row) {
      return res.status(404).json({ message: 'Order not found' });
      }
      
    // Parse the JSON string of items
    const order = {
      ...row,
      items: JSON.parse(row.items || '[]')
          };
          
    res.json(order);
  });
});

// Add endpoint to update an entire order
app.put('/api/orders/:id', authenticateToken, checkRole(['admin']), (req, res) => {
  const orderId = req.params.id;
  const { items, total_amount, status } = req.body;
  
  console.log(`Updating order ${orderId}:`, { total_amount, status, itemCount: items?.length });
  
  // Begin transaction
  db.run('BEGIN TRANSACTION');
  
  // First update the main order record
  db.run(
    'UPDATE orders SET total_amount = ?, status = ? WHERE id = ?',
    [total_amount, status, orderId],
    function(err) {
      if (err) {
        console.error('Error updating order:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // If the items array was provided, update the order items
      if (items && Array.isArray(items)) {
        // First delete all existing items
        db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], function(err) {
          if (err) {
            console.error('Error deleting existing order items:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error while updating order items' });
          }
          
          // Then insert the new items
          let itemsProcessed = 0;
          
          // If no items, just commit the transaction
          if (items.length === 0) {
            db.run('COMMIT');
            
            // Emit socket event for real-time updates
            io.emit('order_updated', { 
              id: parseInt(orderId), 
              status, 
              total_amount,
              items: []
            });
            
            return res.json({
              id: orderId,
              status,
              total_amount,
              items: [],
              message: 'Order updated successfully'
            });
          }
          
          // Insert new items
          items.forEach(item => {
            db.run(
              'INSERT INTO order_items (order_id, item_id, quantity, price, status, item_type) VALUES (?, ?, ?, ?, ?, ?)',
              [
                orderId, 
                item.item_id || item.id, 
                item.quantity, 
                item.price, 
                item.status || 'pending', 
                item.item_type || 'food'
              ],
              function(err) {
                if (err) {
                  console.error('Error inserting order item:', err);
                  // Continue processing other items
                }
                
                itemsProcessed++;
                
                // When all items are processed, commit and respond
                if (itemsProcessed === items.length) {
                  db.run('COMMIT');
                  
                  // Emit socket event for real-time updates
                  io.emit('order_updated', { 
                    id: parseInt(orderId), 
                    status, 
                    total_amount,
                    items: items.length
                  });
                  
                  return res.json({
                    id: orderId,
                    status,
                    total_amount,
                    items,
                    message: 'Order updated successfully'
                  });
                }
              }
            );
          });
        });
      } else {
        // If no items to update, just commit and respond
        db.run('COMMIT');
        
        // Emit socket event for real-time updates
        io.emit('order_updated', { 
          id: parseInt(orderId), 
          status, 
          total_amount
        });
        
        return res.json({
          id: orderId,
          status,
          total_amount,
          message: 'Order updated successfully'
        });
      }
    }
  );
});

// Delete an entire order
app.delete('/api/orders/:id', authenticateToken, checkRole(['admin']), (req, res) => {
  const orderId = req.params.id;
  
  console.log(`Deleting order ${orderId}`);
  
  // Begin transaction
  db.run('BEGIN TRANSACTION');
  
  // First delete the order items
  db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], function(err) {
    if (err) {
      console.error('Error deleting order items:', err);
      db.run('ROLLBACK');
      return res.status(500).json({ error: 'Database error while deleting order items' });
    }
    
    // Then delete the order itself
    db.run('DELETE FROM orders WHERE id = ?', [orderId], function(err) {
      if (err) {
        console.error('Error deleting order:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error while deleting order' });
      }
      
      if (this.changes === 0) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Delete any receipts associated with the order
      db.run('DELETE FROM receipts WHERE order_id = ?', [orderId], function(err) {
        if (err) {
          console.error('Error deleting receipts:', err);
          // Continue with deletion even if receipt deletion fails
        }
        
        // Commit the transaction
        db.run('COMMIT');
        
        // Emit socket event for real-time updates
        io.emit('order_deleted', { id: parseInt(orderId) });
        
        return res.json({
          id: orderId,
          message: 'Order deleted successfully'
        });
      });
    });
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 