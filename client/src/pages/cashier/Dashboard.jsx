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

  // Add date filter state and initialize to today's date
  const today = new Date();
  const todayFormatted = today.toISOString().split('T')[0];
  console.log('Today formatted:', todayFormatted);
  
  const [dateFilter, setDateFilter] = useState(todayFormatted); // Default to today
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [customDate, setCustomDate] = useState('');

  // Add updatingOrderId state
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Add this helper function at the top level of the component
  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // Function to extract available dates from orders
  const getAvailableDates = (ordersData) => {
    const dates = {};
    const result = [];
    
    // Extract unique dates from orders
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
    
    // Convert to array and sort by date (newest first)
    Object.values(dates).forEach(item => {
      result.push(item);
    });
    
    result.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('Available dates from orders:', result);
    return result;
  };
  
  // State to store available dates
  const [availableDates, setAvailableDates] = useState([]);
  
  // Update available dates when orders change
  useEffect(() => {
    if (orders.length > 0) {
      const dates = getAvailableDates(orders);
      setAvailableDates(dates);
    }
  }, [orders]);

  // Setup online/offline listeners
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      setSyncStatus('Connected');
      
      try {
        // Sync offline data with server
        await offlineService.syncWithServer();
        setSyncStatus('Data synchronized successfully');
      } catch (error) {
        console.error('Error syncing offline data:', error);
        setSyncStatus('Error syncing data. Will retry automatically.');
      }
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
    
    // Listen for new orders
    socket.on('order_created', (newOrder) => {
      console.log('New order received:', newOrder);
      
      // Add the new order to the orders list
      setOrders(prevOrders => {
        const updatedOrders = [newOrder, ...prevOrders];
        
        // Also update filtered orders if this order is for today or if showing all orders
        const orderDate = new Date(newOrder.created_at);
        const orderDateString = orderDate.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        
        console.log(`New order date: ${orderDateString}, Today: ${today}, Current filter: ${dateFilter}`);
        
        if (dateFilter === 'all' || (dateFilter === today && orderDateString === today)) {
          setFilteredOrders(prevFiltered => [newOrder, ...prevFiltered]);
        }
        
        return updatedOrders;
      });
      
      // Refresh dashboard data
      handleRefresh();
      
      setSnackbar({
        open: true,
        message: `New order #${newOrder.id} has been created`,
        severity: 'success'
      });
    });
    
    // Listen for order status updates
    socket.on('order_status_updated', (updatedOrder) => {
      console.log('Order status updated:', updatedOrder);
      
      // Update the order in both lists
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === updatedOrder.id 
            ? { ...order, status: updatedOrder.status } 
            : order
        )
      );
      
      setFilteredOrders(prevFiltered => 
        prevFiltered.map(order => 
          order.id === updatedOrder.id 
            ? { ...order, status: updatedOrder.status } 
            : order
        )
      );
      
      // Refresh dashboard data if status is completed or paid
      if (updatedOrder.status === 'completed' || updatedOrder.status === 'paid') {
        handleRefresh();
      }
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
  }, [dateFilter]);

  // Update the handleDateFilterChange function
  const handleDateFilterChange = (event) => {
    const newDateFilter = event.target.value;
    console.log('Date filter changed to:', newDateFilter);
    
    if (newDateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      console.log('Setting filter to today:', today);
      setDateFilter(today);
    } else if (newDateFilter === 'custom') {
      // Don't change the filter yet, wait for custom date input
      setDateFilter('custom');
    } else {
      setDateFilter(newDateFilter);
    }
    
    // Refresh orders when date filter changes
    fetchOrders();
  };

  // Add custom date change handler
  const handleCustomDateChange = (event) => {
    const selectedDate = event.target.value;
    console.log('Custom date selected:', selectedDate);
    setCustomDate(selectedDate);
    setDateFilter(selectedDate);
    fetchOrders();
  };

  // Update the date filtering logic
  useEffect(() => {
    if (orders.length > 0) {
      console.log(`Applying date filter: ${dateFilter} to ${orders.length} orders`);
      
      if (dateFilter === 'all') {
        // Show all orders when 'all' is selected
        setFilteredOrders(orders);
        console.log(`Showing all ${orders.length} orders`);
      } else {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // If filtering for today, use today's date
        const filterDate = dateFilter === 'today' ? today : dateFilter;
        console.log('Filter date:', filterDate);
        
        const filtered = orders.filter(order => {
          if (!order.created_at) {
            console.log(`Order ${order.id} missing created_at field`);
            return false;
          }
          
          try {
            // Convert order date to YYYY-MM-DD format for comparison
            const orderDate = new Date(order.created_at).toISOString().split('T')[0];
            console.log(`Comparing order ${order.id} date: ${orderDate} with filter: ${filterDate}`);
            
            // Compare the dates
            const matches = orderDate === filterDate;
            if (matches) {
              console.log(`Order ${order.id} matches filter date`);
            }
            return matches;
          } catch (e) {
            console.error(`Error comparing dates for order ${order.id}:`, e);
            return false;
          }
        });
        
        console.log(`Filtered to ${filtered.length} orders for date ${filterDate}`);
        if (filtered.length > 0) {
          console.log('Sample filtered orders:', filtered.slice(0, 3).map(o => ({
            id: o.id,
            date: new Date(o.created_at).toISOString().split('T')[0]
          })));
        }
        
        setFilteredOrders(filtered);
      }
    } else {
      setFilteredOrders([]);
    }
  }, [orders, dateFilter]);

  // Debugging function to analyze order dates
  const analyzeOrderDates = (orders) => {
    const dateMap = {};
    
    orders.forEach(order => {
      if (!order.created_at) {
        console.log(`Order ${order.id} missing created_at field`);
        return;
      }
      
      try {
        const orderDate = new Date(order.created_at);
        const dateString = orderDate.toISOString().split('T')[0];
        
        if (!dateMap[dateString]) {
          dateMap[dateString] = [];
        }
        
        dateMap[dateString].push(order.id);
      } catch (error) {
        console.error(`Error parsing date for order ${order.id}:`, error);
      }
    });
    
    console.log('Orders by date:', dateMap);
    return dateMap;
  };
  
  // Modify fetchOrders to get all orders without filtering
  const fetchOrders = async () => {
    try {
      if (navigator.onLine) {
        const response = await axios.get('http://localhost:5001/api/orders', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Store all orders without filtering
        setOrders(response.data);
        console.log(`Fetched ${response.data.length} orders from server`);
        
        // Apply date filtering in the effect hook, not here
      } else {
        const offlineOrders = offlineService.getOfflineOrders();
        setOrders(offlineOrders);
        console.log(`Retrieved ${offlineOrders.length} orders from offline storage`);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch orders',
        severity: 'error'
      });
    }
  };

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
    fetchOrders(); // Fetch orders on component mount
  }, [token]);

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
    
    // Fetch new orders data
    fetchOrders();
    
    // Fetch new dashboard data
    fetchDashboardData();
    
    // Reset refreshing state after a short delay
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

  const handleUpdateOrderStatus = async (order) => {
    try {
      // Fetch detailed order data
      const response = await axios.get(`http://localhost:5001/api/orders/${order.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const detailedOrder = response.data;
      console.log('Fetched detailed order data for status update:', detailedOrder);
      
      setSelectedOrder(detailedOrder);
      setNewStatus(detailedOrder.status || 'pending');
      
      // Set initial payment amount if status is paid or completed
      if (detailedOrder.status === 'paid' || detailedOrder.status === 'completed') {
        const totalAmount = detailedOrder.total_amount || 
          (detailedOrder.items && detailedOrder.items.length > 0 
            ? detailedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            : 0);
        setPaymentAmount(totalAmount.toString());
      } else {
        setPaymentAmount('');
      }
      
      setOrderStatusDialog(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load order details: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    }
  };

  const handleStatusChange = (event) => {
    const status = event.target.value;
    setNewStatus(status);
    
    // Set default payment amount when status changes to completed or paid
    if ((status === 'completed' || status === 'paid') && selectedOrder) {
      setPaymentAmount(selectedOrder.total_amount?.toString() || '0');
    }
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
      setLoading(true);
      
      // Check if payment amount is required but not provided (only for "paid" status)
      if (newStatus === 'paid' && (!paymentAmount || parseFloat(paymentAmount) <= 0)) {
        setSnackbar({
          open: true,
          message: 'Please enter a valid payment amount',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      // For "completed" status, we'll use the order's total amount if no payment is specified
      const paymentToSend = newStatus === 'paid' 
        ? parseFloat(paymentAmount) 
        : (parseFloat(paymentAmount) || selectedOrder.total_amount || 0);
      
      console.log('Sending status update with payment:', {
        status: newStatus,
        payment_amount: paymentToSend
      });
      
      // API call to update order status
      const response = await axios.put(`http://localhost:5001/api/orders/${selectedOrder.id}/status`, {
        status: newStatus,
        payment_amount: paymentToSend
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Order status update response:', response.data);
      
      // Update order in local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedOrder.id ? { ...order, status: newStatus } : order
        )
      );
      
      // Also update in filtered orders
      setFilteredOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedOrder.id ? { ...order, status: newStatus } : order
        )
      );
      
      setSnackbar({
        open: true,
        message: `Order ${selectedOrder.id} status updated to ${newStatus}`,
        severity: 'success'
      });
      
      // Close dialog and reset state
      setOrderStatusDialog(false);
      setSelectedOrder(null);
      setNewStatus('');
      setPaymentAmount('');
      
      // Refresh orders data
      fetchOrders();
      
      // Also refresh dashboard data if status is changed to completed or paid
      if (newStatus === 'completed' || newStatus === 'paid') {
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update order status: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    } finally {
      setLoading(false);
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

  // Update the renderOrdersTable function to use the new date filter
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

  // Add effect to fetch orders when component mounts or date filter changes
  useEffect(() => {
    console.log(`Fetching orders with filter: ${dateFilter}`);
    fetchOrders();
  }, [dateFilter, token]);

  // Add the status update dialog component
  const renderStatusUpdateDialog = () => (
    <Dialog 
      open={orderStatusDialog} 
      onClose={() => setOrderStatusDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Update Order #{selectedOrder?.id} Status
      </DialogTitle>
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
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOrderStatusDialog(false)}>Cancel</Button>
        <Button 
          onClick={handleSubmitStatusUpdate}
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          Update Status
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Update the renderDateFilter function
  const renderDateFilter = () => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <FormControl sx={{ width: 220 }}>
        <InputLabel>Filter by Date</InputLabel>
        <Select
          value={dateFilter === new Date().toISOString().split('T')[0] ? 'today' : dateFilter}
          onChange={handleDateFilterChange}
          label="Filter by Date"
        >
          <MenuItem value="all">All Orders</MenuItem>
          <MenuItem value="today">
            Today ({new Date().toLocaleDateString()})
          </MenuItem>
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
          value={customDate || new Date().toISOString().split('T')[0]}
          onChange={handleCustomDateChange}
          sx={{ width: 220 }}
          InputLabelProps={{
            shrink: true,
          }}
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
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
            border: `1px solid ${theme.palette.warning.main}30`,
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
              <ReceiptIcon sx={{ fontSize: 40, color: theme.palette.warning.main, opacity: 0.5 }} />
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
      </Grid>

      {renderOrdersTable()}
      {renderStatusUpdateDialog()}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Footer />
    </Box>
  );
}