const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_only_for_development';

// Middleware
app.use(cors());
app.use(express.json());

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

app.post('/api/items', authenticateToken, checkRole(['admin']), (req, res) => {
  const { name, description, price, item_type } = req.body;
  
  if (!['food', 'drink'].includes(item_type)) {
    return res.status(400).json({ error: 'Item type must be either "food" or "drink"' });
  }
  
  db.run(
    'INSERT INTO items (name, description, price, item_type) VALUES (?, ?, ?, ?)',
    [name, description, price, item_type],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: this.lastID, name, description, price, item_type });
    }
  );
});

app.put('/api/items/:id', authenticateToken, checkRole(['admin']), (req, res) => {
  const { name, description, price, item_type } = req.body;
  
  if (!['food', 'drink'].includes(item_type)) {
    return res.status(400).json({ error: 'Item type must be either "food" or "drink"' });
  }
  
  db.run(
    'UPDATE items SET name = ?, description = ?, price = ?, item_type = ? WHERE id = ?',
    [name, description, price, item_type, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: req.params.id, name, description, price, item_type });
    }
  );
});

app.delete('/api/items/:id', authenticateToken, checkRole(['admin']), (req, res) => {
  db.run(
    'DELETE FROM items WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ id: req.params.id });
    }
  );
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

// Report routes for admin
app.get('/api/reports/sales', authenticateToken, checkRole(['admin']), (req, res) => {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  const query = `
    SELECT 
      DATE(o.created_at) as date,
      SUM(o.total_amount) as total_sales,
      COUNT(DISTINCT o.id) as total_orders,
      SUM(CASE WHEN oi.item_type = 'food' THEN oi.quantity ELSE 0 END) as food_items_count,
      SUM(CASE WHEN oi.item_type = 'drink' THEN oi.quantity ELSE 0 END) as drink_items_count
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE DATE(o.created_at) BETWEEN ? AND ?
    GROUP BY DATE(o.created_at)
    ORDER BY DATE(o.created_at) ASC
  `;
  
  db.all(query, [start_date, end_date], (err, report) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(report);
  });
});

app.get('/api/reports/items', authenticateToken, checkRole(['admin']), (req, res) => {
  const { start_date, end_date } = req.query;
  
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }
  
  const query = `
    SELECT 
      i.id,
      i.name,
      i.item_type,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.quantity * oi.price) as total_amount
    FROM items i
    JOIN order_items oi ON i.id = oi.item_id
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.created_at) BETWEEN ? AND ?
    GROUP BY i.id, i.name
    ORDER BY total_quantity DESC
  `;
  
  db.all(query, [start_date, end_date], (err, report) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(report);
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 