const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Delete the database file if it exists
const dbPath = path.join(__dirname, 'pos.db');
try {
  if (fs.existsSync(dbPath)) {
    console.log('Deleting existing database file...');
    fs.unlinkSync(dbPath);
    console.log('Database file deleted successfully.');
  }
} catch (err) {
  console.error('Error deleting database file:', err);
  process.exit(1);
}

// Create a new database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  }
  console.log('New database file created successfully.');
  initializeDatabase();
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
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
        return;
      }
      console.log('Users table created successfully.');
      createDefaultUsers();
    });

    // Items table (food and drinks)
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      item_type TEXT NOT NULL,
      image TEXT,
      image_data BLOB,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating items table:', err);
      else console.log('Items table created successfully.');
    });

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      waiter_id INTEGER,
      cashier_id INTEGER,
      table_number INTEGER,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (waiter_id) REFERENCES users (id),
      FOREIGN KEY (cashier_id) REFERENCES users (id)
    )`, (err) => {
      if (err) console.error('Error creating orders table:', err);
      else console.log('Orders table created successfully.');
    });

    // Order items table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      item_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL,
      item_type TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (item_id) REFERENCES items (id)
    )`, (err) => {
      if (err) console.error('Error creating order_items table:', err);
      else console.log('Order items table created successfully.');
    });

    // Terminals table
    db.run(`CREATE TABLE IF NOT EXISTS terminals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      terminal_type TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating terminals table:', err);
      else console.log('Terminals table created successfully.');
    });

    // Add sync_status table for offline/online sync
    db.run(`CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      is_synced BOOLEAN DEFAULT 0,
      last_sync_attempt DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating sync_status table:', err);
      else console.log('Sync status table created successfully.');
    });

    // Add settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    )`, (err) => {
      if (err) console.error('Error creating settings table:', err);
      else console.log('Settings table created successfully.');
      createDefaultSettings();
    });

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
    )`, (err) => {
      if (err) console.error('Error creating sales_reports table:', err);
      else console.log('Sales reports table created successfully.');
    });
  });
}

// Create default users
function createDefaultUsers() {
  const defaultUsers = [
    { username: 'admin', password: 'admin123', role: 'admin', phone_number: null, pin_code: null },
    { username: 'cashier1', password: 'cashier123', role: 'cashier', phone_number: '1234567890', pin_code: null },
    { username: 'waiter1', password: null, role: 'waiter', phone_number: null, pin_code: '123456' },
    { username: 'kitchen1', password: 'kitchen123', role: 'kitchen', phone_number: null, pin_code: null },
    { username: 'bartender1', password: 'bartender123', role: 'bartender', phone_number: null, pin_code: null }
  ];

  console.log('Creating default users...');
  
  // Use Promise to handle async operations
  const promises = defaultUsers.map(user => {
    return new Promise((resolve, reject) => {
      if (user.password) {
        bcrypt.hash(user.password, 10, (err, hash) => {
          if (err) {
            console.error('Error hashing password:', err);
            return reject(err);
          }
          
          db.run('INSERT INTO users (username, password, phone_number, pin_code, role) VALUES (?, ?, ?, ?, ?)',
            [user.username, hash, user.phone_number, user.pin_code, user.role],
            function(err) {
              if (err) {
                console.error(`Error creating ${user.role} user:`, err);
                return reject(err);
              }
              console.log(`Default ${user.role} user "${user.username}" created`);
              resolve();
            }
          );
        });
      } else {
        // For users with PIN only (no password)
        db.run('INSERT INTO users (username, password, phone_number, pin_code, role) VALUES (?, ?, ?, ?, ?)',
          [user.username, null, user.phone_number, user.pin_code, user.role],
          function(err) {
            if (err) {
              console.error(`Error creating ${user.role} user:`, err);
              return reject(err);
            }
            console.log(`Default ${user.role} user "${user.username}" created`);
            resolve();
          }
        );
      }
    });
  });

  Promise.all(promises)
    .then(() => {
      console.log('All default users created successfully');
    })
    .catch(err => {
      console.error('Error creating some users:', err);
    });
}

// Create default settings
function createDefaultSettings() {
  const defaultSettings = [
    { key: 'auto_mark_drinks_delay', value: '300' }, // 5 minutes in seconds
    { key: 'online_sync_enabled', value: 'true' },
    { key: 'lan_sync_enabled', value: 'true' }
  ];

  console.log('Creating default settings...');
  
  defaultSettings.forEach(setting => {
    db.run('INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)',
      [setting.key, setting.value],
      function(err) {
        if (err) {
          console.error(`Error creating setting ${setting.key}:`, err);
        } else {
          console.log(`Default setting "${setting.key}" created`);
        }
      }
    );
  });
}

console.log('Database reset script completed. Run the server to use the new database.'); 