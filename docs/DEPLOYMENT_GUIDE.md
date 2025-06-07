# POS System Deployment Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Environment Configuration](#environment-configuration)
4. [API Documentation](#api-documentation)
5. [Database Setup](#database-setup)
6. [AWS Deployment Guide](#aws-deployment-guide)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)
9. [File Structure Overview](#file-structure-overview)

## Project Overview

This is a Point of Sale (POS) system built with a React frontend and Node.js/Express backend. The system supports both online and offline operations, real-time updates via WebSocket, and secure authentication.

### Key Features
- Multi-role user system (Admin, Cashier, Waiter, Kitchen, Bartender)
- Real-time order management
- Offline functionality with data synchronization
- Secure payment processing
- Sales reporting and analytics
- Inventory management

## System Architecture

### Frontend (React)
- Location: `/client`
- Framework: React with Material-UI
- State Management: Redux
- Real-time Updates: Socket.IO client
- Offline Support: IndexedDB

### Backend (Node.js/Express)
- Location: `/server`
- Framework: Express.js
- Database: SQLite
- Real-time Server: Socket.IO
- Authentication: JWT

## Environment Configuration

### Backend Environment Variables (server/.env)
```env
PORT=5001
NODE_ENV=production
DB_PATH=./data/pos.db
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRATION=24h
ALLOWED_ORIGINS=https://your-domain.com
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

### Frontend Environment Variables (client/.env)
```env
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_SOCKET_URL=wss://your-api-domain.com
REACT_APP_SOCKET_PATH=/socket.io
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
- Purpose: Authenticate users and generate JWT token
- Request Body:
```json
{
  "username": "string",
  "password": "string"
}
```
- Response:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "number",
    "username": "string",
    "role": "string"
  }
}
```

### Order Management Endpoints

#### GET /api/orders
- Purpose: Fetch all orders
- Authentication: Required
- Roles: admin, cashier
- Query Parameters:
  - date: ISO date string
  - status: order status

#### PATCH /api/orders/:id/status
- Purpose: Update order status
- Authentication: Required
- Roles: admin, cashier, waiter
- Request Body:
```json
{
  "status": "string",
  "payment_amount": "number"
}
```

### Real-time Events (Socket.IO)

#### Client Events
- 'authenticate': Send JWT token for socket authentication
- 'order:update': Emit when order is updated
- 'bill:request': Emit when bill is requested

#### Server Events
- 'authenticated': Emitted after successful socket authentication
- 'order:updated': Broadcast when order status changes
- 'bill:requested': Broadcast to cashiers when bill is requested

### Reports Endpoints

#### POST /api/reports/generate
- Purpose: Generate various types of reports
- Authentication: Required
- Roles: admin, cashier
- Request Body:
```json
{
  "reportType": "string",
  "startDate": "ISO date string",
  "endDate": "ISO date string",
  "detailLevel": "string"
}
```

### Settings Endpoints

#### GET /api/settings
- Purpose: Fetch system settings
- Authentication: Required
- Roles: admin
- Response: Object containing key-value pairs of settings

### Items Management

#### GET /api/items
- Purpose: Fetch all inventory items
- Authentication: Required
- Roles: all authenticated users

#### POST /api/items
- Purpose: Create new inventory item
- Authentication: Required
- Roles: admin
- Request Body:
```json
{
  "name": "string",
  "price": "number",
  "category": "string",
  "description": "string",
  "stock": "number"
}
```

### Tables Management

#### GET /api/tables
- Purpose: Fetch all restaurant tables
- Authentication: Required
- Roles: all authenticated users

#### POST /api/tables
- Purpose: Create new table
- Authentication: Required
- Roles: admin
- Request Body:
```json
{
  "number": "string",
  "capacity": "number",
  "status": "string"
}
```

### Bill Requests

#### POST /api/bill-requests
- Purpose: Create new bill request
- Authentication: Required
- Roles: waiter
- Request Body:
```json
{
  "tableId": "number",
  "orderId": "number"
}
```

### Sales Management

#### GET /api/sales
- Purpose: Fetch sales data
- Authentication: Required
- Roles: admin, cashier
- Query Parameters:
  - startDate: ISO date string
  - endDate: ISO date string
  - groupBy: string (day/week/month)

## Database Setup

The system uses SQLite with the following main tables:
- users: User authentication and roles
- items: Product inventory
- orders: Order management
- order_items: Order line items
- tables: Restaurant tables
- bill_requests: Bill request management

Database initialization happens automatically on server start. The database file is created at `server/data/pos.db`.

## AWS Deployment Guide

### Prerequisites
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js 14+ installed
- PM2 for process management

### Backend Deployment (EC2)

1. Launch EC2 Instance:
   - Use Ubuntu Server 20.04 LTS
   - t2.micro for testing, t2.small/medium for production
   - Configure security group:
     - Allow SSH (22)
     - Allow HTTP (80)
     - Allow HTTPS (443)
     - Allow Custom TCP (5001) for API

2. Install Dependencies:
```bash
sudo apt update
sudo apt install -y nodejs npm nginx
sudo npm install -g pm2
```

3. Clone and Setup Backend:
```bash
git clone <repository-url>
cd pos-system/server
npm install
```

4. Configure Nginx:
```nginx
server {
    listen 80;
    server_name your-api-domain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. Start Server:
```bash
pm2 start src/index.js --name pos-backend
pm2 save
```

### Frontend Deployment (S3 + CloudFront)

1. Build Frontend:
```bash
cd pos-system/client
npm install
npm run build
```

2. Create S3 Bucket:
- Create bucket with static website hosting
- Upload build files
- Configure bucket policy for public access

3. Setup CloudFront:
- Create distribution pointing to S3 bucket
- Configure custom domain
- Enable HTTPS

### Database Backup (S3)

Create a backup script:
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="pos_backup_$TIMESTAMP.db"
cp /path/to/pos.db /tmp/$BACKUP_FILE
aws s3 cp /tmp/$BACKUP_FILE s3://your-bucket/backups/
rm /tmp/$BACKUP_FILE
```

Configure daily cron job:
```bash
0 0 * * * /path/to/backup-script.sh
```

## Security Considerations

1. JWT Security:
   - Use strong JWT_SECRET
   - Implement token refresh
   - Set appropriate expiration

2. CORS Configuration:
   - Strictly define allowed origins
   - Limit allowed methods and headers

3. Database Security:
   - Regular backups
   - Proper file permissions
   - Input validation

4. Network Security:
   - Use HTTPS
   - Configure firewall rules
   - Implement rate limiting

## Troubleshooting

### Common Issues

1. CORS Errors:
   - Verify ALLOWED_ORIGINS in backend .env
   - Check frontend API URL configuration
   - Ensure proper headers in Nginx

2. WebSocket Connection Failures:
   - Check socket path configuration
   - Verify WebSocket proxy settings in Nginx
   - Confirm client socket URL

3. Database Errors:
   - Check file permissions
   - Verify database path
   - Ensure proper initialization

### Monitoring

1. Backend Logs:
```bash
pm2 logs pos-backend
```

2. Nginx Logs:
```bash
tail -f /var/log/nginx/error.log
```

3. System Resources:
```bash
pm2 monit
```

### Support Contacts

- Technical Support: [Your Contact]
- Emergency: [Emergency Contact]
- Documentation: [Documentation URL]

## File Structure Overview

### Server Side (`/server/src`)

- `index.js` — Main entry point for the Express server and Socket.IO setup.
- `config/` — Configuration files:
  - `env.js` — Loads environment variables and app constants.
  - `database.js` — Database connection and initialization logic.
  - `socket.js` — Socket.IO server configuration.
  - `multer.js` — File upload configuration.
- `routes/` — All API route definitions (e.g., `orders.routes.js`, `auth.routes.js`, etc.).
- `middleware/` — Express middleware (e.g., `auth.js` for authentication and role checks).
- `uploads/` — Directory for uploaded files (e.g., product images).
- `db/` — (Reserved for database-related scripts or migrations, if any).
- `controllers/` — (Reserved for controller logic, if separated from routes).
- `models/` — (Reserved for database models, if using ORM or structured models).
- `utils/` — (Reserved for utility/helper functions).
- `reset-db.js` — Script to reset or seed the database.
- `pos.db` — SQLite database file.

### Client Side (`/client/src`)

- `index.jsx` / `main.jsx` — Main entry points for the React app.
- `App.jsx` / `App.tsx` — Root React component.
- `config/` — App configuration:
  - `env.js` — Centralized environment variables for the client.
  - `api.js` — API endpoint definitions.
- `pages/` — Main page components (e.g., `Login.jsx`, `Dashboard.jsx`, `Orders.jsx`, etc.), organized by role (admin, cashier, kitchen, waiter, bartender).
- `components/` — Reusable UI components and layouts (e.g., `CashierLayout.jsx`, `Footer.jsx`).
- `services/` — Service modules for API calls, sockets, offline support, and database helpers:
  - `axiosConfig.js` — Axios instance with auth and base URL.
  - `apiService.js` — API call wrappers.
  - `socketService.js` / `socket.js` — Socket.IO client logic.
  - `db.js` — IndexedDB/local database helpers.
  - `offlineService.js` — Offline data management.
  - `initService.js` — App initialization logic.
- `store/` — Redux store setup and slices (e.g., `authSlice.js`).
- `features/` — (Reserved for feature-specific modules, e.g., authentication).
- `assets/` — Static assets (images, icons, etc.).
- `utils/` — Utility/helper functions (e.g., `currencyFormatter.js`).
- `contexts/` — React context providers (if used). 