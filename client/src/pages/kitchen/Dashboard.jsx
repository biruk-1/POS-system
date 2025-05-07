import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  Button,
  IconButton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Badge,
  Stack,
  useTheme
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  LocalDining as DiningIcon,
  Timer as TimerIcon,
  Alarm as AlarmIcon,
  RestaurantMenu as MenuIcon,
  NotificationsActive as NotificationIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

// Mock data for demonstration
const generateMockOrders = () => {
  const statuses = ['New', 'In Progress', 'Ready', 'Served'];
  const foodItems = [
    'Steak with Fries', 'Grilled Salmon', 'Pasta Carbonara', 'Chicken Burger', 
    'Caesar Salad', 'Margherita Pizza', 'Fish & Chips', 'Mushroom Risotto',
    'Beef Taco', 'Vegetable Stir Fry'
  ];
  
  return Array.from({ length: 12 }, (_, i) => ({
    id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    table: Math.floor(Math.random() * 20) + 1,
    status: statuses[Math.floor(Math.random() * (statuses.length - 1))], // Don't include 'Served' in active orders
    timeElapsed: Math.floor(Math.random() * 30) + 1,
    priority: Math.random() > 0.7,
    items: Array.from(
      { length: Math.floor(Math.random() * 4) + 1 }, 
      () => ({
        name: foodItems[Math.floor(Math.random() * foodItems.length)],
        quantity: Math.floor(Math.random() * 3) + 1,
        notes: Math.random() > 0.7 ? 'No onions' : '',
        ready: Math.random() > 0.6
      })
    )
  }));
};

