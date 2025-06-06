const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get all waiters
router.get('/', authenticateToken, checkRole(['admin', 'cashier']), async (req, res) => {
  try {
    const db = getDatabase();
    const waiters = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, username, role, status, created_at, updated_at
        FROM users 
        WHERE role = 'waiter'
        ORDER BY username
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get performance metrics for each waiter
    const waitersWithMetrics = await Promise.all(waiters.map(async (waiter) => {
      const metrics = await new Promise((resolve, reject) => {
        db.get(`
          SELECT 
            COUNT(*) as total_orders,
            SUM(total_amount) as total_sales,
            AVG(total_amount) as average_order_value
          FROM orders 
          WHERE waiter_id = ? 
          AND status = 'completed'
          AND created_at >= date('now', '-30 days')
        `, [waiter.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      return {
        ...waiter,
        metrics: {
          total_orders: metrics.total_orders || 0,
          total_sales: metrics.total_sales || 0,
          average_order_value: metrics.average_order_value || 0
        }
      };
    }));

    res.json(waitersWithMetrics);
  } catch (error) {
    console.error('Error fetching waiters:', error);
    res.status(500).json({ error: 'Failed to fetch waiters' });
  }
});

// Get waiter by ID
router.get('/:id', authenticateToken, checkRole(['admin', 'cashier']), async (req, res) => {
  try {
    const db = getDatabase();
    const waiter = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, username, role, status, created_at, updated_at
        FROM users 
        WHERE id = ? AND role = 'waiter'
      `, [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!waiter) {
      return res.status(404).json({ error: 'Waiter not found' });
    }

    // Get performance metrics
    const metrics = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total_amount) as total_sales,
          AVG(total_amount) as average_order_value
        FROM orders 
        WHERE waiter_id = ? 
        AND status = 'completed'
        AND created_at >= date('now', '-30 days')
      `, [waiter.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Get recent orders
    const recentOrders = await new Promise((resolve, reject) => {
      db.all(`
        SELECT o.*, COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.waiter_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 10
      `, [waiter.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      ...waiter,
      metrics: {
        total_orders: metrics.total_orders || 0,
        total_sales: metrics.total_sales || 0,
        average_order_value: metrics.average_order_value || 0
      },
      recent_orders: recentOrders
    });
  } catch (error) {
    console.error('Error fetching waiter:', error);
    res.status(500).json({ error: 'Failed to fetch waiter' });
  }
});

// Get waiter performance
router.get('/:id/performance', authenticateToken, checkRole(['admin', 'cashier']), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const db = getDatabase();

    const performance = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_orders,
          SUM(total_amount) as total_sales,
          AVG(total_amount) as average_order_value
        FROM orders 
        WHERE waiter_id = ? 
        AND status = 'completed'
        ${start_date && end_date ? 'AND created_at BETWEEN ? AND ?' : ''}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, 
      start_date && end_date ? [req.params.id, start_date, end_date] : [req.params.id],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(performance);
  } catch (error) {
    console.error('Error fetching waiter performance:', error);
    res.status(500).json({ error: 'Failed to fetch waiter performance' });
  }
});

module.exports = router; 