# POS System

A modern Point of Sale (POS) system with real-time order management, inventory tracking, and sales reporting.

## Project Structure

```
pos-system/
├── client/             # Frontend React application
│   ├── src/
│   ├── .env           # Frontend environment variables
│   └── package.json
├── server/            # Backend Node.js application
│   ├── src/
│   ├── .env          # Backend environment variables
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- SQLite3

## Setup Instructions

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the server directory with the following content:
   ```env
   PORT=5001
   NODE_ENV=development
   DB_PATH=./src/pos.db
   JWT_SECRET=your-secret-key-change-in-production
   JWT_EXPIRATION=24h
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
   UPLOAD_DIR=./src/uploads
   MAX_FILE_SIZE=5242880
   ```

4. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the client directory with the following content:
   ```env
   VITE_API_URL=http://localhost:5001
   VITE_API_BASE_URL=http://localhost:5001/api
   VITE_SOCKET_URL=http://localhost:5001
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Production Deployment

### Backend Deployment

1. Update the server's `.env` file with production values:
   ```env
   NODE_ENV=production
   JWT_SECRET=your-secure-production-secret
   ALLOWED_ORIGINS=https://your-frontend-domain.com
   ```

2. Build and start the server:
   ```bash
   npm run build
   npm start
   ```

### Frontend Deployment

1. Create a `.env.production` file in the client directory:
   ```env
   VITE_API_URL=https://your-api-domain.com
   VITE_API_BASE_URL=https://your-api-domain.com/api
   VITE_SOCKET_URL=https://your-api-domain.com
   ```

2. Build the frontend:
   ```bash
   npm run build
   ```

3. Deploy the contents of the `dist/` directory to your web server.

## Environment Variables

### Backend Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5001 |
| NODE_ENV | Environment mode | development |
| DB_PATH | SQLite database path | ./src/pos.db |
| JWT_SECRET | JWT signing key | - |
| JWT_EXPIRATION | JWT expiration time | 24h |
| ALLOWED_ORIGINS | CORS allowed origins | http://localhost:5173,http://localhost:5174 |
| UPLOAD_DIR | File upload directory | ./src/uploads |
| MAX_FILE_SIZE | Maximum file upload size | 5MB |

### Frontend Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:5001 |
| VITE_API_BASE_URL | Backend API base URL | http://localhost:5001/api |
| VITE_SOCKET_URL | WebSocket server URL | http://localhost:5001 |

## Features

- Real-time order management
- Inventory tracking
- Sales reporting
- User role management (Admin, Cashier, Waiter)
- File upload support
- WebSocket integration for real-time updates

## Development Guidelines

1. Always use environment variables for configuration
2. Follow the established project structure
3. Use the centralized configuration files:
   - Frontend: `client/src/config/env.js`
   - Backend: `server/src/config/env.js`

## Troubleshooting

1. **CORS Issues**
   - Ensure ALLOWED_ORIGINS in server .env matches your frontend URL
   - Check that API_URL in frontend .env matches your backend URL

2. **Socket.IO Connection Issues**
   - Verify SOCKET_URL in frontend .env
   - Check WebSocket server configuration
   - Ensure authentication token is properly set

3. **Database Issues**
   - Check DB_PATH in server .env
   - Ensure proper permissions on the database file
   - Run database migrations if needed

## Support

For issues and feature requests, please create an issue in the repository.

## Default Users

| Username | Password | PIN Code | Role | Login Method |
|----------|----------|----------|------|-------------|
| admin | admin123 | N/A | Administrator | Username/Password |
| cashier1 | cashier123 | N/A | Cashier | Phone/Password |
| waiter1 | N/A | 123456 | Waiter | PIN Code |
| kitchen1 | kitchen123 | N/A | Kitchen Staff | Username/Password |
| bartender1 | bartender123 | N/A | Bartender | Username/Password |

## Login Methods

- **Regular Login**: For Administrators, Kitchen Staff, and Bartenders (username/password)
- **Cashier Login**: Phone number and password
- **PIN Login**: For waiters (6-digit PIN)

## Role-based Access

### Administrator
- Manage users (create, edit, delete)
- Manage menu items (food and drinks)
- View reports and analytics
- Configure system settings

### Cashier
- Create and manage orders
- Process payments
- Generate receipts
- View order history

### Waiter
- Manage tables
- Take orders
- Update order status

### Kitchen Staff
- View food orders
- Update food item status (in preparation, ready)
- Mark items as complete

### Bartender
- View drink orders
- Update drink item status
- Mark items as complete

## API Endpoints

- `/api/auth/login` - User authentication
- `/api/users` - User management (admin only)
- `/api/items` - Menu item management
- `/api/orders` - Order management
- `/api/reports` - Reporting and analytics