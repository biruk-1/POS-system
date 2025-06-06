const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const ordersRoutes = require('./orders.routes');
const usersRoutes = require('./users.routes');
const reportsRoutes = require('./reports.routes');
const dashboardRoutes = require('./dashboard.routes');
const billRequestsRoutes = require('./bill-requests.routes');
const salesRoutes = require('./sales.routes');
const adminRoutes = require('./admin.routes');
const itemsRoutes = require('./items.routes');
const tablesRoutes = require('./tables.routes');
const waitersRoutes = require('./waiters.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/orders', ordersRoutes);
router.use('/users', usersRoutes);
router.use('/reports', reportsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/bill-requests', billRequestsRoutes);
router.use('/sales', salesRoutes);
router.use('/admin', adminRoutes);
router.use('/items', itemsRoutes);
router.use('/tables', tablesRoutes);
router.use('/waiters', waitersRoutes);

// Error handling for routes that don't exist
router.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = router; 