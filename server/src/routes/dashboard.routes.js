const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get cashier dashboard data
router.get('/cashier', authenticateToken, checkRole(['cashier']), async (req, res) => {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Get today's orders
    const orders = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          o.id,
          o.table_number,
          o.total_amount,
          o.status,
          o.created_at,
          u.username as waiter_name
        FROM orders o
        LEFT JOIN users u ON o.waiter_id = u.id
        WHERE DATE(o.created_at) = DATE(?)
        ORDER BY o.created_at DESC
      `, [today], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get pending bill requests
    const billRequests = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          o.id,
          o.table_number,
          o.total_amount,
          o.created_at,
          u.username as waiter_name
        FROM orders o
        LEFT JOIN users u ON o.waiter_id = u.id
        WHERE o.status = 'pending'
        ORDER BY o.created_at ASC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      orders,
      billRequests
    });
  } catch (error) {
    console.error('Error fetching cashier dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin dashboard data
router.get('/admin', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Get today's sales summary
    const salesSummary = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_sales,
          AVG(total_amount) as average_order_value
        FROM orders
        WHERE DATE(created_at) = DATE(?)
      `, [today], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Get recent orders
    const recentOrders = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          o.id,
          o.table_number,
          o.total_amount,
          o.status,
          o.created_at,
          u.username as waiter_name
        FROM orders o
        LEFT JOIN users u ON o.waiter_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      salesSummary,
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 