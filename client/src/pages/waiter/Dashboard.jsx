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
  TableBar as TableIcon,
  ShoppingCart as CartIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';

// Mock data for demonstration
const generateMockData = () => {
  // Mock tables
  const tableStatuses = ['Open', 'Occupied', 'Bill Requested', 'Reserved'];
  
  const tables = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    status: tableStatuses[Math.floor(Math.random() * tableStatuses.length)],
    occupants: Math.floor(Math.random() * 6) + 1,
    timeElapsed: Math.floor(Math.random() * 120) + 5,
    totalAmount: Math.random() > 0.3 ? (Math.floor(Math.random() * 150) + 20).toFixed(2) : '0.00',
  }));

  // Mock orders
  const statusOptions = ['New', 'In Progress', 'Ready', 'Delivered'];
  
  const activeOrders = Array.from({ length: 5 }, (_, i) => ({
    id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    table: Math.floor(Math.random() * 10) + 1,
    items: Math.floor(Math.random() * 6) + 1,
    status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
    timeElapsed: `${Math.floor(Math.random() * 30) + 5} min`,
  }));
  
  // Summary stats
  const stats = {
    openTables: tables.filter(t => t.status === 'Open').length,
    occupiedTables: tables.filter(t => t.status === 'Occupied').length,
    activeOrders: activeOrders.length,
    totalSales: tables.reduce((sum, table) => sum + parseFloat(table.totalAmount), 0).toFixed(2),
  };
  
  return {
    tables,
    activeOrders,
    stats,
  };
};

export default function WaiterDashboard() {
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
        // const response = await axios.get('/api/waiter/dashboard');
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

  const handleManageTables = () => {
    navigate('/waiter/tables');
  };

  const handleTakeOrder = (tableId) => {
    // In a real app, this would navigate to an order entry page with the table pre-selected
    navigate('/waiter/tables');
  };

  const getTableStatusColor = (status) => {
    switch (status) {
      case 'Open':
        return 'success';
      case 'Occupied':
        return 'primary';
      case 'Bill Requested':
        return 'warning';
      case 'Reserved':
        return 'info';
      default:
        return 'default';
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'New':
        return 'error';
      case 'In Progress':
        return 'warning';
      case 'Ready':
        return 'success';
      case 'Delivered':
        return 'info';
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
        <Typography variant="h4" fontWeight="bold" color={theme.palette.roles.waiter}>
          Waiter Dashboard
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
            onClick={handleManageTables}
          >
            Manage Tables
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.roles.waiter}15 0%, ${theme.palette.roles.waiter}15 100%)`,
            border: `1px solid ${theme.palette.roles.waiter}30`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: `${theme.palette.roles.waiter}20`,
                borderRadius: '50%',
                width: 100,
                height: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TableIcon sx={{ fontSize: 40, color: theme.palette.roles.waiter, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color={theme.palette.roles.waiter} variant="overline">
                Open Tables
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {data.stats.openTables} / {data.tables.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tables available for customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ 
            height: '100%',
            background: `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.primary.main}15 100%)`,
            border: `1px solid ${theme.palette.primary.light}30`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: -15,
                right: -15,
                backgroundColor: `${theme.palette.primary.main}20`,
                borderRadius: '50%',
                width: 100,
                height: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <PersonIcon sx={{ fontSize: 40, color: theme.palette.primary.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="primary.main" variant="overline">
                Occupied Tables
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {data.stats.occupiedTables}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tables with active customers
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
              <CartIcon sx={{ fontSize: 40, color: theme.palette.warning.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="warning.main" variant="overline">
                Active Orders
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {data.stats.activeOrders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Orders in progress
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
              <MoneyIcon sx={{ fontSize: 40, color: theme.palette.success.main, opacity: 0.5 }} />
            </Box>
            <CardContent>
              <Typography color="success.main" variant="overline">
                Total Sales
              </Typography>
              <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {formatCurrency(data.stats.totalSales)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Today's sales amount
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tables Grid */}
      <Typography variant="h5" fontWeight="medium" sx={{ mb: 2 }}>
        Table Status
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {data.tables.map((table) => (
          <Grid item xs={12} sm={6} md={3} key={table.id}>
            <Card 
              variant="outlined"
              sx={{ 
                borderColor: table.status === 'Open' ? theme.palette.success.main : 
                            table.status === 'Occupied' ? theme.palette.primary.main :
                            table.status === 'Bill Requested' ? theme.palette.warning.main :
                            theme.palette.info.main,
                borderWidth: '1px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transform: 'translateY(-4px)'
                } 
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" fontWeight="bold">
                    Table {table.id}
                  </Typography>
                  <Chip 
                    label={table.status} 
                    color={getTableStatusColor(table.status)} 
                    size="small"
                  />
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Occupants</Typography>
                    <Typography variant="body1">{table.status === 'Open' ? '-' : table.occupants}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Time</Typography>
                    <Typography variant="body1">{table.status === 'Open' ? '-' : `${table.timeElapsed} min`}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Amount</Typography>
                    <Typography variant="body1" fontWeight="medium">{formatCurrency(table.totalAmount)}</Typography>
                  </Grid>
                </Grid>
                <Button
                  fullWidth
                  variant="contained"
                  color={table.status === 'Open' ? 'success' : 'primary'}
                  sx={{ mt: 2 }}
                  onClick={() => handleTakeOrder(table.id)}
                >
                  {table.status === 'Open' ? 'Seat Guests' : 
                   table.status === 'Occupied' ? 'Take Order' :
                   table.status === 'Bill Requested' ? 'Process Bill' :
                   'View Details'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Active Orders */}
      <Card elevation={0} sx={{ height: '100%' }}>
        <CardHeader
          title="Active Orders"
          subheader="Orders that need attention"
          action={
            <IconButton aria-label="settings">
              <MoreVertIcon />
            </IconButton>
          }
        />
        <Divider />
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Table</TableCell>
                <TableCell>Items</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Time</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.activeOrders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" fontWeight="medium">
                      {order.id}
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
                  <TableCell>{order.items} items</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={order.status}
                      color={getOrderStatusColor(order.status)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                      <TimerIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {order.timeElapsed}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      color={order.status === 'Ready' ? 'success' : 'primary'}
                    >
                      {order.status === 'New' ? 'View Order' : 
                       order.status === 'In Progress' ? 'Check Status' :
                       order.status === 'Ready' ? 'Deliver' :
                       'Details'}
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
            onClick={handleManageTables}
          >
            View All Tables
          </Button>
        </Box>
      </Card>
    </Box>
  );
} 