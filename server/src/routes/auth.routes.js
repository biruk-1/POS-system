const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');
const env = require('../config/env');

const router = express.Router();
const JWT_SECRET = env.JWT_SECRET;

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password, phone_number, pin_code } = req.body;
    const db = getDatabase();

    console.log('Login attempt:', {
      username: username || undefined,
      password: password ? '(password provided)' : undefined,
      pin_code: pin_code ? '(PIN provided)' : undefined,
      phone_number: phone_number || undefined
    });

    let user;

    // First try to find user by username
    if (username) {
      user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }
    // If no username or user not found, try phone number
    else if (phone_number) {
      user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE phone_number = ?', [phone_number], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      console.log('User account is not active');
      return res.status(401).json({ error: 'Account is not active' });
    }

    let isValidCredentials = false;

    // PIN-based login (e.g., for waiters)
    if (pin_code && user.pin) {
      isValidCredentials = await bcrypt.compare(pin_code, user.pin);
      if (!isValidCredentials) {
        console.log('Invalid PIN');
        return res.status(401).json({ error: 'Invalid PIN' });
      }
    }
    // Password-based login
    else if (password && user.password) {
      isValidCredentials = await bcrypt.compare(password, user.password);
      if (!isValidCredentials) {
        console.log('Invalid password');
        return res.status(401).json({ error: 'Invalid password' });
      }
    }
    // No valid credentials provided
    else {
      console.log('No valid credentials provided');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        phone_number: user.phone_number 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Successful login for user:', user.username);

    // Return user info and token
    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        phone_number: user.phone_number
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Verify token endpoint
router.post('/verify', (req, res) => {
  const token = req.body.token;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    console.error('Token verification error:', error);
    res.json({ valid: false, error: error.message });
  }
});

module.exports = router; 