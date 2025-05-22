import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Divider,
  Alert,
  Snackbar,
  useTheme
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  RemoveCircle as RemoveCircleIcon,
  ViewList as ViewListIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';

// Add API URL constant
const API_URL = 'http://localhost:5001/api';

// Add fetchOrdersData helper function
const fetchOrdersData = async (token) => {
  try {
    const response = await axios.get('http://localhost:5001/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

// Add fetchWaitersData helper function
const fetchWaitersData = async (token) => {
  try {
    const response = await axios.get('http://localhost:5001/api/waiters', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching waiters:', error);
    return [];
  }
};

export default function AdminDashboard() {
  const theme = useTheme();
  const token = useSelector((state) => state.auth.token);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [sales, setSales] = useState({
    totalSales: 0,
    completedOrders: 0,
    waiterStats: []
  });
  const [selectedWaiter, setSelectedWaiter] = useState('all');
  const [waiters, setWaiters] = useState([]);
  const [timeRange, setTimeRange] = useState('daily');
  const [socket, setSocket] = useState(null);
  
  // For order search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  
  // For order editing
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [editedOrder, setEditedOrder] = useState(null);
  
  // For notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [customDate, setCustomDate] = useState(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Add fetchOrders function
  const fetchOrders = async () => {
    setLoading(true);
    const data = await fetchOrdersData(token);
    setOrders(data);
    setFilteredOrders(data);
    setLoading(false);
  };

  // Update socket connection setup
  useEffect(() => {
    // Connect to socket server with proper configuration
    const newSocket = io('http://localhost:5001', {
      withCredentials: true,
      transports: ['websocket'],
      auth: {
        token
      },
      extraHeaders: {
        'Access-Control-Allow-Origin': 'http://localhost:5173'
      }
    });

    newSocket.on('connect', () => {
      console.log('Admin connected to socket server');
    });

    newSocket.on('disconnect', () => {
      console.log('Admin disconnected from socket server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token]);

  // Add fetchWaiters function
  const fetchWaiters = async () => {
    const data = await fetchWaitersData(token);
    setWaiters(data);
  };

  // Function to refresh all sales data
  const refreshAllSalesData = () => {
    console.log('Refreshing all sales data...');
    fetchAdminSales();
  };

  useEffect(() => {
    fetchWaiters();
    fetchOrders();
    
    // Initial fetch of sales data with detailed logging
    console.log('Initial component mount - fetching all sales data');
    console.log('Current date:', new Date().toISOString());
    console.log('Default time range:', timeRange);
    
    // Force refresh all sales data on component mount
    refreshAllSalesData();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Update filtered orders when either all orders, selected waiter, search term, or status filter changes
  useEffect(() => {
    if (orders.length > 0) {
      let filtered = [...orders];
      
      // Apply date range filter
      if (dateRange.startDate) {
        const startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(order => new Date(order.created_at) >= startDate);
      }
      
      if (dateRange.endDate) {
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(order => new Date(order.created_at) <= endDate);
      }
      
      // Apply waiter filter
      if (selectedWaiter !== 'all') {
        filtered = filtered.filter(order => 
          order.waiter_id === parseInt(selectedWaiter)
        );
      }
      
      // Apply search term filter
      if (searchTerm.trim() !== '') {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(order => 
          String(order.id).includes(search) || 
          (order.waiter_name && order.waiter_name.toLowerCase().includes(search))
        );
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(order => order.status === statusFilter);
      }
      
      setFilteredOrders(filtered);
    }
  }, [orders, selectedWaiter, searchTerm, statusFilter, dateRange]);

  // Completely rewritten fetch sales function for admin
  const fetchAdminSales = async (timeRangeParam, waiterId = 'all') => {
    try {
      console.log('Fetching admin sales data for:', {
        timeRange: timeRangeParam,
        waiterId,
        customDate: customDate ? customDate.toISOString().split('T')[0] : null
      });

      let url = `http://localhost:5001/api/admin/sales/${timeRangeParam}`;
      const params = new URLSearchParams();

      if (waiterId !== 'all') {
        params.append('waiter_id', waiterId);
      }

      // Handle custom date
      if (timeRangeParam === 'custom' && customDate) {
        const formattedDate = customDate.toISOString().split('T')[0];
        params.append('date', formattedDate);
      }

      // Add cache buster
      params.append('_t', Date.now());

      const response = await fetch(`${url}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Sales data received:', data);

      if (data[timeRangeParam]) {
        setSales(data[timeRangeParam]);
      }
    } catch (error) {
      console.error('Error fetching admin sales:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status
      });
    }
  };

  // Update useEffect to use new fetch function
  useEffect(() => {
    if (token) {
      fetchWaiters();
      fetchAdminSales();
    }
  }, [token, selectedWaiter, timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.IO connection for real-time updates
  useEffect(() => {
    const socket = io('http://localhost:5001', {
      withCredentials: true,
      transports: ['websocket'],
      auth: {
        token
      },
      extraHeaders: {
        'Access-Control-Allow-Origin': 'http://localhost:5173'
      }
    });
    
    socket.on('connect', () => {
      console.log('Admin dashboard connected to socket server');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSnackbar({
        open: true,
        message: 'Failed to connect to real-time updates server',
        severity: 'error'
      });
    });
    
    // Listen for admin-specific sales updates
    socket.on('admin_sales_updated', (data) => {
      console.log('Admin sales update received:', data);
      fetchAdminSales();
    });
    
    // Listen for general sales updates
    socket.on('sales_data_updated', () => {
      console.log('Sales data update received, refreshing');
      fetchAdminSales();
    });
    
    return () => {
      socket.disconnect();
    };
  }, [timeRange, selectedWaiter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (event, newValue) => {
    console.log(`Switching to tab ${newValue} from ${activeTab}`);
    setActiveTab(newValue);
    
    // If switching to sales tab, force refresh all sales data
    if (newValue === 1) {
      console.log(`Tab changed to Sales, forcing refresh of all sales data`);
      console.log('Current time:', new Date().toISOString());
      console.log('Selected waiter:', selectedWaiter);
      console.log('Time range:', timeRange);
      
      // Use the refreshAllSalesData function for a consistent approach
      refreshAllSalesData();
    }
  };

  const handleWaiterFilter = (event) => {
    setSelectedWaiter(event.target.value);
  };

  const handleTimeRangeChange = (event) => {
    const newTimeRange = event.target.value;
    setTimeRange(newTimeRange);
    
    if (newTimeRange === 'custom') {
      setShowCustomDatePicker(true);
      // Don't fetch data yet - wait for date selection
    } else {
      setShowCustomDatePicker(false);
      setCustomDate(null);
      fetchAdminSales(newTimeRange, selectedWaiter);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };
  
  const handleDateRangeChange = (type, event) => {
    setDateRange(prev => ({
      ...prev,
      [type]: event.target.value
    }));
  };
  
  const handleExportCSV = () => {
    // Only export if there are orders to export
    if (filteredOrders.length === 0) {
      setSnackbar({
        open: true,
        message: 'No orders to export',
        severity: 'warning'
      });
      return;
    }
    
    // Convert orders to CSV format
    const headers = ['Order ID', 'Waiter', 'Date', 'Total Amount', 'Status'];
    
    const csvContent = [
      // Headers
      headers.join(','),
      // Data rows
      ...filteredOrders.map(order => [
        order.id,
        order.waiter_name || 'N/A',
        new Date(order.created_at).toLocaleString(),
        order.total_amount || 0,
        order.status || 'pending'
      ].join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Create filename with current date
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `orders-export-${date}.csv`);
    
    // Trigger download and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSnackbar({
      open: true,
      message: `Exported ${filteredOrders.length} orders successfully`,
      severity: 'success'
    });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleRefreshOrders = () => {
    setLoading(true);
    fetchOrders()
      .then(() => {
        setSnackbar({
          open: true,
          message: 'Orders refreshed successfully',
          severity: 'success'
        });
      })
      .catch((error) => {
        console.error('Error refreshing orders:', error);
        setSnackbar({
          open: true,
          message: 'Failed to refresh orders',
          severity: 'error'
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  const handleRefreshSales = () => {
    console.log('Manually refreshing admin sales data');
    fetchAdminSales();
  };

  // Order editing functions
  const handleEditOrder = async (orderId) => {
    console.log('Editing order:', orderId);
    
    try {
      setLoading(true);
      
      // Fetch detailed order data including items
      const response = await axios.get(`http://localhost:5001/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const orderToEdit = response.data;
    
    if (orderToEdit) {
        console.log('Fetched detailed order data:', orderToEdit);
        
        // Ensure items is always an array
        const orderWithItems = {
          ...orderToEdit,
          items: Array.isArray(orderToEdit.items) ? orderToEdit.items : []
        };
        
        setCurrentOrder(orderWithItems);
        setEditedOrder({...orderWithItems});
      setEditDialogOpen(true);
    } else {
      setSnackbar({
        open: true,
        message: `Order #${orderId} not found`,
        severity: 'error'
      });
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setSnackbar({
        open: true,
        message: `Failed to load order details: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = (itemId, field, value) => {
    if (!editedOrder) return;
    
    // Update the item in the edited order
    const updatedItems = editedOrder.items.map(item => 
      item.id === itemId ? {...item, [field]: value} : item
    );
    
    setEditedOrder({
      ...editedOrder,
      items: updatedItems
    });
  };

  const handleRemoveItem = (itemId) => {
    if (!editedOrder) return;
    
    // Remove the item from the edited order
    const updatedItems = editedOrder.items.filter(item => item.id !== itemId);
    
    setEditedOrder({
      ...editedOrder,
      items: updatedItems
    });
  };

  const handleSaveOrder = async () => {
    if (!editedOrder) return Promise.resolve(); // Return resolved promise if no order
    
    try {
      setLoading(true);
      
      // Calculate the new total amount
      const totalAmount = editedOrder.items && editedOrder.items.length > 0
        ? editedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        : 0;
      
      // Prepare the update payload
      const updateData = {
        ...editedOrder,
        total_amount: totalAmount
      };
      
      // Make the API request to update the order
      const response = await axios.put(
        `http://localhost:5001/api/orders/${editedOrder.id}`, 
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        // Close the dialog if it's open
        if (editDialogOpen) {
        setEditDialogOpen(false);
        }
        
        // Refresh the orders list
        fetchOrders();
        
        // Show success message
        setSnackbar({
          open: true,
          message: `Order #${editedOrder.id} updated successfully`,
          severity: 'success'
        });
      }
      
      return response; // Return the response for chaining
    } catch (error) {
      console.error('Error updating order:', error);
      
      setSnackbar({
        open: true,
        message: `Failed to update order: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
      
      throw error; // Re-throw to allow catch in calling code
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    // Confirm deletion with the user
    if (!window.confirm(`Are you sure you want to delete Order #${orderId}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Make the API request to delete the order
      await axios.delete(`http://localhost:5001/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh the orders list
      fetchOrders();
      
      // Show success message
      setSnackbar({
        open: true,
        message: `Order #${orderId} deleted successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      
      setSnackbar({
        open: true,
        message: `Failed to delete order: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add handleCustomDateChange
  const handleCustomDateChange = async (date) => {
    if (!date) {
      // If date is cleared, reset to daily view
      setTimeRange('daily');
      setShowCustomDatePicker(false);
      setCustomDate(null);
      await fetchAdminSales('daily', selectedWaiter);
      return;
    }

    // Ensure date is a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date provided:', date);
      return;
    }

    // Format the date for the API request
    const formattedDate = dateObj.toISOString().split('T')[0];
    console.log('Selected date:', formattedDate);

    // Update state
    setCustomDate(dateObj);
    setTimeRange('custom');
    setShowCustomDatePicker(true);
    
    // Fetch data with the new date
    try {
      const url = `http://localhost:5001/api/admin/sales/custom?date=${formattedDate}&_t=${Date.now()}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Sales data received for date:', formattedDate, data);

      if (data.custom) {
        setSales(data.custom);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch sales data',
        severity: 'error'
      });
    }
  };

  const renderOrdersTab = () => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Orders</Typography>
          <IconButton
            color="primary"
            onClick={handleRefreshOrders}
            disabled={loading}
            title="Refresh Orders"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by ID or waiter..."
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ width: 200 }}
            InputProps={{
              startAdornment: (
                <Box component="span" sx={{ color: 'action.active', mr: 1 }}>
                  🔍
                </Box>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              label="Status"
              size="small"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Waiter</InputLabel>
            <Select
              value={selectedWaiter}
              onChange={handleWaiterFilter}
              label="Filter by Waiter"
              size="small"
            >
              <MenuItem value="all">All Waiters</MenuItem>
              {waiters.map((waiter) => (
                <MenuItem key={waiter.id} value={waiter.id}>
                  {waiter.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>Date Range:</Typography>
        <TextField
          label="From"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={dateRange.startDate || ''}
          onChange={(e) => handleDateRangeChange('startDate', e)}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={dateRange.endDate || ''}
          onChange={(e) => handleDateRangeChange('endDate', e)}
        />
        {(dateRange.startDate || dateRange.endDate) && (
        <Button
            size="small" 
          variant="outlined"
            onClick={() => setDateRange({ startDate: null, endDate: null })}
        >
            Clear Dates
        </Button>
        )}
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 2, minWidth: 200, bgcolor: theme.palette.primary.light, color: 'white' }}>
            <Typography variant="body2">Filtered Orders</Typography>
            <Typography variant="h4">{filteredOrders.length}</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 200, bgcolor: theme.palette.secondary.main, color: 'white' }}>
            <Typography variant="body2">Total Amount</Typography>
            <Typography variant="h4">
              {formatCurrency(
                filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
              )}
              </Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 200, bgcolor: theme.palette.success.main, color: 'white' }}>
            <Typography variant="body2">Paid Orders</Typography>
            <Typography variant="h4">
              {filteredOrders.filter(order => order.status === 'paid').length}
              </Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 200, bgcolor: theme.palette.warning.main, color: 'white' }}>
            <Typography variant="body2">Pending Orders</Typography>
            <Typography variant="h4">
              {filteredOrders.filter(order => order.status === 'pending').length}
              </Typography>
          </Paper>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={handleExportCSV}
          disabled={filteredOrders.length === 0}
          sx={{ height: 'fit-content', alignSelf: 'center' }}
        >
          Export CSV
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: theme.palette.primary.main }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Order ID</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Waiter</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Items</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total Amount</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(filteredOrders) && filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>{order.id}</TableCell>
                  <TableCell>{order.waiter_name || 'N/A'}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<ViewListIcon />}
                      variant="outlined"
                      onClick={() => handleEditOrder(order.id)}
                    >
                      View Items
                    </Button>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{formatCurrency(order.total_amount || 0)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={order.status || 'pending'} 
                      color={
                        order.status === 'completed' || order.status === 'paid' ? 'success' :
                        order.status === 'in-progress' ? 'warning' :
                        order.status === 'cancelled' ? 'error' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      color="primary" 
                      onClick={() => handleEditOrder(order.id)}
                      title="Edit Order"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      color="success" 
                      onClick={async () => {
                        const newStatus = order.status === 'pending' ? 'in-progress' :
                                        order.status === 'in-progress' ? 'completed' :
                                        order.status === 'completed' ? 'paid' : 'pending';
                        
                        // Use local button state instead of global loading
                        const btnEl = document.activeElement;
                        if (btnEl) btnEl.disabled = true;
                        
                        try {
                          // Fetch detailed order data first
                          const response = await axios.get(`http://localhost:5001/api/orders/${order.id}`, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          
                          const detailedOrder = response.data;
                          console.log('Fetched detailed order data for quick update:', detailedOrder);
                          
                          // Create a copy of the order with the updated status
                          const updatedOrder = {
                            ...detailedOrder, 
                            status: newStatus,
                            items: Array.isArray(detailedOrder.items) ? detailedOrder.items : []
                          };
                          
                          setCurrentOrder(detailedOrder);
                          setEditedOrder(updatedOrder);
                          
                          // Call handleSaveOrder directly to update the status
                          await handleSaveOrder();
                        } catch (error) {
                          console.error('Error updating order status:', error);
                          setSnackbar({
                            open: true,
                            message: `Failed to update order status: ${error.message || 'Unknown error'}`,
                            severity: 'error'
                          });
                        } finally {
                          // Re-enable the button
                          if (btnEl) btnEl.disabled = false;
                        }
                      }}
                      title="Update Status"
                      disabled={loading && false} // Ensure button isn't disabled by global loading
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      onClick={() => handleDeleteOrder(order.id)}
                      title="Delete Order"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography>No orders found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
            </Box>
  );

  const renderSalesTab = () => {
    // Initialize waiterSalesMap with empty array if waiters is undefined
    const waiterSalesMap = {};
    
    // First, initialize all waiters with zero sales
    if (Array.isArray(waiters)) {
      waiters.forEach(waiter => {
        waiterSalesMap[waiter.id] = {
          waiter_id: waiter.id,
          waiter_name: waiter.username,
          order_count: 0,
          total_sales: 0,
          avgOrder: 0
        };
      });
    }
    
    // Then, update with actual sales data if available
    if (Array.isArray(sales?.waiterStats)) {
      sales.waiterStats.forEach(stat => {
        if (waiterSalesMap[stat.waiter_id]) {
          waiterSalesMap[stat.waiter_id] = {
            ...stat,
            avgOrder: stat.order_count > 0 ? stat.total_sales / stat.order_count : 0
          };
        }
      });
    }
    
    // Convert map to array and filter by selected waiter if needed
    let filteredWaiters = Object.values(waiterSalesMap);
    if (selectedWaiter !== 'all') {
      filteredWaiters = filteredWaiters.filter(waiter => waiter.waiter_id === parseInt(selectedWaiter));
    }
    
    // Sort by total sales
    const sortedWaiters = filteredWaiters.sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0));
    
    // Create rank map based on total sales
    const rankMap = {};
    let currentRank = 1;
    let previousSales = null;
    let rankCount = 0;

    sortedWaiters.forEach((waiter) => {
      if (previousSales !== waiter.total_sales) {
        currentRank += rankCount;
        rankCount = 0;
      }
      rankCount++;
      rankMap[waiter.waiter_id] = currentRank;
      previousSales = waiter.total_sales;
    });

    // Calculate filtered totals
    const filteredTotalSales = sortedWaiters.reduce((sum, waiter) => sum + (waiter.total_sales || 0), 0);
    const filteredOrderCount = sortedWaiters.reduce((sum, waiter) => sum + (waiter.order_count || 0), 0);
    
    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Admin Sales Overview</Typography>
            <IconButton
              color="primary"
              onClick={handleRefreshSales}
              title="Refresh Sales Data"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={handleTimeRangeChange}
                label="Time Range"
                disabled={loading}
              >
                <MenuItem value="daily">Today</MenuItem>
                <MenuItem value="weekly">Last 7 Days</MenuItem>
                <MenuItem value="monthly">Last 30 Days</MenuItem>
                <MenuItem value="yearly">Last 365 Days</MenuItem>
                <MenuItem value="custom">Custom Date</MenuItem>
              </Select>
            </FormControl>
            
            {showCustomDatePicker && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Select Date"
                  value={customDate}
                  onChange={handleCustomDateChange}
                  slotProps={{ textField: { size: 'small' } }}
                  maxDate={new Date()}
                  format="yyyy-MM-dd"
                />
              </LocalizationProvider>
            )}

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Waiter</InputLabel>
              <Select
                value={selectedWaiter}
                onChange={handleWaiterFilter}
                label="Filter by Waiter"
                disabled={loading}
              >
                <MenuItem value="all">All Waiters</MenuItem>
                {waiters.map((waiter) => (
                  <MenuItem key={waiter.id} value={waiter.id}>
                    {waiter.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedWaiter === 'all' ? 'Total Sales' : 'Filtered Sales'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(filteredTotalSales)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedWaiter === 'all' ? 'Total Orders' : 'Filtered Orders'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {filteredOrderCount}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Average Order Value</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(filteredOrderCount > 0 ? filteredTotalSales / filteredOrderCount : 0)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Time Period</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {timeRange === 'daily' ? 'Today' : 
                     timeRange === 'weekly' ? 'Last 7 Days' : 
                     timeRange === 'monthly' ? 'Last 30 Days' : 'Last 365 Days'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {new Date().toLocaleTimeString()}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {sortedWaiters.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No waiters found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This could be because:
                  <br />1. There are no waiters registered in the system
                  <br />2. The data hasn't been loaded correctly
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 2 }}
                  onClick={handleRefreshSales}
                  startIcon={<RefreshIcon />}
                >
                  Refresh Data
                </Button>
              </Box>
            ) : (
            <Grid container spacing={3}>
              {sortedWaiters.map((waiter) => (
                <Grid item xs={12} sm={6} md={4} key={waiter.waiter_id}>
                  <Paper 
                    sx={{
                      p: 3, 
                        borderTop: `4px solid ${waiter.total_sales > 0 ? theme.palette.primary.main : theme.palette.grey[400]}`,
                      boxShadow: 2,
                      height: '100%',
                      display: 'flex',
                        flexDirection: 'column',
                        opacity: waiter.total_sales > 0 ? 1 : 0.8
                    }}
                  >
                    <Typography variant="h6" gutterBottom color="text.primary">
                      {waiter.waiter_name}
                    </Typography>
                      <Typography variant="h4" color={waiter.total_sales > 0 ? "primary" : "text.secondary"} sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(waiter.total_sales)}
                    </Typography>
                    
                    <Box sx={{ mt: 2, mb: 1 }}>
                      <Divider />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Typography variant="body1" color="text.secondary">
                        Total Orders:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {waiter.order_count}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="body1" color="text.secondary">
                        Avg. Order:
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(waiter.avgOrder)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      mt: 'auto', 
                      pt: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Chip
                        label={`Rank: ${rankMap[waiter.waiter_id]}`}
                          color={waiter.total_sales > 0 ? "primary" : "default"}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            )}
          </>
        )}
      </Box>
    );
  };

  // Order editing dialog
  const renderOrderEditDialog = () => (
    <Dialog 
      open={editDialogOpen} 
      onClose={() => setEditDialogOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}>
        Edit Order #{editedOrder?.id}
      </DialogTitle>
      <DialogContent dividers>
        {editedOrder ? (
          <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Order ID</Typography>
                <Typography variant="body1">{editedOrder.id}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Waiter</Typography>
                <Typography variant="body1">{editedOrder.waiter_name || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                <Typography variant="body1">{new Date(editedOrder.created_at).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <Select
                    value={editedOrder.status || 'pending'}
                    onChange={(e) => setEditedOrder({...editedOrder, status: e.target.value})}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Typography variant="h6" gutterBottom>Order Items</Typography>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editedOrder.items && editedOrder.items.length > 0 ? (
                    editedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Chip
                            label={item.item_type || 'food'} 
                          size="small"
                            color={item.item_type === 'food' ? 'secondary' : 'primary'}
                        />
                      </TableCell>
                      <TableCell align="center">
                          <TextField
                            type="number"
                          size="small"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            InputProps={{ inputProps: { min: 1 } }}
                            sx={{ width: '60px' }}
                        />
                      </TableCell>
                        <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.price * item.quantity)}</TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <RemoveCircleIcon fontSize="small" />
                          </IconButton>
                      </TableCell>
                    </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography>No items in this order</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Order Summary</Typography>
              <Typography variant="h6">
                Total: {formatCurrency(
                  editedOrder.items && editedOrder.items.length > 0
                    ? editedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                    : 0
                )}
              </Typography>
            </Box>
            
            {editedOrder.items && currentOrder?.items && editedOrder.items.length !== currentOrder.items.length && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You have removed items from this order. This action cannot be undone once saved.
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
              <Button
          onClick={() => setEditDialogOpen(false)} 
          startIcon={<CancelIcon />}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSaveOrder} 
          variant="contained" 
                color="primary"
          startIcon={<SaveIcon />}
          disabled={!editedOrder}
              >
          Save Changes
              </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
            </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Orders" />
        <Tab label="Sales" />
      </Tabs>

      {activeTab === 0 && renderOrdersTab()}
      {activeTab === 1 && renderSalesTab()}
      
      {renderOrderEditDialog()}
      
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
    </Box>
  );
} 