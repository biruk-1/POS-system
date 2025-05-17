import { useState, useEffect } from 'react';
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
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';

export default function AdminDashboard() {
  const theme = useTheme();
  const token = useSelector((state) => state.auth.token);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [sales, setSales] = useState({
    daily: [],
    weekly: [],
    monthly: [],
    yearly: []
  });
  const [selectedWaiter, setSelectedWaiter] = useState('all');
  const [waiters, setWaiters] = useState([]);
  const [timeRange, setTimeRange] = useState('daily');
  
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

  useEffect(() => {
    fetchWaiters();
    fetchOrders();
    
    // Use the new function for sales
    if (activeTab === 1) {
      console.log("Initial fetch of sales data");
      fetchSalesWithWaiter('all');
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Update filtered orders when either all orders, selected waiter, search term, or status filter changes
  useEffect(() => {
    if (orders.length > 0) {
      let filtered = [...orders];
      
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
      
      setFilteredOrders(filtered);
    }
  }, [orders, selectedWaiter, searchTerm, statusFilter, dateRange]);

  // Socket.IO connection for real-time updates
  useEffect(() => {
    const socket = io('http://localhost:5001');
    
    socket.on('connect', () => {
      console.log('Admin connected to socket server');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSnackbar({
        open: true,
        message: 'Failed to connect to real-time updates server',
        severity: 'error'
      });
    });
    
    // Function to refresh appropriate data based on current active tab
    const refreshData = () => {
      fetchOrders();
      if (activeTab === 1) {
        fetchSales();
      }
    };
    
    socket.on('order_created', (newOrder) => {
      console.log('New order received:', newOrder);
      refreshData();
      
      setSnackbar({
        open: true,
        message: `New order #${newOrder.id} has been created`,
        severity: 'success'
      });
    });
    
    socket.on('order_status_updated', (updatedOrder) => {
      console.log('Order status update received:', updatedOrder);
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === updatedOrder.id ? 
          { ...order, status: updatedOrder.status } : 
          order
        )
      );
      
      // If an order was marked as completed or paid, refresh all sales data
      if (updatedOrder.status === 'paid' || updatedOrder.status === 'completed') {
        console.log('Order marked as completed/paid, refreshing all sales data');
        fetchSales();
        
        // Show success notification
        setSnackbar({
          open: true,
          message: `Order #${updatedOrder.id} completed - sales data updated`,
          severity: 'success'
        });
      }
    });
    
    // Listen for specific admin sales updates
    socket.on('admin_sales_updated', (data) => {
      console.log('Admin sales update received:', data);
      
      // Refresh sales data for all time ranges to ensure consistent numbers
      fetchSales();
      
      setSnackbar({
        open: true,
        message: `Sales data updated - order #${data.order_id || 'unknown'}`,
        severity: 'info'
      });
    });
    
    socket.on('order_updated', (updatedOrder) => {
      console.log('Order updated received:', updatedOrder);
      refreshData();
      
      setSnackbar({
        open: true,
        message: `Order #${updatedOrder.id} has been updated`,
        severity: 'info'
      });
    });
    
    socket.on('order_deleted', (deletedOrder) => {
      console.log('Order deleted received:', deletedOrder);
      refreshData();
      
      setSnackbar({
        open: true,
        message: `Order #${deletedOrder.id} has been deleted`,
        severity: 'info'
      });
    });
    
    return () => {
      socket.disconnect();
    };
  }, [activeTab, token]);

  // Re-fetch sales data when waiter selection changes
  useEffect(() => {
    if (activeTab === 1) { // Only if we're on the sales tab
      fetchSales();
    }
  }, [selectedWaiter, timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWaiters = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/waiters', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWaiters(response.data);
    } catch (error) {
      console.error('Error fetching waiters:', error);
    }
  };

  const fetchOrders = async () => {
      try {
        setLoading(true);
      const response = await axios.get('http://localhost:5001/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    // Just delegate to our new function for consistency
    return fetchSalesWithWaiter(selectedWaiter);
  };
  
  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await axios.get(`http://localhost:5001/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCurrentOrder(response.data);
      setOrderItems(response.data.items || []);
      setEditedOrder({
        ...response.data,
        items: [...response.data.items || []]
      });
      
      setEditDialogOpen(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load order details',
        severity: 'error'
      });
    }
  };

  const handleEditOrder = (orderId) => {
    fetchOrderDetails(orderId);
  };
  
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:5001/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setOrders(orders.filter(order => order.id !== orderId));
      
      setSnackbar({
        open: true,
        message: 'Order deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete order',
        severity: 'error'
      });
    }
  };
  
  const handleRemoveItem = (itemId) => {
    setEditedOrder({
      ...editedOrder,
      items: editedOrder.items.filter(item => item.id !== itemId)
    });
  };
  
  const handleUpdateItem = (itemId, field, value) => {
    setEditedOrder({
      ...editedOrder,
      items: editedOrder.items.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    });
  };
  
  const handleSaveOrder = async () => {
    try {
      // Calculate new total based on current items
      const newTotal = editedOrder.items.reduce(
        (sum, item) => sum + (item.price * item.quantity), 
        0
      );
      
      // Update order with new total and items
      await axios.put(`http://localhost:5001/api/orders/${editedOrder.id}`, {
        items: editedOrder.items,
        total_amount: newTotal,
        status: editedOrder.status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Close dialog and refetch all orders
      setEditDialogOpen(false);
      fetchOrders();
      
      setSnackbar({
        open: true,
        message: 'Order updated successfully',
        severity: 'success'
      });
      } catch (error) {
      console.error('Error updating order:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update order',
        severity: 'error'
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    console.log(`Switching to tab ${newValue} from ${activeTab}`);
    setActiveTab(newValue);
    
    // If switching to sales tab, refresh sales data with current waiter filter
    if (newValue === 1) {
      console.log(`Tab changed to Sales, fetching data with current waiter: ${selectedWaiter}`);
      fetchSalesWithWaiter(selectedWaiter);
    }
  };

  const handleWaiterFilter = (event) => {
    const newWaiterId = event.target.value;
    console.log(`Setting selected waiter to: ${newWaiterId}`);
    
    // Immediately fetch with the new value instead of using state
    if (activeTab === 1) {
      fetchSalesWithWaiter(newWaiterId);
    }
    
    // Then update the state for UI and other components
    setSelectedWaiter(newWaiterId);
  };

  // New function to fetch sales with a specific waiter
  const fetchSalesWithWaiter = async (waiterId, customTimeRange = null) => {
    try {
      // Use the passed timeRange if provided, otherwise use state
      const timeRangeToUse = customTimeRange || timeRange;
      
      console.log(`Fetching sales data for time range: ${timeRangeToUse}, waiter: ${waiterId}`);
      
      // Show loading state
      setLoading(true);
      
      // Use different endpoints for daily vs other time ranges
      const endpoint = timeRangeToUse === 'daily' 
        ? 'http://localhost:5001/api/sales/daily'
        : `http://localhost:5001/api/sales/${timeRangeToUse}`;
      
      const params = { 
        waiter_id: waiterId,
        _t: new Date().getTime()  // Cache buster
      };
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      console.log(`Received response for waiter ${waiterId}:`, response.data);
      
      // Handle the response based on the time range
      if (timeRangeToUse === 'daily') {
        // Process daily sales data
        const salesData = {
          totalSales: response.data.totalSales || 0,
          completedOrders: response.data.completedOrders || 0,
          waiterStats: response.data.waiterStats || []
        };
        
        // Map the data to match the expected format
        const processedData = [{
          date: new Date().toISOString().split('T')[0],
          totalSales: salesData.totalSales,
          completedOrders: salesData.completedOrders,
          waiters: salesData.waiterStats.map(stat => ({
            waiter_id: stat.waiter_id,
            waiter_name: stat.waiter_name,
            order_count: parseInt(stat.order_count || 0),
            total_sales: parseFloat(stat.total_sales || 0)
          }))
        }];
        
        setSales(prevSales => ({ ...prevSales, [timeRangeToUse]: processedData }));
      } else {
        // For weekly, monthly, and yearly views
        const timeRangeData = response.data[timeRangeToUse] || [];
        
        if (timeRangeData.length === 0) {
          console.log(`No sales data returned for ${timeRangeToUse} with waiter: ${waiterId}`);
          
          // Create default entries with zero values
          if (waiterId === 'all') {
            if (waiters.length > 0) {
              const defaultEntry = {
                date: new Date().toISOString().split('T')[0],
                totalSales: 0,
                completedOrders: 0,
                waiters: waiters.map(waiter => ({
                  waiter_id: waiter.id,
                  waiter_name: waiter.username,
                  order_count: 0,
                  total_sales: 0
                }))
              };
              
              setSales(prevSales => ({ ...prevSales, [timeRangeToUse]: [defaultEntry] }));
            }
          } else {
            const selectedWaiter = waiters.find(w => w.id === parseInt(waiterId));
            if (selectedWaiter) {
              const defaultEntry = {
                date: new Date().toISOString().split('T')[0],
                totalSales: 0,
                completedOrders: 0,
                waiters: [{
                  waiter_id: selectedWaiter.id,
                  waiter_name: selectedWaiter.username,
                  order_count: 0,
                  total_sales: 0
                }]
              };
              
              setSales(prevSales => ({ ...prevSales, [timeRangeToUse]: [defaultEntry] }));
            }
          }
        } else {
          // Process and store the data
          setSales(prevSales => ({ ...prevSales, [timeRangeToUse]: timeRangeData }));
        }
      }
    } catch (error) {
      console.error(`Error fetching sales for waiter ${waiterId}:`, error);
      
      const timeRangeToUse = customTimeRange || timeRange;
      
      // Set error state with appropriate format
      setSales(prevSales => ({ 
        ...prevSales, 
        [timeRangeToUse]: [{
          date: new Date().toISOString().split('T')[0],
          totalSales: 0,
          completedOrders: 0,
          waiters: [{
            waiter_id: 0,
            waiter_name: "Error Loading Data",
            order_count: 0,
            total_sales: 0
          }]
        }]
      }));
      
      setSnackbar({
        open: true,
        message: 'Failed to load sales data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (event) => {
    const newTimeRange = event.target.value;
    setTimeRange(newTimeRange);
    
    // Immediately fetch data with the new time range
    if (activeTab === 1) {
      fetchSalesWithWaiter(selectedWaiter, newTimeRange);
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
    console.log(`Manually refreshing sales data with waiter: ${selectedWaiter}`);
    fetchSalesWithWaiter(selectedWaiter)
      .then(() => {
        setSnackbar({
          open: true,
          message: 'Sales data refreshed successfully',
          severity: 'success'
        });
      })
      .catch((error) => {
        console.error('Error refreshing sales:', error);
        setSnackbar({
          open: true,
          message: 'Failed to refresh sales data',
          severity: 'error'
        });
      });
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
    // Get the current sales data
    const currentSales = sales[timeRange] || [];
    
    // Process the sales data based on time range
    let processedSales = [];
    let totalSales = 0;
    let totalOrders = 0;
    
    if (timeRange === 'daily' && currentSales.length > 0) {
      // For daily view, process waiters array
      processedSales = currentSales[0].waiters.map(waiter => ({
        waiter_id: waiter.waiter_id,
        waiter_name: waiter.waiter_name,
        order_count: waiter.order_count,
        total_sales: waiter.total_sales,
        avgOrder: waiter.order_count > 0 ? waiter.total_sales / waiter.order_count : 0
      }));
      totalSales = currentSales[0].totalSales;
      totalOrders = currentSales[0].completedOrders;
    } else {
      // For weekly, monthly, and yearly views
      // Aggregate data for each waiter across all dates
      const waiterTotals = {};
      
      currentSales.forEach(dateData => {
        // Add to total sales and orders
        totalSales += parseFloat(dateData.totalSales || 0);
        totalOrders += parseInt(dateData.completedOrders || 0);
        
        // Process each waiter's data
        dateData.waiters.forEach(waiter => {
          if (!waiterTotals[waiter.waiter_id]) {
            waiterTotals[waiter.waiter_id] = {
              waiter_id: waiter.waiter_id,
              waiter_name: waiter.waiter_name,
              order_count: 0,
              total_sales: 0
            };
          }
          
          waiterTotals[waiter.waiter_id].order_count += parseInt(waiter.order_count || 0);
          waiterTotals[waiter.waiter_id].total_sales += parseFloat(waiter.total_sales || 0);
        });
      });
      
      // Convert waiter totals to array and calculate average order values
      processedSales = Object.values(waiterTotals).map(waiter => ({
        ...waiter,
        avgOrder: waiter.order_count > 0 ? waiter.total_sales / waiter.order_count : 0
      }));
    }
    
    // Sort sales data by total_sales in descending order
    const sortedSales = processedSales.sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0));
    
    // Create a rank map for quick lookup
    const rankMap = {};
    sortedSales.forEach((sale, index) => {
      rankMap[sale.waiter_id] = index + 1;
    });
    
    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Sales Tracking</Typography>
            <IconButton
              color="primary"
              onClick={handleRefreshSales}
              title="Refresh Sales Data"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={handleTimeRangeChange}
                label="Time Range"
                disabled={loading}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
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
                  <Typography variant="body2" color="text.secondary">Total Sales</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(totalSales)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Orders Completed</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {totalOrders}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Average Order Value</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(totalOrders > 0 ? totalSales / totalOrders : 0)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">Time Period</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {timeRange === 'daily' ? 'Today' : 
                     timeRange === 'weekly' ? 'This Week' : 
                     timeRange === 'monthly' ? 'This Month' : 'This Year'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Grid container spacing={3}>
              {sortedSales.length > 0 ? (
                sortedSales.map((sale) => (
                  <Grid item xs={12} sm={6} md={4} key={sale.waiter_id || 'sale-' + Math.random()}>
                    <Paper 
                      sx={{
                        p: 3, 
                        borderTop: `4px solid ${theme.palette.primary.main}`,
                        boxShadow: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <Typography variant="h6" gutterBottom color="text.primary">
                        {sale.waiter_name || 'Unknown'}
                      </Typography>
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(sale.total_sales || 0)}
                      </Typography>
                      
                      <Box sx={{ mt: 2, mb: 1 }}>
                        <Divider />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Typography variant="body1" color="text.secondary">
                          Total Orders:
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {sale.order_count || 0}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="body1" color="text.secondary">
                          Avg. Order:
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {formatCurrency(sale.avgOrder || 0)}
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
                          label={`Rank: ${rankMap[sale.waiter_id] || 'N/A'}`}
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>
                    </Paper>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                      No sales data available for this period
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
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
                  editedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                )}
              </Typography>
            </Box>
            
            {editedOrder.items.length !== currentOrder?.items?.length && (
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