import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Box,
  Alert,
  Badge
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  LocalBar as LocalBarIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../../config/api';

export default function BartenderView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshTime, setRefreshTime] = useState(Date.now());
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTime(Date.now());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_ENDPOINTS.BARTENDER_TERMINAL, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Group orders by order_id
        const groupedOrders = {};
        response.data.forEach(item => {
          if (!groupedOrders[item.order_id]) {
            groupedOrders[item.order_id] = {
              orderId: item.order_id,
              tableNumber: item.table_number,
              orderTime: new Date(item.order_time).toLocaleTimeString(),
              items: []
            };
          }
          
          groupedOrders[item.order_id].items.push({
            id: item.item_id,
            name: item.item_name,
            quantity: item.quantity,
            status: item.item_status,
            description: item.item_description
          });
        });
        
        setOrders(Object.values(groupedOrders));
        setError('');
      } catch (err) {
        setError('Failed to load orders. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [token, refreshTime]);
  
  const handleStatusChange = async (itemId, newStatus) => {
    try {
      await axios.put(`${API_ENDPOINTS.ORDER_ITEMS}/${itemId}/status`, {
        status: newStatus
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update local state
      setOrders(orders.map(order => ({
        ...order,
        items: order.items.map(item => 
          item.id === itemId 
            ? { ...item, status: newStatus } 
            : item
        )
      })));
    } catch (err) {
      setError('Failed to update item status');
      console.error(err);
    }
  };
  
  const handleMarkReady = async (itemId) => {
    try {
      await axios.put(`${API_ENDPOINTS.ORDER_ITEMS}/${itemId}/status`, {
        status: 'ready'
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update local state
      setOrders(orders.map(order => ({
        ...order,
        items: order.items.map(item => 
          item.id === itemId 
            ? { ...item, status: 'ready' } 
            : item
        )
      })));
    } catch (err) {
      setError('Failed to update item status');
      console.error(err);
    }
  };
  
  const handleMarkAllReady = async (orderId) => {
    const orderItems = orders.find(order => order.orderId === orderId)?.items || [];
    const pendingItems = orderItems.filter(item => item.status === 'pending');
    
    try {
      // Process all items in parallel
      await Promise.all(
        pendingItems.map(item => 
          axios.put(`${API_ENDPOINTS.ORDER_ITEMS}/${item.id}/status`, {
            status: 'ready'
          }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        )
      );
      
      // Update local state
      setOrders(orders.map(order => 
        order.orderId === orderId 
          ? {
              ...order,
              items: order.items.map(item => ({
                ...item,
                status: item.status === 'pending' ? 'ready' : item.status
              }))
            }
          : order
      ));
    } catch (err) {
      setError('Failed to update items');
      console.error(err);
    }
  };
  
  // Auto-complete drinks after a delay if configured
  useEffect(() => {
    // Check for any drinks that have been in-progress for a while
    const autoMarkReady = async () => {
      try {
        const currentTime = new Date();
        orders.forEach(order => {
          order.items.forEach(item => {
            if (item.status === 'in-progress') {
              // Mark drink as ready after 5 minutes (configurable)
              // This would typically be stored in settings
              setTimeout(() => {
                handleStatusChange(item.id, 'ready');
              }, 300000); // 5 minutes in ms (300 seconds)
            }
          });
        });
      } catch (error) {
        console.error('Error in auto-complete timer:', error);
      }
    };
    
    if (orders.length > 0) {
      autoMarkReady();
    }
  }, [orders]);
  
  if (loading && orders.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">Loading drink orders...</Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  if (orders.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5">No pending drink orders!</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          New orders will appear here automatically.
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Drink Orders
      </Typography>
      
      <Grid container spacing={3}>
        {orders.map(order => {
          const pendingCount = order.items.filter(item => item.status === 'pending').length;
          return (
            <Grid item xs={12} md={6} lg={4} key={order.orderId}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  backgroundColor: '#f0f8ff' // Light blue for drink orders
                }}
              >
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h6" component="div">
                        Table {order.tableNumber || 'N/A'}
                      </Typography>
                      {pendingCount > 0 && (
                        <Badge 
                          badgeContent={pendingCount} 
                          color="primary" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  }
                  subheader={`Order #${order.orderId} - ${order.orderTime}`}
                  action={
                    pendingCount > 0 && (
                      <Button 
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => handleMarkAllReady(order.orderId)}
                        startIcon={<CheckCircleIcon />}
                        sx={{ mt: 1 }}
                      >
                        All Ready
                      </Button>
                    )
                  }
                  sx={{ 
                    backgroundColor: '#e6f3ff',
                    '& .MuiCardHeader-title': {
                      fontWeight: 'bold'
                    }
                  }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <List>
                    {order.items.map(item => (
                      <Box key={item.id}>
                        <ListItem 
                          secondaryAction={
                            item.status === 'pending' ? (
                              <Button
                                size="small"
                                color="primary"
                                onClick={() => handleMarkReady(item.id)}
                                startIcon={<LocalBarIcon />}
                              >
                                Ready
                              </Button>
                            ) : (
                              <Chip 
                                label="READY" 
                                color="success"
                                size="small"
                              />
                            )
                          }
                        >
                          <ListItemText
                            primary={`${item.quantity}x ${item.name}`}
                            secondary={item.description}
                            primaryTypographyProps={{ fontWeight: item.status === 'pending' ? 'bold' : 'normal' }}
                          />
                        </ListItem>
                        <Divider />
                      </Box>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
} 