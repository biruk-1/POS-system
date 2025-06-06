const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get all tables
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const tables = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM tables ORDER BY table_number', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Get table by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const table = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tables WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json(table);
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// Create new table (admin only)
router.post('/', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { table_number, capacity } = req.body;
    const db = getDatabase();

    if (!table_number) {
      return res.status(400).json({ error: 'Table number is required' });
    }

    // Check if table number already exists
    const existingTable = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tables WHERE table_number = ?', [table_number], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingTable) {
      return res.status(400).json({ error: 'Table number already exists' });
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO tables (table_number, capacity) VALUES (?, ?)',
        [table_number, capacity || 4],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    const newTable = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tables WHERE id = ?', [result], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(newTable);
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// Update table (admin only)
router.put('/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { table_number, capacity, status } = req.body;
    const db = getDatabase();

    const currentTable = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tables WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!currentTable) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // If changing table number, check if new number exists
    if (table_number && table_number !== currentTable.table_number) {
      const existingTable = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM tables WHERE table_number = ?', [table_number], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingTable) {
        return res.status(400).json({ error: 'Table number already exists' });
      }
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE tables 
         SET table_number = ?, capacity = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [table_number, capacity, status, req.params.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    const updatedTable = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tables WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(updatedTable);
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Update table status
router.patch('/:id/status', authenticateToken, checkRole(['admin', 'waiter']), async (req, res) => {
  try {
    const { status } = req.body;
    const db = getDatabase();

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE tables SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, req.params.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const updatedTable = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tables WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(updatedTable);
  } catch (error) {
    console.error('Error updating table status:', error);
    res.status(500).json({ error: 'Failed to update table status' });
  }
});

// Delete table (admin only)
router.delete('/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const db = getDatabase();
    
    // Check if table has any active orders
    const activeOrders = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count 
         FROM orders 
         WHERE table_number = (SELECT table_number FROM tables WHERE id = ?) 
         AND status IN ('pending', 'preparing', 'ready')`,
        [req.params.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    if (activeOrders > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete table with active orders',
        message: 'Please complete or cancel all active orders for this table first'
      });
    }

    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM tables WHERE id = ?', [req.params.id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Table not found' });
    }

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

module.exports = router; 