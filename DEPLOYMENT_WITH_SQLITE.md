# POS System Deployment & Technical Guide (SQLite Version)

---

## 1. Project Overview

This POS system is a full-stack web application for restaurant management, supporting:
- Multi-role users (Admin, Cashier, Waiter, etc.)
- Real-time order management (Socket.IO)
- Offline support (IndexedDB in browser)
- Sales reporting, table management, and more

**Tech Stack:**
- **Frontend:** React.js (Vite), Material-UI, Redux, IndexedDB, Socket.IO
- **Backend:** Node.js (Express), SQLite3, Socket.IO, JWT

---

## 2. Project Structure

```
pos-system/
├── client/                 # Frontend (React)
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/                 # Backend (Node.js/Express)
│   ├── src/
│   └── package.json
│
└── package.json            # Root
```

---

## 3. How SQLite and IndexedDB Are Handled

### A. SQLite (Backend)
- **SQLite** is a file-based database. In this project, the database file (e.g., `pos.db`) is stored in the `server/` directory.
- **All backend data** (users, orders, items, etc.) is stored in this file.
- **Node.js/Express** uses the `sqlite3` package to read/write data.
- **No separate database server** is needed; the file is accessed directly by the backend process.
- **Backups:** You must regularly back up the `pos.db` file to prevent data loss.
- **Concurrency:** Only one write operation can happen at a time, but this is fine for low-traffic, single-location use.

### B. IndexedDB (Frontend)
- **IndexedDB** is a browser-based database for offline support.
- The React app uses IndexedDB to store orders, receipts, and other data when the user is offline.
- When the connection is restored, the app syncs data from IndexedDB to the backend (SQLite).
- **No server setup is needed** for IndexedDB; it works automatically in the browser.

---

## 4. Local Setup (Test Before Deploying)

### A. Prerequisites
- Node.js (v18+ recommended)
- npm
- git

### B. Clone the Repository
```bash
git clone <repository-url>
cd pos-system
```

### C. Install Dependencies
```bash
# Install root dependencies (if any)
npm install

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### D. Environment Variables
- **Backend:** Create `server/.env`:
  ```
  PORT=5001
  JWT_SECRET=your-secret-key
  NODE_ENV=development
  ```
- **Frontend:** Create `client/.env` (optional, for custom API URL):
  ```
  VITE_API_URL=http://localhost:5001
  ```

### E. Start the Application
```bash
# Start backend (in server/)
npm run dev

# Start frontend (in client/)
npm run dev
```
- Visit `http://localhost:5173` in your browser.
- Log in with default credentials (see documentation).

### F. Test All Features
- Place orders, view reports, test offline mode (disconnect/reconnect).
- Make sure everything works as expected.

---

## 5. AWS Deployment (Production) Using SQLite

### A. Launch an EC2 Instance
- Use Amazon Linux 2 or Ubuntu.
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 5001 (API, optional).

### B. Connect to EC2
```bash
ssh -i your-key.pem ec2-user@<ec2-public-ip>
```

### C. Install Dependencies
```bash
sudo yum update -y
sudo yum install -y git
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
sudo npm install -g pm2
```

### D. Upload Project to EC2
```bash
git clone <repository-url>
cd pos-system
```
- Or use `scp` to copy files from your local machine.

### E. Build the Frontend
```bash
cd client
npm install
npm run build
```
- This creates `client/dist/` with static files.

### F. Set Up the Backend
```bash
cd ../server
npm install
```
- Ensure your SQLite database file (e.g., `pos.db`) is present in `server/`.
- Create `.env` as above.

### G. Serve the Frontend with Express (Recommended for Simplicity)
- In `server/src/index.js`, add:
  ```js
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
  ```
- This serves the React app and API from the same server.

### H. Start the Backend
```bash
pm2 start src/index.js --name pos-server
```
- Or use `node src/index.js` for testing.

### I. Configure Security
- Set up security groups/firewall to allow only necessary ports.
- (Optional) Set up HTTPS with Nginx or a reverse proxy.

### J. Set Up Backups for SQLite
- Automate backups of your SQLite file (e.g., with a cron job):
  ```bash
  crontab -e
  # Add this line to back up every night at 2am
  0 2 * * * cp /home/ec2-user/pos-system/server/pos.db /home/ec2-user/pos-system/server/backups/pos-$(date +\%F).db
  ```
- (Optional) Sync backups to S3.

---

## 6. Offline Support (IndexedDB)

- **No special server setup is needed.**
- IndexedDB works in the browser for offline orders, receipts, etc.
- When the user reconnects, the app will sync data with the backend automatically.
- Service workers and sync logic are handled in the React app code.

---

## 7. Default Users

- Admin: `admin` / `admin123`
- Cashier: `cashier1` / `cashier123`
- Waiter: `waiter1` / PIN: `123456`
- (Change these after first login!)

---

## 8. Troubleshooting

- **If the site doesn't load:** Check PM2 logs (`pm2 logs`), check security groups, check that the backend is running.
- **If API calls fail:** Check CORS settings, check `.env` files, check network/firewall.
- **If offline mode doesn't work:** Test in Chrome/Edge, check browser console for errors.

---

## 9. Summary Checklist

- [ ] Project runs locally (frontend & backend)
- [ ] Project cloned to EC2, dependencies installed
- [ ] Frontend built, backend running with PM2
- [ ] SQLite DB file present and backed up
- [ ] Security groups/firewall configured
- [ ] Offline mode (IndexedDB) tested in browser

---

## 10. Contact & Support

- For any issues, check the documentation or contact the original developer.

---

**This guide is designed for direct application by a project manager or devops engineer. If you need sample scripts, Nginx config, or further help, see the main documentation or contact the developer.** 