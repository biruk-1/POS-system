# API and Server Configuration Guide

## Server Configuration

### Environment Variables (server/.env)

```env
PORT=5001                   # Server port (default: 5001)
NODE_ENV=production        # Environment (development/production)
DB_PATH=./src/pos.db      # SQLite database path
JWT_SECRET=your-secret    # JWT signing key
JWT_EXPIRATION=24h        # JWT token expiration
ALLOWED_ORIGINS=http://localhost:5173  # CORS allowed origins (comma-separated)
UPLOAD_DIR=./src/uploads  # File upload directory
MAX_FILE_SIZE=5242880     # Max file upload size (5MB)
```

### Server Setup (server/src/index.js)

The server is configured with:
- Express.js for REST API
- Socket.IO for real-time communication
- SQLite for database
- JWT for authentication
- CORS enabled for specified origins
- File upload support

## API Configuration

### Base URLs

Development:
```
API Base URL: http://localhost:5001/api
Socket URL: http://localhost:5001
Socket Path: /socket.io
```

Production:
```
API Base URL: https://www.plg.et/api
Socket URL: https://www.plg.et
Socket Path: /socket.io
```

### Client-Side Configuration (client/.env)

```env
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
VITE_SOCKET_PATH=/socket.io
VITE_CLIENT_URL=http://localhost:5173
VITE_PROD_API_URL=https://www.plg.et
VITE_PROD_SOCKET_URL=https://www.plg.et
VITE_ALLOWED_ORIGINS=http://localhost:5173
```

## Socket.IO Configuration

### Server-Side Socket Setup

The Socket.IO server is configured with:
- WebSocket and polling transport
- CORS enabled for specified origins
- Authentication middleware using JWT
- Ping timeout: 60 seconds
- Ping interval: 25 seconds
- Connection timeout: 45 seconds
- Buffer size: 100MB
- Compression enabled for messages >1KB

### Client-Side Socket Setup

Socket.IO client is configured with:
- Automatic reconnection
- Max 5 reconnection attempts
- Exponential backoff retry
- Authentication using JWT token
- Event queueing during disconnection

### Socket Events

Server Events:
- 'connect': Socket connected
- 'authenticated': Authentication successful
- 'authentication_error': Authentication failed
- 'connect_error': Connection error
- 'disconnect': Socket disconnected
- 'error': General socket error

Client Events:
- 'authenticate': Send authentication token
- 'order_created': New order created
- 'order_updated': Order status updated
- 'table_status_updated': Table status changed

## API Endpoints

### Authentication
- POST `/api/auth/login`: User login
- POST `/api/auth/pin-login`: PIN-based login

### Users
- GET `/api/users`: List users
- POST `/api/users`: Create user
- PUT `/api/users/:id`: Update user
- DELETE `/api/users/:id`: Delete user

### Orders
- GET `/api/orders`: List orders
- POST `/api/orders`: Create order
- PUT `/api/orders/:id`: Update order
- PATCH `/api/orders/:id/status`: Update order status

### Items
- GET `/api/items`: List items
- POST `/api/items`: Create item
- PUT `/api/items/:id`: Update item
- DELETE `/api/items/:id`: Delete item

### Sales
- GET `/api/sales`: Get sales data
- GET `/api/sales/daily`: Daily sales report
- GET `/api/sales/range`: Sales within date range

### Reports
- POST `/api/reports/generate`: Generate custom report
- GET `/api/reports/sales`: Sales report
- GET `/api/reports/items`: Items report

### Settings
- GET `/api/settings`: Get system settings
- PUT `/api/settings`: Update settings

### Terminals
- GET `/api/terminal/kitchen`: Kitchen display system
- GET `/api/terminal/bartender`: Bartender display system

## Security

1. Authentication:
   - JWT-based authentication
   - Token expiration
   - Role-based access control

2. CORS Security:
   - Whitelisted origins
   - Secure methods
   - Credentials enabled

3. File Upload Security:
   - Size limit: 5MB
   - File type validation
   - Secure storage path

4. Socket Security:
   - JWT authentication
   - Connection timeout
   - Error handling
   - Secure event validation

## AWS Deployment Notes

1. Environment Setup:
   - Set production environment variables
   - Configure SSL certificates
   - Set up proper CORS origins

2. Server Requirements:
   - Node.js 14+ required
   - PM2 for process management
   - Nginx as reverse proxy

3. Database:
   - SQLite database path configuration
   - Regular backups to S3
   - Proper file permissions

4. Networking:
   - Configure security groups
   - Open required ports (80, 443, 5001)
   - Set up domain and SSL

5. Monitoring:
   - PM2 monitoring
   - Nginx logs
   - Socket connection logs 