const express = require('express');
const { getDatabase } = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');

const router = express.Router();

// Get all settings
router.get('/', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const db = getDatabase();
    const settings = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM settings', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Convert array to object for easier access
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json(settingsObject);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const settings = req.body;
    const db = getDatabase();

    // Start transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // Update each setting
      for (const [key, value] of Object.entries(settings)) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO settings (key, value) 
             VALUES (?, ?) 
             ON CONFLICT(key) DO UPDATE SET value = ?`,
            [key, value, value],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      // Commit transaction
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Get updated settings
      const updatedSettings = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM settings', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Convert to object
      const settingsObject = updatedSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      res.json(settingsObject);
    } catch (error) {
      // Rollback on error
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
      throw error;
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get specific setting
router.get('/:key', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const db = getDatabase();
    const setting = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM settings WHERE key = ?', [req.params.key], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ [setting.key]: setting.value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update specific setting
router.put('/:key', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const { value } = req.body;
    const db = getDatabase();

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO settings (key, value) 
         VALUES (?, ?) 
         ON CONFLICT(key) DO UPDATE SET value = ?`,
        [req.params.key, value, value],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ [req.params.key]: value });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

module.exports = router; 