const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Starting database cleanup...');

db.serialize(() => {
  // Begin transaction
  db.run('BEGIN TRANSACTION');

  // Delete all sales and orders related data
  const tables = [
    'order_items',
    'orders',
    'receipts',
    'draft_receipts',
    'draft_order_items',
    'sales_reports',
    'payments',
    'sync_status',
    'sync_mapping'
  ];

  tables.forEach(table => {
    db.run(`DELETE FROM ${table}`, (err) => {
      if (err) {
        console.error(`Error deleting from ${table}:`, err);
      } else {
        console.log(`Successfully cleared ${table}`);
      }
    });
  });

  // Reset table statuses
  db.run("UPDATE tables SET status = 'open', occupants = 0, waiter_id = NULL, reservation_name = NULL, reservation_time = NULL, reservation_date = NULL, reservation_phone = NULL, reservation_notes = NULL", (err) => {
    if (err) {
      console.error('Error resetting tables:', err);
    } else {
      console.log('Successfully reset all tables to open status');
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
        }
      });
    });
  });
}); 