export default function KitchenDashboard() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = useSelector((state) => state.auth.user);
  
  useEffect(() => {
    // Simulate API call
    const fetchOrders = async () => {
      try {
        // In a real app, this would fetch from the API
        // const response = await axios.get('/api/kitchen/orders');
        // setOrders(response.data);
        
        // Using mock data for demonstration
        setTimeout(() => {
          setOrders(generateMockOrders());
          setLoading(false);
          setRefreshing(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setLoading(false);
        setRefreshing(false);
      }
    };
    
    fetchOrders();
    
    // In a real app, we might set up a websocket connection for real-time updates
    // const socket = setupWebSocket();
    // return () => socket.disconnect();
  }, [refreshing]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    setOrders(generateMockOrders());
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleItemStatusChange = (orderId, itemName) => {
    setOrders(prevOrders => 
      prevOrders.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items.map(item => {
            if (item.name === itemName) {
              return { ...item, ready: !item.ready };
            }
            return item;
          });
          
          // Check if all items are ready
          const allReady = updatedItems.every(item => item.ready);
          
          return { 
            ...order, 
            items: updatedItems,
            status: allReady ? 'Ready' : 'In Progress'
          };
        }
        return order;
      })
    );
  };
  
  const handleOrderStatusChange = (orderId, newStatus) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };
  
  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => {
    if (activeTab === 0) return order.status !== 'Served'; // All active
    if (activeTab === 1) return order.status === 'New';
    if (activeTab === 2) return order.status === 'In Progress';
    if (activeTab === 3) return order.status === 'Ready';
    return true;
  });
  
  // Sort orders: first by priority, then by time elapsed
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return b.timeElapsed - a.timeElapsed;
  });
  
  // Calculate statistics
  const stats = {
    total: orders.filter(o => o.status !== 'Served').length,
    new: orders.filter(o => o.status === 'New').length,
    inProgress: orders.filter(o => o.status === 'In Progress').length,
    ready: orders.filter(o => o.status === 'Ready').length,
    priority: orders.filter(o => o.priority && o.status !== 'Served').length
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color={theme.palette.roles.kitchen}>
          Kitchen Dashboard
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          color="primary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Orders'}
        </Button>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2.4}>
          <Card sx={{ bgcolor: theme.palette.roles.kitchen + '10' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <DiningIcon sx={{ fontSize: 32, color: theme.palette.roles.kitchen, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Badge badgeContent={stats.new} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 12, height: 18, minWidth: 18 } }}>
                <AlarmIcon sx={{ fontSize: 32, color: theme.palette.error.main, mb: 1 }} />
              </Badge>
              <Typography variant="h4" fontWeight="bold">
                {stats.new}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <TimerIcon sx={{ fontSize: 32, color: theme.palette.warning.main, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.inProgress}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 32, color: theme.palette.success.main, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.ready}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ready to Serve
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <NotificationIcon sx={{ fontSize: 32, color: theme.palette.secondary.main, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {stats.priority}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Priority
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Order Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab 
            label="All Active" 
            icon={<Badge badgeContent={stats.total} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }} />} 
            iconPosition="end"
          />
          <Tab 
            label="New" 
            icon={<Badge badgeContent={stats.new} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }} />} 
            iconPosition="end"
          />
          <Tab 
            label="In Progress" 
            icon={<Badge badgeContent={stats.inProgress} color="warning" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }} />} 
            iconPosition="end"
          />
          <Tab 
            label="Ready" 
            icon={<Badge badgeContent={stats.ready} color="success" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }} />} 
            iconPosition="end"
          />
        </Tabs>
      </Paper>
      
      {/* Orders List */}
      {sortedOrders.length === 0 ? (
        <Card sx={{ py: 10, textAlign: 'center' }}>
          <MenuIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No orders in this category
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {sortedOrders.map(order => (
            <Grid item xs={12} md={6} lg={4} key={order.id}>
              <Card 
                sx={{ 
                  border: order.priority ? `1px solid ${theme.palette.error.main}` : undefined,
                  position: 'relative',
                  overflow: 'visible'
                }}
              >
                {order.priority && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      right: -12,
                      bgcolor: theme.palette.error.main,
                      color: theme.palette.error.contrastText,
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 'bold',
                      boxShadow: 1,
                      zIndex: 1
                    }}
                  >
                    !
                  </Box>
                )}
                
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">
                        Order {order.id}
                      </Typography>
                      <Chip 
                        label={`Table ${order.table}`} 
                        color="primary" 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  }
                  subheader={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <TimerIcon fontSize="small" sx={{ mr: 0.5, color: order.timeElapsed > 20 ? 'error.main' : 'text.secondary' }} />
                      <Typography variant="body2" color={order.timeElapsed > 20 ? 'error' : 'text.secondary'}>
                        {order.timeElapsed} {order.timeElapsed === 1 ? 'minute' : 'minutes'} ago
                      </Typography>
                    </Box>
                  }
                  action={
                    <IconButton>
                      <MoreVertIcon />
                    </IconButton>
                  }
                />
                <Divider />
                <CardContent sx={{ pt: 2 }}>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell align="center">Qty</TableCell>
                          <TableCell align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {order.items.map((item, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>
                              <Typography variant="body2">{item.name}</Typography>
                              {item.notes && (
                                <Typography variant="caption" color="text.secondary">
                                  Note: {item.notes}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">{item.quantity}</TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={item.ready ? 'Ready' : 'Cooking'}
                                color={item.ready ? 'success' : 'warning'}
                                onClick={() => handleItemStatusChange(order.id, item.name)}
                                clickable
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                    <Chip
                      label={order.status}
                      color={
                        order.status === 'New' ? 'error' :
                        order.status === 'In Progress' ? 'warning' :
                        order.status === 'Ready' ? 'success' :
                        'default'
                      }
                    />
                    
                    <Box>
                      {order.status === 'New' && (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleOrderStatusChange(order.id, 'In Progress')}
                        >
                          Start Cooking
                        </Button>
                      )}
                      
                      {order.status === 'In Progress' && (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() => {
                            // Mark all items as ready
                            const updatedOrders = orders.map(o => {
                              if (o.id === order.id) {
                                return {
                                  ...o,
                                  status: 'Ready',
                                  items: o.items.map(item => ({ ...item, ready: true }))
                                };
                              }
                              return o;
                            });
                            setOrders(updatedOrders);
                          }}
                        >
                          Mark All Ready
                        </Button>
                      )}
                      
                      {order.status === 'Ready' && (
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          onClick={() => handleOrderStatusChange(order.id, 'Served')}
                        >
                          Mark Served
                        </Button>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
} 