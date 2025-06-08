import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import API_ENDPOINTS from '../../config/api'; // Use imported endpoints
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
  TextField,
} from '@mui/material';
import {
  RefreshOutlined as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  DateRange as DateIcon,
  Print as PrintIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';

// Use import.meta.env for Vite environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'; // Fallback for development

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
    waiterStats: [],
  });
  const [waiters, setWaiters] = useState([]);
  const [selectedWaiter, setSelectedWaiter] = useState('all');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Socket.IO connection and event handlers
  useEffect(() => {
    if (!token || !user) return;

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      fetchSalesData();
    });

    socket.on('orderUpdated', () => {
      console.log('Order updated, refreshing data');
      fetchSalesData();
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  // Fetch initial data
  useEffect(() => {
    if (token && user && user.role === 'cashier') {
      fetchWaiters();
      fetchSalesData();
    }
  }, [token, user]);

  // Re-fetch when date or waiter changes
  useEffect(() => {
    if (token && user && user.role === 'cashier') {
      fetchSalesData();
    }
  }, [selectedDate, selectedWaiter]);

  const fetchWaiters = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.WAITERS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWaiters(response.data);
    } catch (error) {
      console.error('Error fetching waiters:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load waiters',
        severity: 'error',
      });
    }
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);

      if (!token || !user || user.role !== 'cashier') {
        throw new Error('Not authorized - Please log in as a cashier');
      }

      const params = new URLSearchParams({
        date: selectedDate,
        waiter: selectedWaiter,
        _t: new Date().getTime(),
      });

      console.log('Fetching sales data with params:', Object.fromEntries(params));

      const response = await axios.get(`${API_ENDPOINTS.SALES_DAILY}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;
      console.log('Sales data response:', data);

      setSalesData({
        totalSales: parseFloat(data.totalSales) || 0,
        completedOrders: parseInt(data.completedOrders) || 0,
        averageOrder: data.completedOrders > 0 ? data.totalSales / data.completedOrders : 0,
        waiterStats: Array.isArray(data.waiterStats)
          ? data.waiterStats.map((stat) => ({
              ...stat,
              total_sales: parseFloat(stat.total_sales) || 0,
              order_count: parseInt(stat.order_count) || 0,
              average_order: stat.order_count > 0 ? stat.total_sales / stat.order_count : 0,
            }))
          : [],
      });

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      handleError(error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleError = (error) => {
    let errorMessage = 'Failed to load sales data';
    if (error.response?.data?.error) {
      errorMessage += `: ${error.response.data.error}`;
    } else if (error.message) {
      errorMessage += `: ${error.message}`;
    }

    setSnackbar({
      open: true,
      message: errorMessage,
      severity: 'error',
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSalesData();
    setSnackbar({
      open: true,
      message: 'Sales data refreshed',
      severity: 'success',
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
    if (salesData.waiterStats.length === 0) {
      setSnackbar({
        open: true,
        message: 'No data to export',
        severity: 'warning',
      });
      return;
    }

    const headers = ['Waiter Name', 'Orders Completed', 'Total Sales', 'Average Order Value'];

    const csvContent = [
      headers.join(','),
      ...salesData.waiterStats.map((waiter) => [
        waiter.waiter_name || 'N/A',
        waiter.order_count || 0,
        waiter.total_sales || 0,
        waiter.average_order || 0,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales-report-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSnackbar({
      open: true,
      message: `Exported sales report successfully`,
      severity: 'success',
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Sales Report</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            size="small"
            sx={{ minWidth: 200 }}
          />
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Waiter</InputLabel>
            <Select value={selectedWaiter} onChange={handleWaiterChange} label="Waiter">
              <MenuItem value="all">All Waiters</MenuItem>
              {waiters.map((waiter) => (
                <MenuItem key={waiter.id} value={waiter.id}>{waiter.username}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            disabled={loading || salesData.waiterStats.length === 0}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

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

      <Paper sx={{ width: '100%', overflow: 'hidden', mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Waiter Name</TableCell>
                <TableCell align="right">Orders Completed</TableCell>
                <TableCell align="right">Total Sales</TableCell>
                <TableCell align="right">Average Order Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salesData.waiterStats.length > 0 ? (
                salesData.waiterStats.map((waiter, index) => (
                  <TableRow key={waiter.waiter_id || index} hover>
                    <TableCell sx={{ fontWeight: 'medium' }}>{waiter.waiter_name}</TableCell>
                    <TableCell align="right">{waiter.order_count}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(waiter.total_sales)}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(waiter.average_order)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        No sales data available for this date
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try selecting a different date or waiter
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {salesData.waiterStats.length > 0 && (
                <TableRow
                  sx={{
                    '& .MuiTableCell-root': {
                      fontWeight: 'bold',
                      borderTop: `2px solid ${theme.palette.divider}`,
                    },
                  }}
                >
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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}