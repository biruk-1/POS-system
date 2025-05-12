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

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_only_for_development';

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

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
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
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

    // Add sales reports table
    db.run(`CREATE TABLE IF NOT EXISTS sales_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
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
  });
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check user role
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
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
app.get('/api/items', authenticateToken, (req, res) => {
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
  const { items, table_number, total_amount } = req.body;
  const user_id = req.user.id;
  const user_role = req.user.role;
  
  let waiter_id = null;
  let cashier_id = null;
  
  if (user_role === 'waiter') {
    waiter_id = user_id;
  } else {
    cashier_id = user_id;
    waiter_id = req.body.waiter_id || null;
  }

  db.run('BEGIN TRANSACTION');

  db.run(
    'INSERT INTO orders (waiter_id, cashier_id, table_number, total_amount, status) VALUES (?, ?, ?, ?, ?)',
    [waiter_id, cashier_id, table_number, total_amount, 'pending'],
    function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error' });
      }

      const order_id = this.lastID;
      let completed = 0;

      items.forEach(item => {
        db.run(
          'INSERT INTO order_items (order_id, item_id, quantity, price, status, item_type) VALUES (?, ?, ?, ?, ?, ?)',
          [order_id, item.item_id, item.quantity, item.price, 'pending', item.item_type],
          (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Database error' });
            }

            completed++;
            if (completed === items.length) {
              db.run('COMMIT');
              
              // Record sync status for offline/online sync
              db.run('INSERT INTO sync_status (entity_type, entity_id, is_synced) VALUES (?, ?, ?)',
                ['order', order_id, 0]);
                
              res.json({ 
                id: order_id, 
                items, 
                total_amount,
                table_number,
                waiter_id,
                cashier_id,
                status: 'pending',
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
  
  // Different queries based on user role
  switch(userRole) {
    case 'admin':
    case 'cashier':
      query = `SELECT o.*, u1.username as waiter_name, u2.username as cashier_name 
               FROM orders o 
               LEFT JOIN users u1 ON o.waiter_id = u1.id 
               LEFT JOIN users u2 ON o.cashier_id = u2.id 
               ORDER BY o.created_at DESC`;
      break;
    case 'waiter':
      query = `SELECT o.*, u1.username as waiter_name, u2.username as cashier_name 
               FROM orders o 
               LEFT JOIN users u1 ON o.waiter_id = u1.id 
               LEFT JOIN users u2 ON o.cashier_id = u2.id 
               WHERE o.waiter_id = ?
               ORDER BY o.created_at DESC`;
      params = [req.user.id];
      break;
    case 'kitchen':
      query = `SELECT DISTINCT o.*, u1.username as waiter_name, u2.username as cashier_name 
               FROM orders o 
               JOIN order_items oi ON o.id = oi.order_id
               LEFT JOIN users u1 ON o.waiter_id = u1.id 
               LEFT JOIN users u2 ON o.cashier_id = u2.id 
               WHERE oi.item_type = 'food'
               ORDER BY o.created_at DESC`;
      break;
    case 'bartender':
      query = `SELECT DISTINCT o.*, u1.username as waiter_name, u2.username as cashier_name 
               FROM orders o 
               JOIN order_items oi ON o.id = oi.order_id
               LEFT JOIN users u1 ON o.waiter_id = u1.id 
               LEFT JOIN users u2 ON o.cashier_id = u2.id 
               WHERE oi.item_type = 'drink'
               ORDER BY o.created_at DESC`;
      break;
    default:
      return res.status(403).json({ error: 'Unauthorized role' });
  }
  
  db.all(query, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(orders);
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
      query = `SELECT oi.*, i.name, i.description
               FROM order_items oi
               JOIN items i ON oi.item_id = i.id
               WHERE oi.order_id = ?`;
      break;
    case 'kitchen':
      query = `SELECT oi.*, i.name, i.description
               FROM order_items oi
               JOIN items i ON oi.item_id = i.id
               WHERE oi.order_id = ? AND oi.item_type = 'food'`;
      break;
    case 'bartender':
      query = `SELECT oi.*, i.name, i.description
               FROM order_items oi
               JOIN items i ON oi.item_id = i.id
               WHERE oi.order_id = ? AND oi.item_type = 'drink'`;
      break;
    default:
      return res.status(403).json({ error: 'Unauthorized role' });
  }
  
  db.all(query, params, (err, items) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(items);
  });
});

// Update order item status (for kitchen/bartender)
app.put('/api/order-items/:id/status', authenticateToken, checkRole(['kitchen', 'bartender', 'admin']), (req, res) => {
  const { status } = req.body;
  const userRole = req.user.role;
  
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
    params = [status, req.params.id];
  } else {
    query = 'UPDATE order_items SET status = ? WHERE id = ? AND item_type = ?';
    params = [status, req.params.id, allowedType];
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
      ['order_item', req.params.id, 0]);
    
    res.json({ id: req.params.id, status });
  });
});

// Terminal routes for Kitchen and Bartender display
app.get('/api/terminal/kitchen', authenticateToken, checkRole(['kitchen', 'admin']), (req, res) => {
  const query = `
    SELECT o.id as order_id, o.table_number, o.created_at as order_time,
           oi.id as item_id, oi.quantity, oi.status as item_status,
           i.name as item_name, i.description as item_description
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN items i ON oi.item_id = i.id
    WHERE oi.item_type = 'food' AND oi.status != 'ready'
    ORDER BY o.created_at ASC, oi.id ASC
  `;
  
  db.all(query, [], (err, items) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(items);
  });
});

app.get('/api/terminal/bartender', authenticateToken, checkRole(['bartender', 'admin']), (req, res) => {
  const query = `
    SELECT o.id as order_id, o.table_number, o.created_at as order_time,
           oi.id as item_id, oi.quantity, oi.status as item_status,
           i.name as item_name, i.description as item_description
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN items i ON oi.item_id = i.id
    WHERE oi.item_type = 'drink' AND oi.status != 'ready'
    ORDER BY o.created_at ASC, oi.id ASC
  `;
  
  db.all(query, [], (err, items) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(items);
  });
});

// Report routes
app.post('/api/reports/generate', authenticateToken, checkRole(['admin']), (req, res) => {
  const { reportType, startDate, endDate } = req.body;
  
  console.log(`Generating ${reportType} report from ${startDate} to ${endDate}`);
  
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
  
  // Construct SQL query based on report type
  let query = '';
  let params = [startDate, endDate];
  
  switch(reportType) {
    case 'sales':
      query = `
        SELECT 
          date(o.created_at) as date, 
          COUNT(o.id) as orders, 
          SUM(o.total_amount) as revenue,
          AVG(o.total_amount) as avgOrder,
          (
            SELECT i.name 
            FROM order_items oi 
            JOIN items i ON oi.item_id = i.id 
            WHERE date(o.created_at) = date(oi.created_at) 
            GROUP BY oi.item_id 
            ORDER BY COUNT(oi.id) DESC 
            LIMIT 1
          ) as topItem
        FROM orders o
        WHERE date(o.created_at) BETWEEN ? AND ?
        GROUP BY date(o.created_at)
        ORDER BY date(o.created_at) DESC
      `;
      break;
    case 'items':
      query = `
        SELECT 
          date(o.created_at) as date,
          COUNT(oi.id) as count,
          SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.item_type = 'food' AND date(o.created_at) BETWEEN ? AND ?
        GROUP BY date(o.created_at)
        ORDER BY date(o.created_at) DESC
      `;
      break;
    case 'drinks':
      query = `
        SELECT 
          date(o.created_at) as date,
          COUNT(oi.id) as count,
          SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.item_type = 'drink' AND date(o.created_at) BETWEEN ? AND ?
        GROUP BY date(o.created_at)
        ORDER BY date(o.created_at) DESC
      `;
      break;
    case 'staff':
      query = `
        SELECT 
          u.username as staff,
          u.role as role,
          COUNT(o.id) as orders,
          SUM(o.total_amount) as revenue
        FROM orders o
        JOIN users u ON (o.waiter_id = u.id OR o.cashier_id = u.id)
        WHERE date(o.created_at) BETWEEN ? AND ?
        GROUP BY u.id
        ORDER BY revenue DESC
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
      return res.json([]);
    }
    
    // Format data for consumption by the frontend and ensure all numeric fields are properly formatted
    const formattedData = rows.map((row, index) => {
      // Ensure all numeric fields are properly converted to numbers with default values
      const revenue = row.revenue !== null && row.revenue !== undefined ? Number(row.revenue) : 0;
      const avgOrder = row.avgOrder !== null && row.avgOrder !== undefined ? Number(row.avgOrder) : 0;
      const orders = row.orders !== null && row.orders !== undefined ? Number(row.orders) : 0;
      const count = row.count !== null && row.count !== undefined ? Number(row.count) : 0;
      
      return {
        id: index + 1,
        ...row,
        revenue,
        avgOrder,
        orders,
        count
      };
    });
    
    // Simply return the data - removing the complex report saving functionality that may be causing errors
    res.json(formattedData);
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
  const { status, payment_amount } = req.body;
  const orderId = req.params.id;
  
  if (!['pending', 'in-progress', 'ready', 'completed', 'paid', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  // Begin transaction
  db.run('BEGIN TRANSACTION');
  
  // Update order status
  db.run(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, orderId],
    function(err) {
      if (err) {
        db.run('ROLLBACK');
        console.error('Error updating order status:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // If no order was found or updated
      if (this.changes === 0) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // If payment is being processed, record it
      if ((status === 'paid' || status === 'completed') && payment_amount) {
        db.run(
          'INSERT INTO payments (order_id, amount, cashier_id, payment_date) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          [orderId, payment_amount, req.user.id],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              console.error('Error recording payment:', err);
              return res.status(500).json({ error: 'Database error while recording payment' });
            }
            
            // Commit transaction and send response
            db.run('COMMIT');
            
            // Emit socket event for real-time updates
            io.emit('order_status_updated', { id: parseInt(orderId), status, payment_amount });
            
            res.json({ id: orderId, status, message: 'Order status and payment updated successfully' });
          }
        );
      } else {
        // Just commit the status update
        db.run('COMMIT');
        
        // Emit socket event for real-time updates
        io.emit('order_status_updated', { id: parseInt(orderId), status });
        
        res.json({ id: orderId, status, message: 'Order status updated successfully' });
      }
    }
  );
});

// Tables Management API
app.get('/api/tables', authenticateToken, (req, res) => {
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

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 