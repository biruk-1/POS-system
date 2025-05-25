# POS System Deployment Documentation

## 1. Project Overview

This is a full-stack Point of Sale (POS) system with the following key features:
- Multi-role user system (Admin, Cashier, Waiter, Kitchen, Bartender)
- Real-time order management
- Offline functionality with IndexedDB
- Sales reporting and analytics
- Table management
- Receipt generation
- Menu management

## 2. Technology Stack

### Frontend
- React.js with Vite
- Material-UI (MUI) for UI components
- Redux for state management
- IndexedDB for offline storage
- Socket.IO for real-time updates

### Backend
- Node.js with Express
- SQLite3 for database
- Socket.IO for real-time communication
- JWT for authentication

## 3. Project Structure

```
pos-system/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API and offline services
│   │   ├── utils/        # Utility functions
│   │   └── App.jsx       # Main application component
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
│
├── server/                # Backend application
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Express middleware
│   │   └── index.js      # Server entry point
│   └── package.json      # Backend dependencies
│
└── package.json          # Root package.json
```

## 4. Database Structure

### SQLite Database (Server)
1. Users Table
   - id (PRIMARY KEY)
   - username
   - password (hashed)
   - phone_number
   - pin_code
   - role
   - created_at

2. Items Table
   - id (PRIMARY KEY)
   - name
   - description
   - price
   - item_type (food/drink)
   - image
   - category
   - created_at

3. Orders Table
   - id (PRIMARY KEY)
   - waiter_id
   - cashier_id
   - table_number
   - total_amount
   - status
   - created_at

4. Order Items Table
   - id (PRIMARY KEY)
   - order_id
   - item_id
   - quantity
   - price
   - status
   - item_type

### IndexedDB (Client)
1. Users Store
2. Orders Store
3. Receipts Store
4. Settings Store
5. Menu Items Store
6. Tables Store
7. Reports Store
8. Sync Queue Store

## 5. Local Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd pos-system
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Start the development servers:
```bash
# Start backend server (from server directory)
npm run dev

# Start frontend server (from client directory)
npm run dev
```

## 6. AWS Deployment Guide

### Prerequisites
1. AWS Account
2. AWS CLI installed and configured
3. Node.js and npm installed
4. Git installed

### Step 1: Prepare the Application

1. Build the frontend:
```bash
cd client
npm run build
```

2. Update environment variables:
   - Create `.env` files for both client and server
   - Update API endpoints to use AWS URLs

### Step 2: Set Up AWS Services

1. **EC2 Instance Setup**
   - Launch an EC2 instance (t2.micro or larger)
   - Configure security groups:
     - HTTP (80)
     - HTTPS (443)
     - Custom TCP (5001) for API
     - Custom TCP (5173) for development

2. **RDS Setup**
   - Create an RDS instance (SQLite to PostgreSQL migration)
   - Configure security groups
   - Note down connection details

3. **S3 Setup**
   - Create a bucket for static assets
   - Configure CORS
   - Set up bucket policies

### Step 3: Database Migration

1. Install PostgreSQL client:
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

2. Create migration script:
```javascript
// server/src/migrate-to-postgres.js
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
```

3. Run migration:
```bash
node src/migrate-to-postgres.js
```

### Step 4: Deploy Backend

