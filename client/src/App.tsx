import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AdminLayout from './components/AdminLayout';
import CashierLayout from './components/CashierLayout';
import KitchenLayout from './components/KitchenLayout';
import BartenderLayout from './components/BartenderLayout';
import Login from './pages/Login';
import PinLogin from './pages/PinLogin';
import AdminDashboard from './pages/admin/Dashboard';
import ItemManagement from './pages/admin/ItemManagement';
import UserManagement from './pages/admin/UserManagement';
import ReportView from './pages/admin/ReportView';
import Settings from './pages/admin/Settings';
import CashierDashboard from './pages/cashier/Dashboard';
import OrderEntry from './pages/cashier/OrderEntry';
import OrderHistory from './pages/cashier/OrderHistory';
import KitchenView from './pages/kitchen/KitchenView';
import BartenderView from './pages/bartender/BartenderView';
import './App.css';

// Define interface for RootState
interface RootState {
  auth: {
    isAuthenticated: boolean;
    user: {
      role: string;
    } | null;
  };
}

// Protected route component
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles: string[] }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" />;
    } else if (user.role === 'cashier') {
      return <Navigate to="/cashier/dashboard" />;
    } else if (user.role === 'kitchen') {
      return <Navigate to="/kitchen" />;
    } else if (user.role === 'bartender') {
      return <Navigate to="/bartender" />;
    } else if (user.role === 'waiter') {
      return <Navigate to="/cashier/order-entry" />;
    }
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/pin-login" element={<PinLogin />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/admin/dashboard" />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="items" element={<ItemManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="reports" element={<ReportView />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Cashier Routes */}
        <Route path="/cashier" element={
          <ProtectedRoute allowedRoles={['cashier', 'waiter']}>
            <CashierLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/cashier/dashboard" />} />
          <Route path="dashboard" element={<CashierDashboard />} />
          <Route path="order-entry" element={<OrderEntry />} />
          <Route path="history" element={<OrderHistory />} />
        </Route>

        {/* Kitchen View */}
        <Route path="/kitchen" element={
          <ProtectedRoute allowedRoles={['kitchen', 'admin']}>
            <KitchenLayout />
          </ProtectedRoute>
        }>
          <Route index element={<KitchenView />} />
        </Route>

        {/* Bartender View */}
        <Route path="/bartender" element={
          <ProtectedRoute allowedRoles={['bartender', 'admin']}>
            <BartenderLayout />
          </ProtectedRoute>
        }>
          <Route index element={<BartenderView />} />
        </Route>

        {/* Root Redirect */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Catch-all redirect to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

// Component to redirect based on user role
const RootRedirect = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" />;
    case 'cashier':
      return <Navigate to="/cashier/dashboard" />;
    case 'waiter':
      return <Navigate to="/cashier/order-entry" />;
    case 'kitchen':
      return <Navigate to="/kitchen" />;
    case 'bartender':
      return <Navigate to="/bartender" />;
    default:
      return <Navigate to="/login" />;
  }
};

export default App;
