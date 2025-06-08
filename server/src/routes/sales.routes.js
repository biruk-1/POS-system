const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get daily sales
router.get('/daily', authenticateToken, checkRole(['admin', 'cashier']), async (req, res) => {
  try {
    const db = getDatabase();
    const { date, waiter } = req.query;
    
    console.log('Fetching daily sales with params:', { date, waiter });
    
    // Build query parameters
    const params = [];
    let dateCondition = 'DATE(o.created_at, "localtime") = DATE("now", "localtime")';
    let waiterCondition = '';
    
    if (date) {
      dateCondition = 'DATE(o.created_at, "localtime") = DATE(?)';
      params.push(date);
    }
    
    if (waiter && waiter !== 'all') {
      waiterCondition = 'AND o.waiter_id = ?';
      params.push(waiter);
    }
    
    // Get total sales and completed orders
    const salesSummary = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as completedOrders,
          COALESCE(SUM(total_amount), 0) as totalSales
        FROM orders o
        WHERE status IN ('completed', 'paid')
        AND ${dateCondition}
        ${waiterCondition}
      `, params, (err, row) => {
        if (err) reject(err);
        else {
          console.log('Sales summary:', row);
          resolve(row || { completedOrders: 0, totalSales: 0 });
        }
      });
    });

    // Get waiter statistics
    const waiterStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          u.id as waiter_id,
          u.username as waiter_name,
          COUNT(CASE WHEN o.status IN ('completed', 'paid') THEN o.id END) as order_count,
          COALESCE(SUM(CASE WHEN o.status IN ('completed', 'paid') THEN o.total_amount ELSE 0 END), 0) as total_sales
        FROM users u
        LEFT JOIN orders o ON u.id = o.waiter_id AND ${dateCondition}
        WHERE u.role = 'waiter'
        ${waiterCondition}
        GROUP BY u.id, u.username
        ORDER BY total_sales DESC
      `, params, (err, rows) => {
        if (err) {
          console.error('Error in waiter stats query:', err);
          reject(err);
        } else {
          console.log('Waiter stats:', rows);
          resolve(rows || []);
        }
      });
    });

    res.json({
      totalSales: parseFloat(salesSummary.totalSales) || 0,
      completedOrders: parseInt(salesSummary.completedOrders) || 0,
      waiterStats: waiterStats.map(stat => ({
        ...stat,
        total_sales: parseFloat(stat.total_sales) || 0,
        order_count: parseInt(stat.order_count) || 0,
        average_order: stat.order_count > 0 ? stat.total_sales / stat.order_count : 0
      }))
    });
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get sales by date range
router.get('/range', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const db = getDatabase();
    const { start_date, end_date } = req.query;
    
    const sales = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          o.id,
          o.table_number,
          o.total_amount,
          o.status,
          datetime(o.created_at, '+3 hours') as created_at,
          u.username as waiter_name
        FROM orders o
        LEFT JOIN users u ON o.waiter_id = u.id
        WHERE DATE(datetime(o.created_at, '+3 hours')) BETWEEN DATE(?) AND DATE(?)
        ORDER BY o.created_at DESC
      `, [start_date, end_date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales by range:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 