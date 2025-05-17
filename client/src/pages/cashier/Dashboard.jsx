import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Stack,
  useTheme,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Snackbar,
  Tooltip,
  Badge,
  ListItem,
  ListItemText,
  ListItemIcon,
  Menu,
  List,
  InputAdornment
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon,
  Restaurant as RestaurantIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Print as PrintIcon,
  Payment as PaymentIcon,
  Notifications as NotificationsIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';
import * as offlineService from '../../services/offlineService';

export default function CashierDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalSales: 0,
    pendingOrders: 0,
    completedOrders: 0,
    dailyRevenue: 0,
    salesByCategory: {
      food: 0,
      drinks: 0
    }
  });
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const user = useSelector((state) => state.auth.user);
  const token = localStorage.getItem('token');
  
  // State for order status management
  const [orderStatusDialog, setOrderStatusDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [orders, setOrders] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [billRequests, setBillRequests] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);

  // Add offline state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({ syncing: false, message: '' });

  // Setup online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setSyncStatus({ syncing: true, message: 'Reconnected! Syncing data...' });
      syncOfflineData();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setSyncStatus({ syncing: false, message: 'Working offline. Changes will sync when reconnected.' });
    };
    
    const cleanup = offlineService.initOfflineListeners(handleOnline, handleOffline);
    
    return cleanup;
  }, [token]);

  // Function to sync offline data
  const syncOfflineData = async () => {
    if (navigator.onLine) {
      try {
        const result = await offlineService.syncWithServer(axios);
        setSyncStatus({ 
          syncing: false, 
          message: result.success ? 
            `Sync complete: ${result.message}` : 
            `Sync failed: ${result.message}`
        });
        
        // Refresh dashboard data after sync
        handleRefresh();
        
        setSnackbar({
          open: true,
          message: result.success ? 'Offline data synced successfully' : 'Failed to sync some offline data',
          severity: result.success ? 'success' : 'warning'
        });
      } catch (error) {
        console.error('Error syncing offline data:', error);
        setSyncStatus({ 
          syncing: false, 
          message: `Sync error: ${error.message}`
        });
        
        setSnackbar({
          open: true,
          message: 'Error syncing offline data',
          severity: 'error'
        });
      }
    }
  };

  // Modify fetchDashboardData to handle offline mode
  const fetchDashboardData = async () => {
      try {
        setLoading(true);
      
      if (navigator.onLine) {
        const response = await axios.get('http://localhost:5001/api/dashboard/cashier', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setData(response.data);
      } else {
        // Use offline data when not connected
        const offlineData = offlineService.getOfflineDashboardData();
        setData(offlineData);
      }
      
        setLoading(false);
      } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Fallback to offline data on error
      const offlineData = offlineService.getOfflineDashboardData();
      setData(offlineData);
      
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchDashboardData();
  }, [token, refreshing]);

  // Socket.IO connection for real-time updates
  useEffect(() => {
    const socket = io('http://localhost:5001');
    
    socket.on('connect', () => {
      console.log('Cashier connected to socket server');
    });
    
    socket.on('bill_requested', (notification) => {
      console.log('Bill request received:', notification);
      // Ensure notification has all required fields
      const formattedNotification = {
        table_id: notification.table_id,
        table_number: notification.table_number,
        waiter_id: notification.waiter_id,
        waiter_name: notification.waiter_name || 'Unknown',
        timestamp: notification.timestamp || new Date().toISOString()
      };
      
      // Add to bill requests without duplicates
      setBillRequests(prev => {
        // Check if we already have this table in the requests
        const exists = prev.some(req => req.table_id === formattedNotification.table_id);
        if (exists) return prev;
        return [formattedNotification, ...prev];
      });
      
      // Update notification count
      setNotificationCount(prevCount => prevCount + 1);
      
      // Show notification to user
      setSnackbar({
        open: true,
        message: `Table ${notification.table_number} has requested a bill`,
        severity: 'info'
      });
    });
    
    socket.on('table_status_updated', (table) => {
      console.log('Table status updated received in cashier:', table);
      // If a table is marked as "paid" or "open", remove it from bill requests
      if (table.status === 'paid' || table.status === 'open') {
        setBillRequests(prev => {
          const filtered = prev.filter(request => request.table_id !== table.id);
          console.log('Filtered bill requests:', filtered);
          // Update notification count
          setNotificationCount(filtered.length);
          return filtered;
        });
      }
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  // Load existing bill requests when component mounts
  useEffect(() => {
    const fetchBillRequests = async () => {
      try {
        console.log('Fetching bill requests...');
        const response = await axios.get('http://localhost:5001/api/bill-requests', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('Bill requests response:', response.data);
        
        // Format the bill requests for consistency with socket notifications
        const formattedRequests = response.data.map(table => ({
          table_id: table.id,
          table_number: table.table_number,
          waiter_id: table.waiter_id,
          waiter_name: table.waiter_name || 'Unknown',
          timestamp: table.last_updated
        }));
        
        console.log('Formatted bill requests:', formattedRequests);
        setBillRequests(formattedRequests);
        setNotificationCount(formattedRequests.length);
      } catch (error) {
        console.error('Error fetching bill requests:', error);
      }
    };
    
    fetchBillRequests();
  }, [token]);

  // Add fetchOrders function if it doesn't exist, or update it
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        console.log('Fetching orders for cashier dashboard...');
        const response = await axios.get('http://localhost:5001/api/orders', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('Fetched orders:', response.data);
        setOrders(response.data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchOrders();
    // This effect should run after auth token is available and when dashboard is refreshed
  }, [token, refreshing]);

  // Update the handleRefresh function to also refresh orders
  const handleRefresh = () => {
    setRefreshing(true);
    setData({
      totalSales: 0,
      pendingOrders: 0,
      completedOrders: 0,
      dailyRevenue: 0,
      salesByCategory: {
        food: 0,
        drinks: 0
      }
    });
    
    // This will trigger both the dashboard data fetch and orders fetch
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleNewOrder = () => {
    navigate('/cashier/order');
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in-progress':
      case 'ready':
        return 'warning';
      case 'pending':
        return 'error';
      case 'paid':
        return 'secondary';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleUpdateOrderStatus = (order) => {
    setSelectedOrder(order);
    setNewStatus(order.status || 'pending');
    setPaymentAmount(order.total_amount?.toString() || '');
    setOrderStatusDialog(true);
  };

  const handleStatusChange = (event) => {
    setNewStatus(event.target.value);
  };

  const handlePaymentAmountChange = (event) => {
    // Only allow valid numbers
    const value = event.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setPaymentAmount(value);
    }
  };

  const handleSubmitStatusUpdate = async () => {
    try {
      // API call to update order status
      const response = await axios.put(`http://localhost:5001/api/orders/${selectedOrder.id}/status`, {
        status: newStatus,
        payment_amount: parseFloat(paymentAmount)
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update order in local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedOrder.id ? { ...order, status: newStatus } : order
        )
      );
      
      setSnackbar({
        open: true,
        message: `Order ${selectedOrder.id} status updated to ${newStatus}`,
        severity: 'success'
      });
      
      setOrderStatusDialog(false);
      setRefreshing(true); // Trigger a refresh
    } catch (error) {
      console.error('Error updating order status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update order status',
        severity: 'error'
      });
    }
  };

  const handleGenerateReceipt = async (order) => {
    try {
      // Instead of showing an alert, navigate to the receipt page
    navigate(`/cashier/receipt/${order.id}`);
      
      setSnackbar({
        open: true,
        message: `Navigating to receipt for order #${order.id}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error navigating to receipt:', error);
      setSnackbar({
        open: true,
        message: 'Error loading receipt',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handle opening the notification menu
  const handleNotificationClick = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  // Handle closing the notification menu
  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  // Handle selecting a bill request
  const handleBillRequestSelect = (tableId, tableNumber) => {
    // Create a mock order for the table or find existing orders for this table
    const tableOrders = orders.filter(order => order.table_number === tableNumber);
    
    if (tableOrders.length > 0) {
      // If there are orders for this table, select the most recent one
      const mostRecentOrder = tableOrders.reduce((latest, order) => {
        return new Date(order.created_at) > new Date(latest.created_at) ? order : latest;
      }, tableOrders[0]);
      
      handleUpdateOrderStatus(mostRecentOrder);
    } else {
      // Show message if no orders found
      setSnackbar({
        open: true,
        message: `No active orders found for Table ${tableNumber}. Please create a new order.`,
        severity: 'warning'
      });
    }
    
    // Close the notification menu
    handleNotificationClose();
  };

  // Calculate how long ago the bill was requested
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const requestTime = new Date(timestamp);
    const diffMinutes = Math.floor((now - requestTime) / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes === 1) return '1 minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color={theme.palette.roles.cashier}>
          Cashier Dashboard
          {isOffline && (
            <Chip
              label="Offline Mode"
              color="warning"
              size="small"
              sx={{ ml: 2, verticalAlign: 'middle' }}
            />
          )}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Offline sync status */}
          {syncStatus.message && (
            <Typography variant="body2" color={isOffline ? "warning.main" : "success.main"} sx={{ mr: 2 }}>
              {syncStatus.message}
            </Typography>
          )}
          
          {/* Notification Bell */}
          <Tooltip title="Bill Requests">
            <IconButton 
              color="primary" 
              onClick={handleNotificationClick}
              sx={{ mr: 2 }}
            >
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ mr: 2 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            color="primary"
            onClick={handleNewOrder}
          >
            New Order
          </Button>
        </Box>
      </Box>

      {/* Notification Menu */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationClose}
        PaperProps={{
          elevation: 3,
          sx: { width: 320, maxHeight: 400 }
        }}
      >
        <Typography variant="subtitle1" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
          Bill Requests
        </Typography>
        <Divider />
        
        {billRequests.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No pending bill requests
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {billRequests.map((request) => (
              <ListItem 
                key={`${request.table_id}-${request.timestamp}`}
                button
                onClick={() => handleBillRequestSelect(request.table_id, request.table_number)}
                divider
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <ListItemIcon>
                  <MoneyIcon color="warning" />
                </ListItemIcon>
                <ListItemText 
                  primary={`Table ${request.table_number} - Bill Requested`}
                  secondary={`Waiter: ${request.waiter_name || 'Unknown'}`}
                />
                <Tooltip title={new Date(request.timestamp).toLocaleString()}>
                  <Chip 
                    icon={<AccessTimeIcon />}
                    label={getTimeAgo(request.timestamp)}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </Tooltip>
              </ListItem>
            ))}
          </List>
        )}
      </Menu>

      {/* Action Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            background: `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.primary.main}15 100%)`,
            border: `1px solid ${theme.palette.primary.light}30`
          }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CartIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
              <Typography variant="h6" gutterBottom color="primary.main">
                Create New Order
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                Enter a new customer order with items, table number, and assigned waiter
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={handleNewOrder}
                sx={{ mt: 1 }}
              >
                New Order
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%',
            display: 'flex', 
            flexDirection: 'column',
            background: `linear-gradient(135deg, ${theme.palette.secondary.light}15 0%, ${theme.palette.secondary.main}15 100%)`,
            border: `1px solid ${theme.palette.secondary.light}30`
          }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <ReceiptIcon sx={{ fontSize: 48, color: theme.palette.secondary.main, mb: 2 }} />
              <Typography variant="h6" gutterBottom color="secondary.main">
                View Order History
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                Access and print receipts for past orders, check order status and details
              </Typography>
              <Button 
                variant="contained" 
                color="secondary"
                sx={{ mt: 1 }}
              >
                Order History
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.roles.cashier}15 0%, ${theme.palette.roles.cashier}15 100%)`,
            border: `1px solid ${theme.palette.roles.cashier}30`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: `${theme.palette.roles.cashier}20`,
                borderRadius: '50%',
                width: 100,
                height: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MoneyIcon sx={{ fontSize: 40, color: theme.palette.roles.cashier, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color={theme.palette.roles.cashier} variant="overline">
                Today's Sales
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {formatCurrency(data?.dailyRevenue || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                Today's revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.success.light}15 0%, ${theme.palette.success.main}15 100%)`,
            border: `1px solid ${theme.palette.success.light}30`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: `${theme.palette.success.main}20`,
                borderRadius: '50%',
                width: 100,
                height: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <CartIcon sx={{ fontSize: 40, color: theme.palette.success.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="success.main" variant="overline">
                Today's Orders
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {data?.completedOrders || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                Orders processed today
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.warning.light}15 0%, ${theme.palette.warning.main}15 100%)`,
            border: `1px solid ${theme.palette.warning.light}30`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: `${theme.palette.warning.main}20`,
                borderRadius: '50%',
                width: 100,
                height: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <RestaurantIcon sx={{ fontSize: 40, color: theme.palette.warning.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="warning.main" variant="overline">
                Pending Orders
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {data?.pendingOrders || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                Orders waiting to be processed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.info.light}15 0%, ${theme.palette.info.main}15 100%)`,
            border: `1px solid ${theme.palette.info.light}30`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: `${theme.palette.info.main}20`,
                borderRadius: '50%',
                width: 100,
                height: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <PersonIcon sx={{ fontSize: 40, color: theme.palette.info.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="info.main" variant="overline">
                Avg. Order Value
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {formatCurrency(data?.dailyRevenue / data?.completedOrders || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average amount per order
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders Table */}
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Recent Orders"
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<PrintIcon />}
                  size="small"
                  onClick={() => {
                    if (orders.length > 0) {
                      handleGenerateReceipt(orders[0]);
                    }
                  }}
                  disabled={orders.length === 0}
                >
                  View Latest
                </Button>
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            }
          />
          <Divider />
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Table</TableCell>
                    <TableCell>Waiter</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.length > 0 ? (
                    orders.slice(0, 10).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>#{order.id}</TableCell>
                        <TableCell>{order.table_number}</TableCell>
                        <TableCell>{order.waiter_name || 'N/A'}</TableCell>
                        <TableCell>{order.items_count || '?'}</TableCell>
                        <TableCell>${parseFloat(order.total_amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.status || 'pending'}
                            color={getStatusColor(order.status || 'pending')}
                            size="small"
                            sx={{ fontWeight: 'bold', minWidth: '80px', justifyContent: 'center' }}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Update Status">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleUpdateOrderStatus(order)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Receipt">
                            <IconButton 
                              size="small" 
                              color="secondary"
                              onClick={() => handleGenerateReceipt(order)}
                            >
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        {loading ? (
                          <CircularProgress size={24} sx={{ my: 1 }} />
                        ) : (
                          'No recent orders found'
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Order Status Update Dialog */}
      <Dialog open={orderStatusDialog} onClose={() => setOrderStatusDialog(false)}>
        <DialogTitle>
          Update Order #{selectedOrder?.id}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, minWidth: 300 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Order Status</InputLabel>
                  <Select
                    value={newStatus}
                    onChange={handleStatusChange}
                    label="Order Status"
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="ready">Ready</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {(newStatus === 'paid' || newStatus === 'completed') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Payment Amount"
                    value={paymentAmount}
                    onChange={handlePaymentAmountChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">Br</InputAdornment>,
                    }}
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    Table: {selectedOrder?.table_number}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>
                    •
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    Waiter: {selectedOrder?.waiter_name || 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderStatusDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSubmitStatusUpdate}
            startIcon={newStatus === 'paid' ? <PaymentIcon /> : <CheckCircleIcon />}
          >
            {newStatus === 'paid' ? 'Mark as Paid' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 