1. SSH into EC2:
```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

2. Install dependencies:
```bash
sudo apt-get update
sudo apt-get install nodejs npm
```

3. Clone and setup:
```bash
git clone <repository-url>
cd pos-system/server
npm install
```

4. Set up PM2:
```bash
npm install -g pm2
pm2 start src/index.js --name pos-server
```

### Step 5: Deploy Frontend

1. Build and upload to S3:
```bash
cd client
npm run build
aws s3 sync dist/ s3://your-bucket-name
```

2. Configure CloudFront:
   - Create distribution
   - Point to S3 bucket
   - Configure SSL certificate

### Step 6: Configure Domain and SSL

1. Route 53 Setup:
   - Create hosted zone
   - Add A records
   - Configure DNS settings

2. SSL Certificate:
   - Request certificate in ACM
   - Validate domain ownership
   - Apply to CloudFront distribution

## 7. Environment Variables

### Backend (.env)
```
PORT=5001
JWT_SECRET=your-secret-key
DB_HOST=your-rds-endpoint
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=pos_db
NODE_ENV=production
```

### Frontend (.env)
```
VITE_API_URL=https://api.yourdomain.com
VITE_SOCKET_URL=wss://api.yourdomain.com
```

## 8. Monitoring and Maintenance

1. Set up CloudWatch:
   - Create dashboard
   - Set up alarms
   - Configure logs

2. Backup Strategy:
   - Daily RDS snapshots
   - S3 versioning
   - Regular database backups

3. Update Process:
```bash
# Pull latest changes
git pull

# Update dependencies
npm install

# Rebuild frontend
cd client
npm run build

# Restart server
pm2 restart pos-server
```

## 9. Security Considerations

1. Implement rate limiting
2. Set up WAF rules
3. Regular security updates
4. SSL/TLS configuration
5. Database encryption
6. Regular security audits

## 10. Troubleshooting

Common issues and solutions:
1. Database connection issues
2. SSL certificate problems
3. CORS configuration
4. Socket.IO connection issues
5. Offline functionality problems

## 11. Support and Maintenance

1. Regular updates:
   - Security patches
   - Dependency updates
   - Feature updates

2. Monitoring:
   - Server health
   - Database performance
   - Application logs

3. Backup procedures:
   - Database backups
   - File system backups
   - Configuration backups

## 12. Default User Credentials

The system comes with the following default users:

1. Admin
   - Username: admin
   - Password: admin123

2. Cashier
   - Username: cashier1
   - Password: cashier123

3. Waiter
   - Username: waiter1
   - PIN: 123456

4. Kitchen
   - Username: kitchen1
   - Password: kitchen123

5. Bartender
   - Username: bartender1
   - Password: bartender123

**Important**: Change these default credentials immediately after first deployment.

## 13. API Endpoints

### Authentication
- POST /api/auth/login - User login
- POST /api/auth/verify-pin - PIN verification for waiters

### Orders
- GET /api/orders - Get all orders
- POST /api/orders - Create new order
- GET /api/orders/:id - Get specific order
- PUT /api/orders/:id - Update order
- DELETE /api/orders/:id - Delete order

### Items
- GET /api/items - Get all items
- POST /api/items - Create new item
- PUT /api/items/:id - Update item
- DELETE /api/items/:id - Delete item

### Users
- GET /api/users - Get all users
- POST /api/users - Create new user
- PUT /api/users/:id - Update user
- DELETE /api/users/:id - Delete user

### Reports
- GET /api/reports/sales - Get sales reports
- GET /api/reports/items - Get item reports
- GET /api/reports/users - Get user reports

## 14. Offline Functionality

The system supports offline operation through IndexedDB:

1. Data Storage:
   - Orders
   - Receipts
   - Menu items
   - User data

2. Sync Process:
   - Automatic sync when online
   - Manual sync option
   - Conflict resolution

3. Offline Limitations:
   - Real-time updates unavailable
   - Some features restricted
   - Data sync required

## 15. Performance Optimization

1. Frontend:
   - Code splitting
   - Lazy loading
   - Image optimization
   - Caching strategies

2. Backend:
   - Query optimization
   - Connection pooling
   - Caching
   - Load balancing

## 16. Testing

1. Unit Tests:
```bash
# Run frontend tests
cd client
npm test

# Run backend tests
cd server
npm test
```

2. Integration Tests:
```bash
# Run all tests
npm run test:integration
```

3. E2E Tests:
```bash
# Run end-to-end tests
npm run test:e2e
```

## 17. Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create pull request

## 18. License

This project is licensed under the MIT License - see the LICENSE file for details. 