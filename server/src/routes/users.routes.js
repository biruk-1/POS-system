const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const db = getDatabase();
    const { role } = req.query;

    let query = 'SELECT id, username, role, phone_number, status, created_at FROM users';
    let params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC';

    const users = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
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

// Get user by ID
router.get('/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const db = getDatabase();
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, role, phone_number, status, created_at FROM users WHERE id = ?',
        [req.params.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const { username, password, role, phone_number, pin } = req.body;
    const db = getDatabase();

    // Validate required fields
    if (!username || !role || (!password && !pin)) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Check if username already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password and/or PIN
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;

    // Create user
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, pin, role, phone_number, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [username, hashedPassword, hashedPin, role, phone_number, 'active'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    const newUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, role, phone_number, status, created_at FROM users WHERE id = ?',
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
router.put('/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const { username, password, role, phone_number, pin, status } = req.body;
    const db = getDatabase();

    // Check if user exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update query
    let updates = [];
    let params = [];

    if (username) {
      updates.push('username = ?');
      params.push(username);
    }
    if (password) {
      updates.push('password = ?');
      params.push(await bcrypt.hash(password, 10));
    }
    if (pin) {
      updates.push('pin = ?');
      params.push(await bcrypt.hash(pin, 10));
    }
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    if (phone_number) {
      updates.push('phone_number = ?');
      params.push(phone_number);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add ID to params
    params.push(req.params.id);

    // Update user
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        params,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const updatedUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, role, phone_number, status, created_at FROM users WHERE id = ?',
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
router.delete('/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const db = getDatabase();

    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (result === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router; 