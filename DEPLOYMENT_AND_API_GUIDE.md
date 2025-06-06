# POS System – Deployment & API Documentation

## 1. Project Structure

```
pos-system/
├── client/    # Frontend (React + Vite)
├── server/    # Backend (Node.js + Express + SQLite)
└── README.md  # Full setup and usage guide
```

---

## 2. Environment Variables

### Backend (`server/.env`)
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

### Frontend (`client/.env`)
```env
VITE_API_URL=http://localhost:5001
VITE_API_BASE_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

> **For production:**  
> Create `.env.production` in `client/` and update URLs to your production domains.

---

## 3. Deployment Steps

### Backend

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment:**
   - Copy the `.env` template above into `server/.env`.
   - Adjust values for production as needed.

3. **Start the server:**
   ```bash
   npm start
   ```
   - The backend will run on the port specified in `.env` (default: 5001).

### Frontend

1. **Install dependencies:**
   ```bash
   cd client
   npm install
   ```

2. **Configure environment:**
   - Copy the `.env` template above into `client/.env`.
   - For production, use `.env.production` with your live API URLs.

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   - The frontend will run on Vite's default port (5173).

4. **Build for production:**
   ```bash
   npm run build
   ```
   - Deploy the contents of `client/dist/` to your web server.

---

## 4. API & Socket.IO Usage

### API Base URL

- All API requests are made to:  
  `http://<backend-domain>:5001/api/`

- The frontend uses environment variables to determine the API base:
  - `VITE_API_BASE_URL` for REST API calls
  - `VITE_SOCKET_URL` for Socket.IO connections

### Example API Endpoints

| Endpoint                        | Method | Description                        | Auth Required | Roles         |
|----------------------------------|--------|------------------------------------|--------------|--------------|
| `/api/auth/login`                | POST   | User login (username/password, PIN, or phone) | No           | All          |
| `/api/items`                     | GET    | List all menu items                | Yes          | All          |
| `/api/items`                     | POST   | Create a new menu item             | Yes          | Admin        |
| `/api/items/:id`                 | PUT    | Update a menu item                 | Yes          | Admin        |
| `/api/items/:id`                 | DELETE | Delete a menu item                 | Yes          | Admin        |
| `/api/orders`                    | GET    | List all orders                    | Yes          | All          |
| `/api/orders`                    | POST   | Create a new order                 | Yes          | Cashier/Waiter|
| `/api/orders/:id`                | GET    | Get order details                  | Yes          | All          |
| `/api/orders/:id`                | PUT    | Update an order                    | Yes          | Admin        |
| `/api/orders/:id`                | DELETE | Delete an order                    | Yes          | Admin        |
| `/api/orders/:id/status`         | PUT    | Update order status                | Yes          | Cashier/Admin|
| `/api/tables`                    | GET    | List all tables                    | No           | All          |
| `/api/tables/:id/status`         | PUT    | Update table status                | Yes          | Waiter/Cashier/Admin |
| `/api/reports/generate`          | POST   | Generate sales reports             | Yes          | Admin        |
| `/api/settings`                  | GET    | Get system settings                | Yes          | Admin        |
| `/api/settings`                  | PUT    | Update system settings             | Yes          | Admin        |
| `/api/waiters`                   | GET    | List all waiters                   | Yes          | Cashier/Admin|
| `/api/sales/daily`               | GET    | Get daily sales data               | Yes          | Cashier/Admin|
| `/api/admin/sales/:timeRange`    | GET    | Get sales data by time range       | Yes          | Admin        |

> **All endpoints requiring authentication expect a JWT token in the `Authorization` header.**

---

### Socket.IO

- **URL:**  
  `http://<backend-domain>:5001` (or as set in `VITE_SOCKET_URL`)
- **Path:**  
  `/socket.io`
- **Auth:**  
  Pass JWT token in the `auth` object when connecting:
  ```js
  const socket = io(SOCKET_URL, { auth: { token: 'JWT_TOKEN' } });
  ```

- **Events:**
  - `order_created`, `order_updated`, `order_deleted`
  - `item_created`, `item_updated`, `item_deleted`
  - `order_status_updated`, `admin_sales_updated`
  - `table_status_updated`, `bill_requested`
  - ...and more, as per business logic

---

## 5. How URLs Are Managed

- **No hardcoded URLs in the codebase.**
- All URLs (API and Socket.IO) are set via environment variables and imported from a single config file:
  - Frontend: `client/src/config/env.js`
  - Backend: `server/src/config/env.js`
- To switch between development and production, just update the `.env` files.

---

## 6. Deployment Checklist

1. **Set up `.env` files** in both `client/` and `server/` with correct URLs and secrets.
2. **Install dependencies** in both `client/` and `server/`.
3. **Start the backend** (`npm start` in `server/`).
4. **Start the frontend** (`npm run dev` in `client/` for development, or build and deploy `dist/` for production).
5. **Test all roles and features** (admin, cashier, waiter, kitchen, bartender).
6. **For production:**  
   - Use HTTPS for both frontend and backend.
   - Set strong secrets in `.env`.
   - Restrict CORS to your production domain.

---

## 7. Troubleshooting

- **CORS errors:**  
  Ensure `ALLOWED_ORIGINS` in `server/.env` matches your frontend URL.
- **Socket.IO connection issues:**  
  Check `VITE_SOCKET_URL` and ensure the backend is running and accessible.
- **API errors:**  
  Check backend logs, ensure DB is accessible, and JWT secrets match.

---

## 8. Support

- For any issues, check the logs in both `client/` and `server/`.
- Refer to the full `README.md` for more details.
- If you need to add new API endpoints or events, follow the structure in `server/src/index.js`.

---

**This setup ensures your PM (or any dev/ops) can deploy, configure, and maintain the POS system with minimal friction. All URLs and secrets are managed via environment variables, and the codebase is ready for both local development and production hosting.** 