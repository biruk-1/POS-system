const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Get the database path
const dbPath = path.join(__dirname, '..', 'src', 'pos.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Start transaction
db.serialize(() => {
  console.log('Starting database cleanup...');
  
  db.run('BEGIN TRANSACTION');

  // List of tables to clear
  const tables = [
    'order_items',
    'orders',
    'receipts',
    'draft_receipts',
    'draft_order_items',
    'sales_reports',
    'payments',
    'sync_status',
    'sync_mapping',
    'bill_requests'
  ];

  // Clear each table
  tables.forEach(table => {
    db.run(`DELETE FROM ${table}`, (err) => {
      if (err) {
        console.error(`Error clearing table ${table}:`, err);
      } else {
        console.log(`Cleared table: ${table}`);
      }
    });
  });

  // Reset table statuses
  db.run("UPDATE tables SET status = 'open', current_order_id = NULL, current_waiter_id = NULL", (err) => {
    if (err) {
      console.error('Error resetting table statuses:', err);
    } else {
      console.log('Reset table statuses');
    }
  });

  // Commit transaction
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing transaction:', err);
      db.run('ROLLBACK');
    } else {
      console.log('Transaction committed successfully');
    }

    // Vacuum the database to reclaim space
    db.run('VACUUM', (err) => {
      if (err) {
        console.error('Error vacuuming database:', err);
      } else {
        console.log('Database vacuumed successfully');
      }

      // Close the database connection
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
          console.log('Database reset completed successfully!');
        }
      });
    });
  });
}); 