import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import API_ENDPOINTS from '../../config/api';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  useTheme,
  IconButton,
  Chip,
  TextField
} from '@mui/material';
import {
  RefreshOutlined as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  DateRange as DateIcon,
  Print as PrintIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';

export default function CashierSales() {
  const theme = useTheme();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    completedOrders: 0,
    averageOrder: 0,
    waiterStats: []
  });
  const [waiters, setWaiters] = useState([]);
  const [selectedWaiter, setSelectedWaiter] = useState('all');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch waiters on component mount
  useEffect(() => {
    if (token && user && user.role === 'cashier') {
      fetchWaiters();
      fetchSalesData();
    }
  }, [token, user]);
  
  // Re-fetch sales data when date or waiter selection changes
  useEffect(() => {
    if (token && user && user.role === 'cashier') {
      console.log('Fetching sales data with filters:', {
        date: selectedDate,
        waiter: selectedWaiter,
        currentTime: new Date().toISOString()
      });
      fetchSalesData();
    }
  }, [selectedDate, selectedWaiter]);

  // Socket.IO connection for real-time updates
  useEffect(() => {
    const socket = io('http://localhost:5001', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      auth: { token }
    });
    
    socket.on('connect', () => {
      console.log('Cashier Sales connected to socket server');
      socket.emit('authenticate', token); // Emit authenticate event
      setSnackbar({
        open: true,
        message: 'Connected to real-time updates',
        severity: 'success'
      });
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSnackbar({
        open: true,
        message: 'Failed to connect to real-time updates server. Retrying...',
        severity: 'error'
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setSnackbar({
        open: true,
        message: 'Disconnected from real-time updates. Reconnecting...',
        severity: 'warning'
      });
    });
    
    // Listen for order status updates to refresh the data
    socket.on('order_status_updated', (updatedOrder) => {
      if (updatedOrder.status === 'completed' || updatedOrder.status === 'paid') {
        console.log('Order status updated, refreshing sales data:', updatedOrder);
        fetchSalesData();
        setSnackbar({
          open: true,
          message: `Order #${updatedOrder.id} ${updatedOrder.status} - sales updated`,
          severity: 'success'
        });
      }
    });
    
    // Listen for general sales updates from admin section
    socket.on('sales_data_updated', () => {
      console.log('Sales data update received, refreshing');
      fetchSalesData();
    });
    
    return () => {
      socket.disconnect();
    };
  }, [selectedDate, selectedWaiter]);

  const fetchWaiters = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.WAITERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWaiters(response.data);
    } catch (error) {
      console.error('Error fetching waiters:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load waiters',
        severity: 'error'
      });
    }
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      
      // Ensure we have the required auth
      if (!token || !user || user.role !== 'cashier') {
        throw new Error('Not authorized - Please log in as a cashier');
      }
      
      // Format API request parameters
      const params = {
        date: selectedDate,
        _t: new Date().getTime() // Add timestamp to prevent caching
      };
      
      if (selectedWaiter !== 'all') {
        params.waiter_id = selectedWaiter;
      }
      
      console.log('Fetching sales data with params:', params);
      console.log('Auth info:', {
        hasToken: !!token,
        userRole: user?.role,
        userId: user?.id
      });
      
      const response = await axios.get(API_ENDPOINTS.SALES_DAILY, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params
      });
      
      console.log('Sales data response:', response.data);
      
      if (response.data) {
        // Process the sales data
        const salesStats = response.data;
        
        // Always use the response data, even if empty
        const waiterStats = (salesStats.waiterStats || []).map(stat => ({
          ...stat,
          average_order: stat.order_count > 0 
            ? stat.total_sales / stat.order_count 
            : 0
        }));
        
        setSalesData({
          totalSales: salesStats.totalSales || 0,
          completedOrders: salesStats.completedOrders || 0,
          averageOrder: salesStats.completedOrders > 0 
            ? salesStats.totalSales / salesStats.completedOrders 
            : 0,
          waiterStats
        });
      }
      
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        userRole: user?.role,
        date: selectedDate,
        waiter: selectedWaiter
      });
      
      // Show error message
      let errorMessage = 'Failed to load sales data';
      if (error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
      
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSalesData();
    setSnackbar({
      open: true,
      message: 'Sales data refreshed',
      severity: 'success'
    });
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const handleWaiterChange = (event) => {
    setSelectedWaiter(event.target.value);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleExportCSV = () => {
    // Only export if there is data to export
    if (salesData.waiterStats.length === 0) {
      setSnackbar({
        open: true,
        message: 'No data to export',
        severity: 'warning'
      });
      return;
    }
    
    // Convert sales data to CSV format
    const headers = ['Waiter Name', 'Orders Completed', 'Total Sales', 'Average Order Value'];
    
    const csvContent = [
      // Headers
      headers.join(','),
      // Data rows
      ...salesData.waiterStats.map(waiter => [
        waiter.waiter_name || 'N/A',
        waiter.order_count || 0,
        waiter.total_sales || 0,
        waiter.average_order || 0
      ].join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Create filename with selected date
    link.setAttribute('download', `sales-report-${selectedDate}.csv`);
    
    // Trigger download and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSnackbar({
      open: true,
      message: `Exported sales report successfully`,
      severity: 'success'
    });
  };

  if (loading && !refreshing) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
          Daily Sales
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Date</InputLabel>
          <TextField
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            label="Date"
            InputLabelProps={{ shrink: true }}
          />
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Waiter</InputLabel>
          <Select
            value={selectedWaiter}
            onChange={handleWaiterChange}
            label="Waiter"
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%', boxShadow: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <MoneyIcon sx={{ fontSize: 48, color: theme.palette.success.main, mb: 1 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {formatCurrency(salesData.totalSales)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Sales Today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%', boxShadow: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ReceiptIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 1 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {salesData.completedOrders}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Completed Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%', boxShadow: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 48, color: theme.palette.warning.main, mb: 1 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                {formatCurrency(salesData.averageOrder)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Average Order Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Waiters Sales Table */}
      <Paper sx={{ mb: 4, p: 2, boxShadow: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 1 }} />
          Waiter Performance
          <Chip 
            label={selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate} 
            size="small" 
            color="primary" 
            sx={{ ml: 2 }}
          />
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: theme.palette.primary.light, color: 'white' }}>Waiter</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: theme.palette.primary.light, color: 'white' }}>Orders Completed</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: theme.palette.primary.light, color: 'white' }}>Total Sales</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: theme.palette.primary.light, color: 'white' }}>Avg. Order Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salesData.waiterStats.length > 0 ? (
                salesData.waiterStats.map((waiter, index) => (
                  <TableRow key={waiter.waiter_id || index} hover>
                    <TableCell sx={{ fontWeight: 'medium' }}>{waiter.waiter_name}</TableCell>
                    <TableCell align="right">{waiter.order_count}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(waiter.total_sales)}</TableCell>
                    <TableCell align="right">{formatCurrency(waiter.average_order)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body1">No sales data available for this date</Typography>
                  </TableCell>
                </TableRow>
              )}
              {/* Table footer with totals */}
              {salesData.waiterStats.length > 0 && (
                <TableRow sx={{ 
                  '& .MuiTableCell-root': { 
                    fontWeight: 'bold',
                    borderTop: `2px solid ${theme.palette.divider}`
                  } 
                }}>
                  <TableCell>Total</TableCell>
                  <TableCell align="right">{salesData.completedOrders}</TableCell>
                  <TableCell align="right">{formatCurrency(salesData.totalSales)}</TableCell>
                  <TableCell align="right">{formatCurrency(salesData.averageOrder)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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