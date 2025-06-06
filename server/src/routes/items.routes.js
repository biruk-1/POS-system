const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');
const { upload } = require('../config/multer');

const router = express.Router();

// Get all items
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const items = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM items WHERE status IS NULL OR status != ? ORDER BY category, name', ['deleted'], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get item by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const item = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM items WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create new item (admin only)
router.post('/', authenticateToken, checkRole('admin'), upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, item_type, category } = req.body;
    const db = getDatabase();

    if (!name || !price || !item_type) {
      return res.status(400).json({ error: 'Name, price, and item type are required' });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO items (name, description, price, item_type, category, image) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, price, item_type, category, imagePath],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    const newItem = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM items WHERE id = ?', [result], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item (admin only)
router.put('/:id', authenticateToken, checkRole('admin'), upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, item_type, category, status } = req.body;
    const db = getDatabase();

    const currentItem = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM items WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!currentItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : currentItem.image;

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE items 
         SET name = ?, description = ?, price = ?, item_type = ?, 
             category = ?, image = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, description, price, item_type, category, imagePath, status, req.params.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    const updatedItem = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM items WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item (admin only)
router.delete('/:id', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const db = getDatabase();
    
    // Soft delete by updating status
    const result = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE items SET status = ? WHERE id = ?',
        ['deleted', req.params.id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router; 