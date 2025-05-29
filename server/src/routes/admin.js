const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { Op } = require('sequelize');

const router = express.Router();

router.delete('/cleanup-today', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { Order, OrderItem } = req.app.locals.db;
    
    // Delete order items first
    const deletedOrderItems = await OrderItem.destroy({
      where: {
        '$Order.created_at$': {
          [Op.between]: ['2025-05-29 00:00:00', '2025-05-29 23:59:59']
        }
      },
      include: [{
        model: Order,
        required: true
      }]
    });

    // Delete orders
    const deletedOrders = await Order.destroy({
      where: {
        created_at: {
          [Op.between]: ['2025-05-29 00:00:00', '2025-05-29 23:59:59']
        }
      }
    });

    res.json({
      success: true,
      message: 'Today\'s data cleaned up successfully',
      deletedOrders,
      deletedOrderItems
    });
  } catch (error) {
    console.error('Error cleaning up data:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up data',
      error: error.message
    });
  }
});

module.exports = router; 