const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get all bill requests
router.get('/', authenticateToken, checkRole(['admin', 'cashier']), async (req, res) => {
  try {
    const db = getDatabase();
    
    const billRequests = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          br.id,
          br.order_id,
          br.table_number,
          br.status,
          br.created_at,
          o.total_amount,
          u.username as waiter_name
        FROM bill_requests br
        LEFT JOIN orders o ON br.order_id = o.id
        LEFT JOIN users u ON o.waiter_id = u.id
        ORDER BY br.created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(billRequests);
  } catch (error) {
    console.error('Error fetching bill requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new bill request
router.post('/', authenticateToken, checkRole(['waiter']), async (req, res) => {
  try {
    const db = getDatabase();
    const { order_id, table_number } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO bill_requests (order_id, table_number, status, created_at)
        VALUES (?, ?, 'pending', datetime('now'))
      `, [order_id, table_number], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    res.status(201).json({
      id: result,
      order_id,
      table_number,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating bill request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update bill request status
router.patch('/:id/status', authenticateToken, checkRole(['admin', 'cashier']), async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { status } = req.body;
    
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE bill_requests
        SET status = ?
        WHERE id = ?
      `, [status, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ id, status });
  } catch (error) {
    console.error('Error updating bill request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 