const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a database connection
const db = new sqlite3.Database(path.join(__dirname, '../../database.sqlite'), (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to the database');
});

// Start a transaction
db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  // Delete order items first
  db.run(`
    DELETE FROM OrderItems 
    WHERE order_id IN (
      SELECT id FROM Orders 
      WHERE date(created_at) = '2025-05-29'
    )
  `, function(err) {
    if (err) {
      console.error('Error deleting order items:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log(`Deleted ${this.changes} order items`);
  });

  // Delete orders
  db.run(`
    DELETE FROM Orders 
    WHERE date(created_at) = '2025-05-29'
  `, function(err) {
    if (err) {
      console.error('Error deleting orders:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log(`Deleted ${this.changes} orders`);
  });

  // Commit the transaction
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing transaction:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('Cleanup completed successfully!');
    db.close();
  });
}); 