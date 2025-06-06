const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Get daily sales data
router.get('/sales/daily', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const db = getDatabase();
    const sales = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_orders,
          SUM(total_amount) as total_sales,
          COUNT(DISTINCT waiter_id) as active_waiters
        FROM orders 
        WHERE status = 'completed'
        AND created_at >= date('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get top selling items
    const topItems = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          i.name,
          COUNT(oi.id) as order_count,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.price * oi.quantity) as total_revenue
        FROM order_items oi
        JOIN items i ON oi.item_id = i.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'completed'
        AND o.created_at >= date('now', '-30 days')
        GROUP BY i.id
        ORDER BY total_revenue DESC
        LIMIT 5
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get waiter performance
    const waiterPerformance = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          u.username,
          COUNT(o.id) as total_orders,
          SUM(o.total_amount) as total_sales,
          AVG(o.total_amount) as average_order_value
        FROM orders o
        JOIN users u ON o.waiter_id = u.id
        WHERE o.status = 'completed'
        AND o.created_at >= date('now', '-30 days')
        GROUP BY u.id
        ORDER BY total_sales DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      daily_sales: sales,
      top_items: topItems,
      waiter_performance: waiterPerformance
    });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

// Get monthly sales data
router.get('/sales/monthly', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const db = getDatabase();
    const sales = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as total_orders,
          SUM(total_amount) as total_sales,
          COUNT(DISTINCT waiter_id) as active_waiters
        FROM orders 
        WHERE status = 'completed'
        AND created_at >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(sales);
  } catch (error) {
    console.error('Error fetching monthly sales:', error);
    res.status(500).json({ error: 'Failed to fetch monthly sales' });
  }
});

// Get sales by date range
router.get('/sales/range', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const db = getDatabase();

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const sales = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_orders,
          SUM(total_amount) as total_sales,
          COUNT(DISTINCT waiter_id) as active_waiters
        FROM orders 
        WHERE status = 'completed'
        AND created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, [start_date, end_date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales by range:', error);
    res.status(500).json({ error: 'Failed to fetch sales by range' });
  }
});

// Get dashboard statistics
router.get('/dashboard', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const db = getDatabase();
    const stats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          (SELECT COUNT(*) FROM orders WHERE status = 'completed' AND created_at >= date('now', '-30 days')) as total_orders,
          (SELECT SUM(total_amount) FROM orders WHERE status = 'completed' AND created_at >= date('now', '-30 days')) as total_revenue,
          (SELECT COUNT(*) FROM users WHERE role = 'waiter' AND status = 'active') as active_waiters,
          (SELECT COUNT(*) FROM tables WHERE status = 'occupied') as occupied_tables
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Get recent orders
    const recentOrders = await new Promise((resolve, reject) => {
      db.all(`
        SELECT o.*, u.username as waiter_name
        FROM orders o
        JOIN users u ON o.waiter_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get top selling items
    const topItems = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          i.name,
          COUNT(oi.id) as order_count,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.quantity * oi.price) as total_revenue
        FROM items i
        JOIN order_items oi ON i.id = oi.item_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'completed'
        AND o.created_at >= date('now', '-30 days')
        GROUP BY i.id
        ORDER BY total_quantity DESC
        LIMIT 5
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      stats,
      recent_orders: recentOrders,
      top_items: topItems
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all users
router.get('/users', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const db = getDatabase();
    const users = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, username, role, status, created_at, updated_at
        FROM users
        ORDER BY role, username
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user
router.post('/users', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { username, password, role, pin } = req.body;
    const db = getDatabase();

    // Validate input
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    // Check if username already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;

    // Insert new user
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, role, pin) 
         VALUES (?, ?, ?, ?)`,
        [username, hashedPassword, role, hashedPin],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Get created user
    const newUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, role, status, created_at FROM users WHERE id = ?',
        [result],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { username, password, role, pin, status } = req.body;
    const db = getDatabase();

    // Get current user
    const currentUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare update fields
    const updates = [];
    const params = [];

    if (username) {
      updates.push('username = ?');
      params.push(username);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (role) {
      updates.push('role = ?');
      params.push(role);
    }

    if (pin) {
      const hashedPin = await bcrypt.hash(pin, 10);
      updates.push('pin = ?');
      params.push(hashedPin);
    }

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Add updated_at timestamp
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    // Update user
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Get updated user
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, role, status, created_at, updated_at FROM users WHERE id = ?',
        [req.params.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const db = getDatabase();

    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router; 