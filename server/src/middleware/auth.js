const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log('Authenticated user:', { id: decoded.id, username: decoded.username, role: decoded.role });
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ 
      message: 'Invalid token',
      error: error.message 
    });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userRole = req.user.role.toLowerCase();
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    console.log('Role check:', {
      userRole,
      requiredRoles,
      path: req.path,
      userId: req.user.id,
      username: req.user.username
    });

    if (!requiredRoles.includes(userRole)) {
      console.log(`Access denied for user ${req.user.username} (${userRole}) to ${req.path}`);
      return res.status(403).json({ 
        message: 'Access denied',
        required: requiredRoles,
        current: userRole
      });
    }

    console.log(`Access granted for user ${req.user.username} (${userRole}) to ${req.path}`);
    next();
  };
};

module.exports = {
  authenticateToken,
  checkRole
}; 