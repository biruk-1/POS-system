const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db = null;

// Default users for initialization
const defaultUsers = [
  { username: 'admin', password: 'admin123', role: 'admin', phone_number: null, pin: null },
  { username: 'cashier1', password: 'cashier123', role: 'cashier', phone_number: '1234567890', pin: null },
  { username: 'waiter1', password: null, role: 'waiter', phone_number: null, pin: '123456' },
  { username: 'kitchen1', password: 'kitchen123', role: 'kitchen', phone_number: null, pin: null },
  { username: 'bartender1', password: 'bartender123', role: 'bartender', phone_number: null, pin: null }
];

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, '../../data/pos.db');
    const dbDir = path.dirname(dbPath);

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }

      console.log('Connected to SQLite database');

      try {
        // Enable foreign keys
        await new Promise((resolve, reject) => {
          db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Create tables in correct order (users first, then tables with foreign keys)
        await new Promise((resolve, reject) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE NOT NULL,
              password TEXT,
              pin TEXT,
              phone_number TEXT,
              role TEXT NOT NULL,
              status TEXT DEFAULT 'active',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              description TEXT,
              price REAL NOT NULL,
              item_type TEXT NOT NULL,
              category TEXT,
              image TEXT,
              status TEXT DEFAULT 'active',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS tables (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              table_number INTEGER UNIQUE NOT NULL,
              capacity INTEGER DEFAULT 4,
              status TEXT DEFAULT 'available',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS orders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              table_number INTEGER,
              waiter_id INTEGER,
              status TEXT DEFAULT 'pending',
              total_amount REAL DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (waiter_id) REFERENCES users(id) ON DELETE SET NULL
            )
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS order_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              order_id INTEGER,
              item_id INTEGER,
              quantity INTEGER DEFAULT 1,
              price REAL NOT NULL,
              notes TEXT,
              status TEXT DEFAULT 'pending',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
              FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
            )
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS bill_requests (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              order_id INTEGER,
              table_number INTEGER NOT NULL,
              status TEXT DEFAULT 'pending',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Initialize default users if they don't exist
        for (const user of defaultUsers) {
          try {
            // Check if user exists
            const existingUser = await new Promise((resolve, reject) => {
              db.get('SELECT id FROM users WHERE username = ?', [user.username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
            });

            if (!existingUser) {
              // Hash password or PIN
              const hashedPassword = user.password ? await bcrypt.hash(user.password, 10) : null;
              const hashedPin = user.pin ? await bcrypt.hash(user.pin, 10) : null;

              await new Promise((resolve, reject) => {
                db.run(
                  `INSERT INTO users (username, password, pin, phone_number, role) 
                   VALUES (?, ?, ?, ?, ?)`,
                  [user.username, hashedPassword, hashedPin, user.phone_number, user.role],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });

              console.log(`Created default user: ${user.username}`);
            } else {
              console.log(`User ${user.username} already exists`);
            }
          } catch (error) {
            console.error(`Error processing user ${user.username}:`, error);
          }
        }

        resolve();
      } catch (error) {
        console.error('Error initializing database:', error);
        reject(error);
      }
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT,
        phone_number TEXT,
        pin_code TEXT,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Items table
      db.run(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        item_type TEXT NOT NULL,
        image TEXT,
        image_data BLOB,
        category TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Orders table
      db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number INTEGER,
        waiter_id INTEGER,
        status TEXT DEFAULT 'pending',
        total_amount REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(waiter_id) REFERENCES users(id)
      )`);

      // Order items table
      db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        item_id INTEGER,
        quantity INTEGER DEFAULT 1,
        price REAL,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(item_id) REFERENCES items(id)
      )`);

      // Tables table
      db.run(`CREATE TABLE IF NOT EXISTS tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number INTEGER UNIQUE NOT NULL,
        status TEXT DEFAULT 'available',
        capacity INTEGER DEFAULT 4,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      resolve();
    });
  });
};

const initializeDefaultUsers = async () => {
  console.log('Checking for default users...');
  
  for (const user of defaultUsers) {
    try {
      const existingUser = await getUserByUsername(user.username);
      
      if (!existingUser) {
        console.log(`Creating default user: ${user.username}`);
        if (user.password) {
          const hash = await bcrypt.hash(user.password, 10);
          await createUser(user.username, hash, user.phone_number, user.pin, user.role);
        } else {
          await createUser(user.username, null, user.phone_number, user.pin, user.role);
        }
      } else {
        console.log(`User ${user.username} already exists with role ${existingUser.role}`);
      }
    } catch (error) {
      console.error(`Error processing user ${user.username}:`, error);
    }
  }
};

const getUserByUsername = (username) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const createUser = (username, password, phone_number, pin_code, role) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (username, password, phone_number, pin_code, role) VALUES (?, ?, ?, ?, ?)',
      [username, password, phone_number, pin_code, role],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
};

// Export the database instance and initialization function
module.exports = {
  initializeDatabase,
  getDatabase
}; 