const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get daily sales
router.get('/daily', authenticateToken, checkRole(['admin', 'cashier']), async (req, res) => {
  try {
    const db = getDatabase();
    const { date, waiter_id } = req.query;
    
    console.log('Fetching daily sales with params:', { date, waiter_id });
    
    // Get total sales and completed orders, adjusting for EAT (+3 hours)
    const salesSummary = await new Promise((resolve, reject) => {
      const dateCondition = date === 'all' ? '' : 'AND DATE(datetime(created_at, \'+3 hours\')) = DATE(?)';
      const params = date === 'all' ? [] : [date];
      
      db.get(`
        SELECT 
          COUNT(*) as completedOrders,
          SUM(total_amount) as totalSales
        FROM orders
        WHERE status IN ('completed', 'paid')
        ${dateCondition}
      `, params, (err, row) => {
        if (err) reject(err);
        else {
          console.log('Sales summary:', row); // Add logging
          resolve(row || { completedOrders: 0, totalSales: 0 });
        }
      });
    });

    // Get waiter statistics
    const waiterStats = await new Promise((resolve, reject) => {
      const dateCondition = date === 'all' ? '' : 'AND DATE(datetime(o.created_at, \'+3 hours\')) = DATE(?)';
      const waiterCondition = waiter_id && waiter_id !== 'all' ? 'AND u.id = ?' : '';
      const params = [
        ...(date === 'all' ? [] : [date]),
        ...(waiter_id && waiter_id !== 'all' ? [waiter_id] : [])
      ];
      
      db.all(`
        SELECT 
          u.id as waiter_id,
          u.username as waiter_name,
          COUNT(o.id) as order_count,
          SUM(o.total_amount) as total_sales
        FROM users u
        LEFT JOIN orders o ON u.id = o.waiter_id
        WHERE u.role = 'waiter'
        AND (o.status IN ('completed', 'paid') OR o.status IS NULL)
        ${dateCondition}
        ${waiterCondition}
        GROUP BY u.id
      `, params, (err, rows) => {
        if (err) reject(err);
        else {
          console.log('Waiter stats:', rows); // Add logging
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
        order_count: parseInt(stat.order_count) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    res.status(500).json({ error: 'Internal server error' });
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