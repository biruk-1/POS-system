const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Generate report endpoint
router.post('/generate', authenticateToken, checkRole(['admin', 'cashier']), async (req, res) => {
  try {
    const db = getDatabase();
    const { reportType, startDate, endDate, detailLevel } = req.body;
    
    // Validate required parameters
    if (!reportType || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        details: {
          reportType: !reportType ? 'Report type is required' : null,
          startDate: !startDate ? 'Start date is required' : null,
          endDate: !endDate ? 'End date is required' : null
        }
      });
    }

    let query = '';
    let params = [];

    switch (reportType) {
      case 'sales':
        query = `
          SELECT 
            o.id,
            o.table_number,
            o.total_amount,
            o.status,
            datetime(o.created_at, '+3 hours') as created_at,
            u.username as waiter_name,
            COUNT(*) OVER() as total_orders,
            SUM(o.total_amount) OVER() as total_revenue
          FROM orders o
          LEFT JOIN users u ON o.waiter_id = u.id
          WHERE DATE(datetime(o.created_at, '+3 hours')) BETWEEN DATE(?) AND DATE(?)
          ORDER BY o.created_at DESC
        `;
        params = [startDate, endDate];
        break;
        
      case 'items':
        query = `
          SELECT 
            i.name,
            COUNT(*) as quantity,
            SUM(oi.price * oi.quantity) as total_sales,
            COUNT(DISTINCT o.id) as order_count
          FROM order_items oi
          JOIN items i ON oi.item_id = i.id
          JOIN orders o ON oi.order_id = o.id
          WHERE DATE(datetime(o.created_at, '+3 hours')) BETWEEN DATE(?) AND DATE(?)
          GROUP BY i.id, i.name
          ORDER BY total_sales DESC
        `;
        params = [startDate, endDate];
        break;

      case 'drinks':
        query = `
          SELECT 
            i.name,
            COUNT(*) as quantity,
            SUM(oi.price * oi.quantity) as total_sales,
            COUNT(DISTINCT o.id) as order_count
          FROM order_items oi
          JOIN items i ON oi.item_id = i.id
          JOIN orders o ON oi.order_id = o.id
          WHERE DATE(datetime(o.created_at, '+3 hours')) BETWEEN DATE(?) AND DATE(?)
          AND i.category = 'drinks'
          GROUP BY i.id, i.name
          ORDER BY total_sales DESC
        `;
        params = [startDate, endDate];
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    const results = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });

    // Format the response based on report type
    let formattedData = results;
    if (reportType === 'sales') {
      formattedData = results.map(row => ({
        id: row.id,
        date: row.created_at.split(' ')[0],
        orders: row.total_orders || 0,
        revenue: parseFloat(row.total_revenue) || 0,
        avgOrder: row.total_orders ? (parseFloat(row.total_revenue) / row.total_orders).toFixed(2) : 0,
        topItem: 'N/A' // This would need to be calculated separately if needed
      }));
    }

    res.json({
      reportType,
      startDate,
      endDate,
      detailLevel,
      data: formattedData
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get daily sales report
router.get('/sales/daily', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const db = getDatabase();
    const { timeRange, waiterId, date } = req.query;
    
    // Build date condition based on timeRange
    let dateCondition = '';
    let params = [];
    
    switch (timeRange) {
      case 'today':
        dateCondition = 'DATE(created_at, "localtime") = DATE("now", "localtime")';
        break;
      case 'yesterday':
        dateCondition = 'DATE(created_at, "localtime") = DATE("now", "localtime", "-1 day")';
        break;
      case 'week':
        dateCondition = 'DATE(created_at, "localtime") >= DATE("now", "localtime", "-7 days")';
        break;
      case 'month':
        dateCondition = 'DATE(created_at, "localtime") >= DATE("now", "localtime", "-30 days")';
        break;
      case 'custom':
        if (date) {
          dateCondition = 'DATE(created_at, "localtime") = DATE(?)';
          params.push(date);
        }
        break;
      default:
        dateCondition = 'DATE(created_at, "localtime") = DATE("now", "localtime")';
    }

    // Add waiter condition if specified
    const waiterCondition = waiterId && waiterId !== 'all' ? 'AND o.waiter_id = ?' : '';
    if (waiterId && waiterId !== 'all') {
      params.push(waiterId);
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
        if (err) reject(err);
        else {
          console.log('Waiter stats:', rows);
          resolve(rows || []);
        }
      });
    });

    // Get top selling items
    const topItems = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          i.name,
          COUNT(DISTINCT o.id) as order_count,
          SUM(oi.quantity) as total_quantity,
          COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue
        FROM items i
        JOIN order_items oi ON i.id = oi.item_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status IN ('completed', 'paid')
        AND ${dateCondition}
        ${waiterCondition}
        GROUP BY i.id, i.name
        ORDER BY total_revenue DESC
        LIMIT 5
      `, params, (err, rows) => {
        if (err) reject(err);
        else {
          console.log('Top items:', rows);
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
      })),
      topItems: topItems.map(item => ({
        ...item,
        total_revenue: parseFloat(item.total_revenue) || 0,
        total_quantity: parseInt(item.total_quantity) || 0,
        order_count: parseInt(item.order_count) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching daily sales report:', error);
    res.status(500).json({ error: 'Failed to fetch daily sales report' });
  }
});

module.exports = router; 