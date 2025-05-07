import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useSelector } from 'react-redux';

// Auth Pages
import Login from './pages/Login';
import PinLogin from './pages/PinLogin';

// Layout Components
import AdminLayout from './components/AdminLayout';
import CashierLayout from './components/CashierLayout';
import WaiterLayout from './components/WaiterLayout';
import KitchenLayout from './components/KitchenLayout';
import BartenderLayout from './components/BartenderLayout';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import MenuItems from './pages/admin/MenuItems';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';

// Cashier Pages
import CashierDashboard from './pages/cashier/Dashboard';
import OrderEntry from './pages/cashier/OrderEntry';
import Receipt from './pages/cashier/Receipt';

// Waiter Pages
import WaiterDashboard from './pages/waiter/Dashboard';
import TableManagement from './pages/waiter/TableManagement';

// Kitchen Pages
import KitchenDashboard from './pages/kitchen/Dashboard';

// Bartender Pages
import BartenderDashboard from './pages/bartender/Dashboard';

// Enhanced theme configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1E88E5', // Vibrant blue
      light: '#64B5F6',
      dark: '#0D47A1',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF5722', // Deep orange for actions
      light: '#FF8A65',
      dark: '#D84315',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#E53935', // Red
    },
    warning: {
      main: '#FFC107', // Amber
    },
    info: {
      main: '#00ACC1', // Cyan
    },
    success: {
      main: '#43A047', // Green
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    // Role-specific colors for easier identification
    roles: {
      admin: '#D32F2F', // Red
      cashier: '#1976D2', // Blue
      waiter: '#43A047', // Green
      kitchen: '#FF8F00', // Amber
      bartender: '#8E24AA', // Purple
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
    h4: {
      fontWeight: 500,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 3px 6px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0px 3px 6px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
        head: {
          fontWeight: 700,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

function App() {
  const { token, user } = useSelector((state) => state.auth);

  // Protected route component
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!token) {
      return <Navigate to="/login" />;
    }
    
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
      // Redirect to the appropriate dashboard based on role
      switch(user?.role) {
        case 'admin':
          return <Navigate to="/admin/dashboard" />;
        case 'cashier':
          return <Navigate to="/cashier/dashboard" />;
        case 'waiter':
          return <Navigate to="/waiter/dashboard" />;
        case 'kitchen':
          return <Navigate to="/kitchen/dashboard" />;
        case 'bartender':
          return <Navigate to="/bartender/dashboard" />;
        default:
          return <Navigate to="/login" />;
      }
    }
    
    return children;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route path="/pin-login" element={!token ? <PinLogin /> : <Navigate to="/" />} />
          
          {/* Root Redirect */}
          <Route path="/" element={<Navigate to={token ? `/${user?.role}/dashboard` : "/login"} />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="items" element={<MenuItems />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* Cashier Routes */}
          <Route path="/cashier" element={
            <ProtectedRoute allowedRoles={['cashier']}>
              <CashierLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<CashierDashboard />} />
            <Route path="order" element={<OrderEntry />} />
            <Route path="receipt/:orderId" element={<Receipt />} />
          </Route>
          
          {/* Waiter Routes */}
          <Route path="/waiter" element={
            <ProtectedRoute allowedRoles={['waiter']}>
              <WaiterLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<WaiterDashboard />} />
            <Route path="tables" element={<TableManagement />} />
          </Route>
          
          {/* Kitchen Routes */}
          <Route path="/kitchen" element={
            <ProtectedRoute allowedRoles={['kitchen']}>
              <KitchenLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<KitchenDashboard />} />
          </Route>
          
          {/* Bartender Routes */}
          <Route path="/bartender" element={
            <ProtectedRoute allowedRoles={['bartender']}>
              <BartenderLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<BartenderDashboard />} />
          </Route>
          
          {/* Catch all - redirects to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App; 