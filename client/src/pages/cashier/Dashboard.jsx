import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
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
} from '@mui/icons-material';

// Mock data for demonstration - would be replaced with real API calls
const generateMockData = () => {
  // Mock orders
  const statusOptions = ['Completed', 'In Progress', 'Pending'];
  const tableOptions = Array.from({ length: 10 }, (_, i) => i + 1);
  
  const recentOrders = Array.from({ length: 8 }, (_, i) => ({
    id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    table: tableOptions[Math.floor(Math.random() * tableOptions.length)],
    items: Math.floor(Math.random() * 10) + 1,
    amount: Math.floor(Math.random() * 200) + 20,
    status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
    time: `${Math.floor(Math.random() * 50) + 10} min ago`,
    waiter: `Waiter ${Math.floor(Math.random() * 5) + 1}`,
  }));
  
  // Daily stats
  const salesSummary = {
    todaySales: Math.floor(Math.random() * 3000) + 500,
    todayOrders: Math.floor(Math.random() * 50) + 10,
    pendingOrders: recentOrders.filter(order => order.status === 'Pending').length,
    avgOrderValue: Math.floor(Math.random() * 50) + 30,
  };
  
  return {
    recentOrders,
    salesSummary,
  };
};

export default function CashierDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const user = useSelector((state) => state.auth.user);
  
  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await axios.get('/api/cashier/dashboard');
        // setData(response.data);
        
        // Using mock data for demonstration
        setTimeout(() => {
          setData(generateMockData());
          setLoading(false);
          setRefreshing(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
  }, [refreshing]);

  const handleRefresh = () => {
    setRefreshing(true);
    setData(generateMockData());
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleNewOrder = () => {
    navigate('/cashier/order');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'warning';
      case 'Pending':
        return 'error';
      default:
        return 'default';
    }
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
        </Typography>
        <Box>
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
                ${data.salesSummary.todaySales.toLocaleString()}
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
                {data.salesSummary.todayOrders}
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
                {data.salesSummary.pendingOrders}
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
                ${data.salesSummary.avgOrderValue}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average amount per order
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders Table */}
      <Card elevation={0} sx={{ height: '100%' }}>
        <CardHeader
          title="Recent Orders"
          subheader="Latest customer orders processed"
          action={
            <IconButton aria-label="settings">
              <MoreVertIcon />
            </IconButton>
          }
        />
        <Divider />
        <TableContainer sx={{ maxHeight: 450 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Table</TableCell>
                <TableCell>Waiter</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Time</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recentOrders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" fontWeight="medium">
                      {order.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {order.items} items
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      size="small" 
                      label={`Table ${order.table}`} 
                      color="primary" 
                      variant="outlined" 
                    />
                  </TableCell>
                  <TableCell>{order.waiter}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      ${order.amount}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={order.status}
                      color={getStatusColor(order.status)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                      <TimerIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {order.time}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/cashier/receipt/${order.id.split('-')[1]}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        <Box sx={{ p: 1.5 }} display="flex" justifyContent="center">
          <Button
            size="small"
            color="primary"
          >
            View All Orders
          </Button>
        </Box>
      </Card>
    </Box>
  );
} 