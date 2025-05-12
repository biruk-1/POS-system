import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardHeader,
  Divider,
  Chip,
  Button,
  IconButton,
  Paper,
  CircularProgress,
  Badge,
  Stack,
  useTheme,
  Container
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  LocalDining as DiningIcon,
  Timer as TimerIcon,
  Alarm as AlarmIcon,
  RestaurantMenu as MenuIcon,
  NotificationsActive as NotificationIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// Mock food images for demonstration - these would be replaced with real image paths from database
const FOOD_IMAGES = {
  "Steak with Fries": "https://source.unsplash.com/random/300x200/?steak",
  "Grilled Salmon": "https://source.unsplash.com/random/300x200/?salmon",
  "Pasta Carbonara": "https://source.unsplash.com/random/300x200/?pasta",
  "Chicken Burger": "https://source.unsplash.com/random/300x200/?burger",
  "Caesar Salad": "https://source.unsplash.com/random/300x200/?salad",
  "Margherita Pizza": "https://source.unsplash.com/random/300x200/?pizza",
  "Fish & Chips": "https://source.unsplash.com/random/300x200/?fish",
  "Mushroom Risotto": "https://source.unsplash.com/random/300x200/?risotto",
  "Beef Taco": "https://source.unsplash.com/random/300x200/?taco",
  "Vegetable Stir Fry": "https://source.unsplash.com/random/300x200/?stirfry",
  // Default fallback image
  "default": "https://source.unsplash.com/random/300x200/?food"
};

