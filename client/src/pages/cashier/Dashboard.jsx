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
  InputAdornment,
  ListSubheader
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
import socketService from '../../services/socketService';
import Footer from '../../components/Footer';

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
  
  const [orderStatusDialog, setOrderStatusDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [orders, setOrders] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [billRequests, setBillRequests] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({ syncing: false, message: '' });
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const today = new Date();
  const todayFormatted = today.toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(todayFormatted);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [customDate, setCustomDate] = useState('');
  const [availableDates, setAvailableDates] = useState([]);

  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getAvailableDates = (ordersData) => {
    const dates = {};
    const result = [];
    
    ordersData.forEach(order => {
      if (order.created_at) {
        try {
          const date = new Date(order.created_at);
          const dateString = date.toISOString().split('T')[0];
          const displayDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          if (!dates[dateString]) {
            dates[dateString] = {
              date: dateString,
              count: 0,
              display: displayDate
            };
          }
          
          dates[dateString].count++;
        } catch (e) {
          console.error(`Error parsing date for order ${order.id}:`, e);
        }
      }
    });
    
    Object.values(dates).forEach(item => result.push(item));
    result.sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log('Available dates from orders:', result);
    return result;
  };
  
  useEffect(() => {
    if (orders.length > 0) {
      const dates = getAvailableDates(orders);
      setAvailableDates(dates);
    }
  }, [orders]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      setSyncStatus('Connected');
      
      try {
        await offlineService.syncWithServer();
        setSyncStatus('Data synchronized successfully');
        fetchDashboardData();
        fetchOrders();
        fetchBillRequests();
      } catch (error) {
        console.error('Error syncing offline data:', error);
        setSyncStatus('Error syncing data. Will retry automatically.');
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setSyncStatus({ syncing: false, message: 'Working offline. Changes will sync when reconnected.' });
      fetchOfflineData();
    };
    
    const cleanup = offlineService.initOfflineListeners(handleOnline, handleOffline);
    return cleanup;
  }, [token]);

  const syncOfflineData = async () => {
    if (navigator.onLine) {
      try {
        const result = await offlineService.syncWithServer();
        setSyncStatus({ syncing: false, message: result.success ? `Sync complete: ${result.message}` : `Sync failed: ${result.message}` });
        fetchDashboardData();
        fetchOrders();
        fetchBillRequests();
        setSnackbar({
          open: true,
          message: result.success ? 'Offline data synced successfully' : 'Failed to sync some offline data',
          severity: result.success ? 'success' : 'warning'
        });
      } catch (error) {
        console.error('Error syncing offline data:', error);
        setSyncStatus({ syncing: false, message: `Sync error: ${error.message}` });
        setSnackbar({ open: true, message: 'Error syncing offline data', severity: 'error' });
      }
    }
  };

  const fetchDashboardData = async () => {
      try {
        setLoading(true);
      let dashboardData;
      
      if (navigator.onLine) {
        try {
        const response = await axios.get('http://localhost:5001/api/dashboard/cashier', {
            headers: { Authorization: `Bearer ${token}` }
        });
          dashboardData = response.data;
          
          // Cache dashboard data for offline use
          await offlineService.saveDashboardDataOffline(dashboardData);
        } catch (apiError) {
          console.error('API Error:', apiError);
          // On API error, try to load from offline storage
          dashboardData = await offlineService.getOfflineDashboardData();
          if (!dashboardData) {
            throw new Error('Failed to load dashboard data from both API and offline storage');
          }
        }
      } else {
        // Load from offline storage
        dashboardData = await offlineService.getOfflineDashboardData();
        if (!dashboardData) {
          throw new Error('No offline dashboard data available');
        }
      }
      
      setData(dashboardData);
      } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to load dashboard data',
        severity: 'error'
      });
    } finally {
        setLoading(false);
      }
    };

  const fetchOrders = async () => {
    try {
      let ordersData;

      if (navigator.onLine) {
        try {
          const response = await axios.get('http://localhost:5001/api/orders', {
            headers: { Authorization: `Bearer ${token}` }
          });
          ordersData = response.data;
    
          // Cache orders for offline use
          await Promise.all(ordersData.map(order => 
            offlineService.saveOrderOffline(order).catch(error => 
              console.error(`Error caching order ${order.id}:`, error)
            )
          ));
        } catch (apiError) {
          console.error('API Error:', apiError);
          // On API error, try to load from offline storage
          ordersData = await offlineService.getOfflineOrders();
          if (!ordersData || !ordersData.length) {
            throw new Error('Failed to load orders from both API and offline storage');
          }
        }
      } else {
        // Load from offline storage
        ordersData = await offlineService.getOfflineOrders();
        if (!ordersData || !ordersData.length) {
          throw new Error('No offline orders available');
        }
      }

      // Sort orders by date (newest first) and update state
      ordersData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(ordersData);

      // Update available dates
      const dates = getAvailableDates(ordersData);
      setAvailableDates(dates);

      // Apply date filtering
      if (dateFilter === 'all') {
        setFilteredOrders(ordersData);
      } else {
        const filtered = ordersData.filter(order => {
          const orderDate = new Date(order.created_at).toISOString().split('T')[0];
          return orderDate === dateFilter;
      });
        setFilteredOrders(filtered);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to load orders',
        severity: 'error'
      });
      setOrders([]);
      setFilteredOrders([]);
    }
  };

  const fetchBillRequests = async () => {
    try {
      if (navigator.onLine) {
        const response = await axios.get('http://localhost:5001/api/bill-requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const formattedRequests = response.data.map(table => ({
          table_id: table.id,
          table_number: table.table_number,
          waiter_id: table.waiter_id,
          waiter_name: table.waiter_name || 'Unknown',
          timestamp: table.last_updated
        }));
        setBillRequests(formattedRequests);
        setNotificationCount(formattedRequests.length);
        await offlineService.saveBillRequestOffline(formattedRequests); // Cache bill requests
      } else {
        const offlineRequests = await offlineService.getOfflineBillRequests();
        setBillRequests(offlineRequests);
        setNotificationCount(offlineRequests.length);
      }
    } catch (error) {
      console.error('Error fetching bill requests:', error);
      }
    };

  useEffect(() => {
    fetchDashboardData();
    fetchOrders();
    fetchBillRequests();

    const socket = io('http://localhost:5001');
    socket.on('connect', () => console.log('Cashier connected to socket server'));
    
    socket.on('order_created', (newOrder) => {
      console.log('New order received:', newOrder);
      setOrders(prevOrders => [newOrder, ...prevOrders]);
      if (!navigator.onLine) offlineService.saveOrderOffline([newOrder]);
        handleRefresh();
      setSnackbar({ open: true, message: `New order #${newOrder.id} has been created`, severity: 'success' });
    });

    socket.on('order_status_updated', (updatedOrder) => {
      console.log('Order status updated:', updatedOrder);
      setOrders(prevOrders => prevOrders.map(order => order.id === updatedOrder.id ? { ...order, status: updatedOrder.status } : order));
      setFilteredOrders(prevOrders => prevOrders.map(order => order.id === updatedOrder.id ? { ...order, status: updatedOrder.status } : order));
      if (updatedOrder.status === 'completed' || updatedOrder.status === 'paid') handleRefresh();
    });
    
    socket.on('bill_requested', (notification) => {
      console.log('Bill request received:', notification);
      const formattedNotification = {
        table_id: notification.table_id,
        table_number: notification.table_number,
        waiter_id: notification.waiter_id,
        waiter_name: notification.waiter_name || 'Unknown',
        timestamp: notification.timestamp || new Date().toISOString()
      };
      setBillRequests(prev => {
        const exists = prev.some(req => req.table_id === formattedNotification.table_id);
        if (!exists) return [formattedNotification, ...prev];
        return prev;
      });
      setNotificationCount(prevCount => prevCount + 1);
      setSnackbar({ open: true, message: `Table ${notification.table_number} has requested a bill`, severity: 'info' });
      if (!navigator.onLine) offlineService.saveBillRequestOffline([formattedNotification]);
    });
    
    socket.on('table_status_updated', (table) => {
      console.log('Table status updated received in cashier:', table);
      if (table.status === 'paid' || table.status === 'open') {
        setBillRequests(prev => {
          const filtered = prev.filter(request => request.table_id !== table.id);
          setNotificationCount(filtered.length);
          return filtered;
        });
      }
    });
    
    return () => socket.disconnect();
  }, [dateFilter]);

  const handleDateFilterChange = (event) => {
    const newDateFilter = event.target.value;
    console.log('Date filter changed to:', newDateFilter);
    
    if (newDateFilter === 'today') {
      setDateFilter(todayFormatted);
    } else if (newDateFilter === 'custom') {
      setDateFilter('custom');
    } else {
      setDateFilter(newDateFilter);
    }
    fetchOrders();
  };

  const handleCustomDateChange = (event) => {
    const selectedDate = event.target.value;
    console.log('Custom date selected:', selectedDate);
    setCustomDate(selectedDate);
    setDateFilter(selectedDate);
    fetchOrders();
  };

  useEffect(() => {
    if (orders.length > 0) {
      console.log(`Applying date filter: ${dateFilter} to ${orders.length} orders`);
      if (dateFilter === 'all') {
        setFilteredOrders(orders);
      } else {
        const filterDate = dateFilter === 'today' ? todayFormatted : dateFilter;
        const filtered = orders.filter(order => {
          if (!order.created_at) return false;
          try {
            const orderDate = new Date(order.created_at).toISOString().split('T')[0];
            return orderDate === filterDate;
          } catch (e) {
            console.error(`Error comparing dates for order ${order.id}:`, e);
            return false;
          }
        });
        setFilteredOrders(filtered);
      }
    } else {
      setFilteredOrders([]);
    }
  }, [orders, dateFilter]);

  const analyzeOrderDates = (orders) => {
    const dateMap = {};
    orders.forEach(order => {
      if (!order.created_at) {
        console.log(`Order ${order.id} missing created_at field`);
        return;
      }
      try {
        const dateString = new Date(order.created_at).toISOString().split('T')[0];
        dateMap[dateString] = (dateMap[dateString] || []).concat(order.id);
      } catch (error) {
        console.error(`Error parsing date for order ${order.id}:`, error);
      }
    });
    console.log('Orders by date:', dateMap);
    return dateMap;
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    setData({
      totalSales: 0,
      pendingOrders: 0,
      completedOrders: 0,
      dailyRevenue: 0,
      salesByCategory: { food: 0, drinks: 0 }
    });
    fetchOrders();
    fetchDashboardData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleNewOrder = () => navigate('/cashier/order');

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success';
      case 'in-progress':
      case 'ready': return 'warning';
      case 'pending': return 'error';
      case 'paid': return 'secondary';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const handleUpdateOrderStatus = async (order) => {
    try {
      setUpdatingOrderId(order.id);
      const response = await axios.get(`http://localhost:5001/api/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const detailedOrder = response.data;
      setSelectedOrder(detailedOrder);
      setNewStatus(detailedOrder.status || 'pending');
      setPaymentAmount((detailedOrder.status === 'paid' || detailedOrder.status === 'completed' ? detailedOrder.total_amount : 0).toString());
    } catch (error) {
      console.error('Error fetching order details:', error);
      setSnackbar({ open: true, message: 'Failed to load order details: ' + (error.response?.data?.message || error.message), severity: 'error' });
    } finally {
      setUpdatingOrderId(null);
    }
    setOrderStatusDialog(true);
  };

  const handleStatusChange = (event) => {
    const status = event.target.value;
    setNewStatus(status);
    if ((status === 'completed' || status === 'paid') && selectedOrder) {
      setPaymentAmount(selectedOrder.total_amount?.toString() || '0');
    }
  };

  const handlePaymentAmountChange = (event) => {
    const value = event.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) setPaymentAmount(value);
  };

  const handleSubmitStatusUpdate = async () => {
    try {
      setLoading(true);
      if (newStatus === 'paid' && (!paymentAmount || parseFloat(paymentAmount) <= 0)) {
        setSnackbar({ open: true, message: 'Please enter a valid payment amount', severity: 'error' });
        return;
      }
      const paymentToSend = newStatus === 'paid' ? parseFloat(paymentAmount) : (parseFloat(paymentAmount) || selectedOrder.total_amount || 0);
      const response = await axios.put(`http://localhost:5001/api/orders/${selectedOrder.id}/status`, {
        status: newStatus,
        payment_amount: paymentToSend
      }, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(prevOrders => prevOrders.map(order => order.id === selectedOrder.id ? { ...order, status: newStatus } : order));
      setFilteredOrders(prevOrders => prevOrders.map(order => order.id === selectedOrder.id ? { ...order, status: newStatus } : order));
      setSnackbar({ open: true, message: `Order ${selectedOrder.id} status updated to ${newStatus}`, severity: 'success' });
      if (newStatus === 'completed' || newStatus === 'paid') fetchDashboardData();
    } catch (error) {
      console.error('Error updating order status:', error);
      setSnackbar({ open: true, message: 'Failed to update order status: ' + (error.response?.data?.message || error.message), severity: 'error' });
    } finally {
      setLoading(false);
      setOrderStatusDialog(false);
      setSelectedOrder(null);
      setNewStatus('');
      setPaymentAmount('');
    }
  };

  const handleGenerateReceipt = async (order) => {
    try {
    navigate(`/cashier/receipt/${order.id}`);
      setSnackbar({ open: true, message: `Navigating to receipt for order #${order.id}`, severity: 'success' });
    } catch (error) {
      console.error('Error navigating to receipt:', error);
      setSnackbar({ open: true, message: 'Error loading receipt', severity: 'error' });
    }
  };

  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  const handleNotificationClick = (event) => setNotificationAnchorEl(event.currentTarget);

  const handleNotificationClose = () => setNotificationAnchorEl(null);

  const handleBillRequestSelect = (tableId, tableNumber) => {
    const tableOrders = orders.filter(order => order.table_number === tableNumber);
    if (tableOrders.length > 0) {
      const mostRecentOrder = tableOrders.reduce((latest, order) => new Date(order.created_at) > new Date(latest.created_at) ? order : latest, tableOrders[0]);
      handleUpdateOrderStatus(mostRecentOrder);
    } else {
      setSnackbar({ open: true, message: `No active orders found for Table ${tableNumber}. Please create a new order.`, severity: 'warning' });
    }
    handleNotificationClose();
  };

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

  const renderOrdersTable = () => (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
            <TableCell>Table</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
              <TableRow key={order.id} hover>
                  <TableCell>{order.id}</TableCell>
                <TableCell>Table {order.table_number}</TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleString()}
                  <Typography variant="caption" display="block" color="text.secondary">
                    {getTimeAgo(order.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {order.items?.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0) || 0} items
                  </Typography>
                  {order.items?.map((item, idx) => (
                    <Typography key={idx} variant="caption" display="block" color="text.secondary">
                      {item.quantity}x {item.name}
                    </Typography>
                  ))}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(order.total_amount || 0)}
                </TableCell>
                  <TableCell>
                    <Chip
                      label={order.status}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleUpdateOrderStatus(order)}
                      disabled={updatingOrderId === order.id}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleGenerateReceipt(order)}
                      disabled={order.status !== 'completed' && order.status !== 'paid'}
                    >
                      <PrintIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography>No orders found for the selected date</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
  );

  useEffect(() => {
    console.log(`Fetching orders with filter: ${dateFilter}`);
    fetchOrders();
  }, [dateFilter, token]);

  const renderStatusUpdateDialog = () => (
    <Dialog 
      open={orderStatusDialog} 
      onClose={() => setOrderStatusDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Update Order #{selectedOrder?.id} Status</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={newStatus}
              onChange={handleStatusChange}
              label="New Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          {(newStatus === 'paid' || newStatus === 'completed') && (
            <TextField
              fullWidth
              label="Payment Amount"
              type="number"
              value={paymentAmount}
              onChange={handlePaymentAmountChange}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              sx={{ mb: 2 }}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOrderStatusDialog(false)}>Cancel</Button>
        <Button onClick={handleSubmitStatusUpdate} variant="contained" color="primary" disabled={loading}>
          Update Status
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderDateFilter = () => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <FormControl sx={{ width: 220 }}>
        <InputLabel>Filter by Date</InputLabel>
        <Select
          value={dateFilter === todayFormatted ? 'today' : dateFilter}
          onChange={handleDateFilterChange}
          label="Filter by Date"
        >
          <MenuItem value="all">All Orders</MenuItem>
          <MenuItem value="today">Today ({new Date().toLocaleDateString()})</MenuItem>
          <MenuItem value={new Date(Date.now() - 86400000).toISOString().split('T')[0]}>
            Yesterday ({new Date(Date.now() - 86400000).toLocaleDateString()})
          </MenuItem>
          {availableDates.length > 0 && (
            <>
              <Divider />
              <ListSubheader>Available Dates ({availableDates.length})</ListSubheader>
              {availableDates.map(dateItem => (
                <MenuItem key={dateItem.date} value={dateItem.date}>
                  {dateItem.display} ({dateItem.count} orders)
                </MenuItem>
              ))}
            </>
          )}
          <Divider />
          <MenuItem value="custom">Custom Date...</MenuItem>
        </Select>
      </FormControl>
      {dateFilter === 'custom' && (
        <TextField
          label="Select Date"
          type="date"
          value={customDate || todayFormatted}
          onChange={handleCustomDateChange}
          sx={{ width: 220 }}
          InputLabelProps={{ shrink: true }}
        />
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color={theme.palette.roles.cashier}>
          Cashier Dashboard
          {isOffline && <Chip label="Offline Mode" color="warning" size="small" sx={{ ml: 2, verticalAlign: 'middle' }} />}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {syncStatus.message && (
            <Typography variant="body2" color={isOffline ? "warning.main" : "success.main"} sx={{ mr: 2 }}>
              {syncStatus.message}
            </Typography>
          )}
          <Tooltip title="Bill Requests">
            <IconButton color="primary" onClick={handleNotificationClick} sx={{ mr: 2 }}>
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

      <Menu
        anchorEl={notificationAnchorEl}
        open={Boolean(notificationAnchorEl)}
        onClose={handleNotificationClose}
        PaperProps={{ elevation: 3, sx: { width: 320, maxHeight: 400 } }}
      >
        <Typography variant="subtitle1" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>Bill Requests</Typography>
        <Divider />
        {billRequests.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No pending bill requests</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {billRequests.map((request) => (
              <ListItem 
                key={`${request.table_id}-${request.timestamp}`}
                button
                onClick={() => handleBillRequestSelect(request.table_id, request.table_number)}
                divider
                sx={{ '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' } }}
              >
                <ListItemIcon><MoneyIcon color="warning" /></ListItemIcon>
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

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.primary.main}15 100%)`, border: `1px solid ${theme.palette.primary.light}30` }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CartIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
              <Typography variant="h6" gutterBottom color="primary.main">Create New Order</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                Enter a new customer order with items, table number, and assigned waiter
              </Typography>
              <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleNewOrder} sx={{ mt: 1 }}>
                New Order
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${theme.palette.secondary.light}15 0%, ${theme.palette.secondary.main}15 100%)`, border: `1px solid ${theme.palette.secondary.light}30` }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <ReceiptIcon sx={{ fontSize: 48, color: theme.palette.secondary.main, mb: 2 }} />
              <Typography variant="h6" gutterBottom color="secondary.main">View Order History</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                Access and print receipts for past orders, check order status and details
              </Typography>
              <Button variant="contained" color="secondary" sx={{ mt: 1 }}>Order History</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ height: '100%', background: `linear-gradient(135deg, ${theme.palette.roles.cashier}15 0%, ${theme.palette.roles.cashier}15 100%)`, border: `1px solid ${theme.palette.roles.cashier}30`, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -15, right: -15, backgroundColor: `${theme.palette.roles.cashier}20`, borderRadius: '50%', width: 100, height: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <MoneyIcon sx={{ fontSize: 40, color: theme.palette.roles.cashier, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color={theme.palette.roles.cashier} variant="overline">Today's Sales</Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {formatCurrency(data?.dailyRevenue || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} /> Today's revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ height: '100%', background: `linear-gradient(135deg, ${theme.palette.success.light}15 0%, ${theme.palette.success.main}15 100%)`, border: `1px solid ${theme.palette.success.light}30`, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -15, right: -15, backgroundColor: `${theme.palette.success.main}20`, borderRadius: '50%', width: 100, height: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CartIcon sx={{ fontSize: 40, color: theme.palette.success.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="success.main" variant="overline">Today's Orders</Typography>
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
          <Card elevation={0} sx={{ height: '100%', background: `linear-gradient(135deg, ${theme.palette.warning.light}15 0%, ${theme.palette.warning.main}15 100%)`, border: `1px solid ${theme.palette.warning.main}30`, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -15, right: -15, backgroundColor: `${theme.palette.warning.main}20`, borderRadius: '50%', width: 100, height: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ReceiptIcon sx={{ fontSize: 40, color: theme.palette.warning.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="warning.main" variant="overline">Pending Orders</Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {data?.pendingOrders || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                Orders waiting to be processed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {renderDateFilter()}
      {renderOrdersTable()}
      {renderStatusUpdateDialog()}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Footer />
    </Box>
  );
}