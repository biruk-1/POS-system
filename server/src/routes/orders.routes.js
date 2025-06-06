const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get all orders (admin, cashier)
router.get('/', authenticateToken, checkRole(['admin', 'cashier']), async (req, res) => {
  try {
    const db = getDatabase();
    const orders = await new Promise((resolve, reject) => {
      db.all(`
        SELECT o.*, u.username as waiter_name 
        FROM orders o 
        LEFT JOIN users u ON o.waiter_id = u.id 
        ORDER BY o.created_at DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get orders by waiter
router.get('/waiter/:waiterId', authenticateToken, checkRole(['waiter', 'admin']), async (req, res) => {
  try {
    const db = getDatabase();
    const orders = await new Promise((resolve, reject) => {
      db.all(`
        SELECT o.*, u.username as waiter_name 
        FROM orders o 
        LEFT JOIN users u ON o.waiter_id = u.id 
        WHERE o.waiter_id = ? 
        ORDER BY o.created_at DESC
      `, [req.params.waiterId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching waiter orders:', error);
    res.status(500).json({ error: 'Failed to fetch waiter orders' });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    const order = await new Promise((resolve, reject) => {
      db.get(`
        SELECT o.*, u.username as waiter_name 
        FROM orders o 
        LEFT JOIN users u ON o.waiter_id = u.id 
        WHERE o.id = ?
      `, [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const items = await new Promise((resolve, reject) => {
      db.all(`
        SELECT oi.*, i.name, i.price as item_price 
        FROM order_items oi 
        JOIN items i ON oi.item_id = i.id 
        WHERE oi.order_id = ?
      `, [req.params.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    order.items = items;
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
router.post('/', authenticateToken, checkRole(['waiter', 'admin', 'cashier']), async (req, res) => {
  try {
    const { table_number, items } = req.body;
    const db = getDatabase();

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    // Only require table number for waiter orders
    if (req.user.role === 'waiter' && !table_number) {
      return res.status(400).json({ error: 'Table number is required for waiter orders' });
    }

    // Start transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // Create order with optional table number
      const orderResult = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO orders (table_number, waiter_id, status) 
           VALUES (?, ?, ?)`,
          [table_number || null, req.user.id, 'pending'],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Add order items
      for (const item of items) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO order_items (order_id, item_id, quantity, price, notes) 
             VALUES (?, ?, ?, ?, ?)`,
            [orderResult, item.id, item.quantity, item.price, item.notes],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      // Calculate total
      const total = await new Promise((resolve, reject) => {
        db.get(
          `SELECT SUM(price * quantity) as total 
           FROM order_items 
           WHERE order_id = ?`,
          [orderResult],
          (err, row) => {
            if (err) reject(err);
            else resolve(row.total);
          }
        );
      });

      // Update order with total
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE orders SET total_amount = ? WHERE id = ?`,
          [total, orderResult],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Commit transaction
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Get the complete order with items
      const order = await new Promise((resolve, reject) => {
        db.get(
          `SELECT o.*, u.username as waiter_name
          FROM orders o 
          LEFT JOIN users u ON o.waiter_id = u.id 
           WHERE o.id = ?`,
          [orderResult],
          (err, row) => {
          if (err) reject(err);
          else resolve(row);
          }
        );
      });

      const orderItems = await new Promise((resolve, reject) => {
        db.all(
          `SELECT oi.*, i.name, i.item_type
          FROM order_items oi 
          JOIN items i ON oi.item_id = i.id 
           WHERE oi.order_id = ?`,
          [orderResult],
          (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
          }
        );
      });

      res.json({
        ...order,
        items: orderItems
      });
    } catch (error) {
      // Rollback transaction on error
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
      throw error;
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status
router.patch('/:id/status', authenticateToken, checkRole(['admin', 'cashier', 'waiter']), async (req, res) => {
  try {
    const { status } = req.body;
    const db = getDatabase();

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, req.params.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = await new Promise((resolve, reject) => {
      db.get(`
        SELECT o.*, u.username as waiter_name 
        FROM orders o 
        LEFT JOIN users u ON o.waiter_id = u.id 
        WHERE o.id = ?
      `, [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Update order item status (for kitchen/bar)
router.patch('/:orderId/items/:itemId/status', authenticateToken, checkRole(['admin', 'kitchen', 'bartender']), async (req, res) => {
  try {
    const { status } = req.body;
    const db = getDatabase();

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE order_items SET status = ? WHERE order_id = ? AND id = ?',
        [status, req.params.orderId, req.params.itemId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Order item not found' });
    }

    const updatedItem = await new Promise((resolve, reject) => {
      db.get(`
        SELECT oi.*, i.name, i.price as item_price 
        FROM order_items oi 
        JOIN items i ON oi.item_id = i.id 
        WHERE oi.order_id = ? AND oi.id = ?
      `, [req.params.orderId, req.params.itemId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating order item status:', error);
    res.status(500).json({ error: 'Failed to update order item status' });
  }
});

// Get sales data
router.get('/sales', authenticateToken, async (req, res) => {
  try {
    const { date, waiter, currentTime } = req.query;
    const db = getDatabase();

    let query = `
      SELECT 
        o.id,
        o.table_number,
        o.total_amount,
        o.status,
        o.created_at,
        u.username as waiter_name,
        GROUP_CONCAT(oi.item_id) as item_ids,
        GROUP_CONCAT(oi.quantity) as quantities,
        GROUP_CONCAT(oi.price) as prices,
        GROUP_CONCAT(i.name) as item_names,
        GROUP_CONCAT(i.item_type) as item_types
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN items i ON oi.item_id = i.id
      WHERE DATE(o.created_at) = DATE(?)
    `;

    const params = [date];

    if (waiter && waiter !== 'all') {
      query += ' AND u.id = ?';
      params.push(waiter);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const orders = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Process the orders to include items
    const processedOrders = orders.map(order => {
      const itemIds = order.item_ids ? order.item_ids.split(',') : [];
      const quantities = order.quantities ? order.quantities.split(',') : [];
      const prices = order.prices ? order.prices.split(',') : [];
      const itemNames = order.item_names ? order.item_names.split(',') : [];
      const itemTypes = order.item_types ? order.item_types.split(',') : [];

      const items = itemIds.map((id, index) => ({
        id: parseInt(id),
        name: itemNames[index],
        quantity: parseInt(quantities[index]),
        price: parseFloat(prices[index]),
        item_type: itemTypes[index]
      }));

      return {
        ...order,
        items,
        item_ids: undefined,
        quantities: undefined,
        prices: undefined,
        item_names: undefined,
        item_types: undefined
      };
    });

    res.json(processedOrders);
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 