// Generate mock data for demonstration
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
      () => {
        const name = foodItems[Math.floor(Math.random() * foodItems.length)];
        return {
          name: name,
          quantity: Math.floor(Math.random() * 3) + 1,
          notes: Math.random() > 0.7 ? 'No onions' : '',
          ready: Math.random() > 0.6,
          // Add image property
          image: FOOD_IMAGES[name] || FOOD_IMAGES.default
        };
      }
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
  
  const handleTabChange = (tabValue) => {
    setActiveTab(tabValue);
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
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Status Filter Bar - Larger, more prominent buttons */}
      <Paper
        elevation={3}
        sx={{
          mb: 4,
          p: 1,
          borderRadius: 2,
          background: 'white',
        }}
      >
        <Grid container spacing={2} sx={{ px: 1 }}>
          <Grid item xs={3}>
            <Button
              fullWidth
              size="large"
              onClick={() => handleTabChange(0)}
              variant={activeTab === 0 ? "contained" : "outlined"}
              sx={{
                borderRadius: 2,
                py: 2,
                height: '100%',
                bgcolor: activeTab === 0 ? theme.palette.primary.main : 'transparent',
                borderColor: theme.palette.primary.main,
                borderWidth: 2,
                '&:hover': {
                  bgcolor: activeTab === 0 ? theme.palette.primary.dark : theme.palette.primary.light + '20',
                  borderColor: theme.palette.primary.main,
                  borderWidth: 2,
                }
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Badge
                  badgeContent={stats.total}
                  color="primary"
                  max={99}
                  sx={{ '& .MuiBadge-badge': { fontSize: 14, height: 22, minWidth: 22 } }}
                >
                  <DiningIcon sx={{ fontSize: 36, mb: 1, color: activeTab === 0 ? 'white' : theme.palette.primary.main }} />
                </Badge>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: activeTab === 0 ? 'white' : theme.palette.primary.main }}>
                  All Orders
                </Typography>
              </Box>
            </Button>
          </Grid>

          <Grid item xs={3}>
            <Button
              fullWidth
              size="large"
              onClick={() => handleTabChange(1)}
              variant={activeTab === 1 ? "contained" : "outlined"}
              sx={{
                borderRadius: 2,
                py: 2,
                height: '100%',
                bgcolor: activeTab === 1 ? theme.palette.error.main : 'transparent',
                borderColor: theme.palette.error.main,
                borderWidth: 2,
                '&:hover': {
                  bgcolor: activeTab === 1 ? theme.palette.error.dark : theme.palette.error.light + '20',
                  borderColor: theme.palette.error.main,
                  borderWidth: 2,
                }
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Badge
                  badgeContent={stats.new}
                  color="error"
                  max={99}
                  sx={{ '& .MuiBadge-badge': { fontSize: 14, height: 22, minWidth: 22 } }}
                >
                  <AlarmIcon sx={{ fontSize: 36, mb: 1, color: activeTab === 1 ? 'white' : theme.palette.error.main }} />
                </Badge>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: activeTab === 1 ? 'white' : theme.palette.error.main }}>
                  New Orders
                </Typography>
              </Box>
            </Button>
          </Grid>

          <Grid item xs={3}>
            <Button
              fullWidth
              size="large"
              onClick={() => handleTabChange(2)}
              variant={activeTab === 2 ? "contained" : "outlined"}
              sx={{
                borderRadius: 2,
                py: 2,
                height: '100%',
                bgcolor: activeTab === 2 ? theme.palette.warning.main : 'transparent',
                borderColor: theme.palette.warning.main,
                borderWidth: 2,
                '&:hover': {
                  bgcolor: activeTab === 2 ? theme.palette.warning.dark : theme.palette.warning.light + '20',
                  borderColor: theme.palette.warning.main,
                  borderWidth: 2,
                }
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Badge
                  badgeContent={stats.inProgress}
                  color="warning"
                  max={99}
                  sx={{ '& .MuiBadge-badge': { fontSize: 14, height: 22, minWidth: 22 } }}
                >
                  <TimerIcon sx={{ fontSize: 36, mb: 1, color: activeTab === 2 ? 'white' : theme.palette.warning.main }} />
                </Badge>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: activeTab === 2 ? 'white' : theme.palette.warning.main }}>
                  In Progress
                </Typography>
              </Box>
            </Button>
          </Grid>

          <Grid item xs={3}>
            <Button
              fullWidth
              size="large"
              onClick={() => handleTabChange(3)}
              variant={activeTab === 3 ? "contained" : "outlined"}
              sx={{
                borderRadius: 2,
                py: 2,
                height: '100%',
                bgcolor: activeTab === 3 ? theme.palette.success.main : 'transparent',
                borderColor: theme.palette.success.main,
                borderWidth: 2,
                '&:hover': {
                  bgcolor: activeTab === 3 ? theme.palette.success.dark : theme.palette.success.light + '20',
                  borderColor: theme.palette.success.main,
                  borderWidth: 2,
                }
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Badge
                  badgeContent={stats.ready}
                  color="success"
                  max={99}
                  sx={{ '& .MuiBadge-badge': { fontSize: 14, height: 22, minWidth: 22 } }}
                >
                  <CheckCircleIcon sx={{ fontSize: 36, mb: 1, color: activeTab === 3 ? 'white' : theme.palette.success.main }} />
                </Badge>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: activeTab === 3 ? 'white' : theme.palette.success.main }}>
                  Ready
                </Typography>
              </Box>
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Refresh Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          startIcon={<RefreshIcon />}
          variant="contained"
          color="primary"
          onClick={handleRefresh}
          disabled={refreshing}
          size="large"
          sx={{ borderRadius: 2, px: 3 }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Orders'}
        </Button>
      </Box>
      
      {/* Orders Grid */}
      {sortedOrders.length === 0 ? (
        <Card sx={{ py: 10, textAlign: 'center', borderRadius: 2 }}>
          <MenuIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
          <Typography variant="h5" color="text.secondary">
            No orders in this category
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {sortedOrders.map(order => (
            <Grid item xs={12} md={6} lg={4} key={order.id}>
              <Card 
                elevation={3}
                sx={{ 
                  borderRadius: 2,
                  border: order.priority ? `2px solid ${theme.palette.error.main}` : undefined,
                  position: 'relative',
                  overflow: 'visible',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {order.priority && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -15,
                      right: -15,
                      bgcolor: theme.palette.error.main,
                      color: theme.palette.error.contrastText,
                      borderRadius: '50%',
                      width: 30,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 'bold',
                      boxShadow: 2,
                      zIndex: 1
                    }}
                  >
                    !
                  </Box>
                )}
                
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        Order {order.id}
                      </Typography>
                      <Chip 
                        label={`Table ${order.table}`} 
                        color="primary" 
                        size="medium" 
                        sx={{ fontWeight: 'bold', fontSize: 16 }}
                      />
                    </Box>
                  }
                  subheader={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <TimerIcon fontSize="small" sx={{ mr: 0.5, color: order.timeElapsed > 20 ? 'error.main' : 'text.secondary' }} />
                      <Typography variant="body1" color={order.timeElapsed > 20 ? 'error' : 'text.secondary'}>
                        {order.timeElapsed} {order.timeElapsed === 1 ? 'minute' : 'minutes'} ago
                      </Typography>
                    </Box>
                  }
                />
                <Divider />
                <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                  <Grid container spacing={2}>
                    {order.items.map((item, idx) => (
                      <Grid item xs={12} key={idx}>
                        <Card variant="outlined" sx={{ mb: 1, borderRadius: 1 }}>
                          <Grid container>
                            {/* Item Image */}
                            <Grid item xs={4}>
                              <CardMedia
                                component="img"
                                height="120"
                                image={item.image}
                                alt={item.name}
                                sx={{ objectFit: 'cover' }}
                              />
                            </Grid>
                            {/* Item Details */}
                            <Grid item xs={8}>
                              <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                                    {item.name}
                                  </Typography>
                                  <Chip 
                                    label={`x${item.quantity}`} 
                                    color="primary"
                                    size="medium"
                                    sx={{ fontWeight: 'bold' }}
                                  />
                                </Box>
                                
                                {item.notes && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <InfoIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {item.notes}
                                    </Typography>
                                  </Box>
                                )}
                                
                                <Button
                                  variant={item.ready ? "contained" : "outlined"}
                                  color={item.ready ? "success" : "warning"}
                                  onClick={() => handleItemStatusChange(order.id, item.name)}
                                  startIcon={item.ready ? <CheckCircleIcon /> : <TimerIcon />}
                                  fullWidth
                                  sx={{ mt: 1 }}
                                >
                                  {item.ready ? 'Ready' : 'Cooking'}
                                </Button>
                              </CardContent>
                            </Grid>
                          </Grid>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
                <Divider />
                <Box sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={5}>
                      <Chip
                        label={order.status}
                        color={
                          order.status === 'New' ? 'error' :
                          order.status === 'In Progress' ? 'warning' :
                          order.status === 'Ready' ? 'success' :
                          'default'
                        }
                        size="large"
                        sx={{ fontWeight: 'bold', fontSize: 16, width: '100%', height: 40 }}
                      />
                    </Grid>
                    <Grid item xs={7}>
                      {order.status === 'New' && (
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          size="large"
                          onClick={() => handleOrderStatusChange(order.id, 'In Progress')}
                          sx={{ height: 48, fontSize: 16 }}
                        >
                          Start Cooking
                        </Button>
                      )}
                      
                      {order.status === 'In Progress' && (
                        <Button
                          variant="contained"
                          color="success"
                          fullWidth
                          size="large"
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
                          sx={{ height: 48, fontSize: 16 }}
                        >
                          All Items Ready
                        </Button>
                      )}
                      
                      {order.status === 'Ready' && (
                        <Button
                          variant="outlined"
                          color="info"
                          fullWidth
                          size="large"
                          onClick={() => handleOrderStatusChange(order.id, 'Served')}
                          sx={{ height: 48, fontSize: 16 }}
                        >
                          Mark Served
                        </Button>
                      )}
                    </Grid>
                  </Grid>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
} 